import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ZAPICredentials {
  instanceId: string;
  token: string;
  clientToken: string;
}

async function getZAPICredentials(): Promise<ZAPICredentials> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from("api_settings")
    .select("instance_id, token, client_token")
    .eq("id", "zapi_credentials")
    .eq("is_active", true)
    .maybeSingle();

  if (data && !error && data.instance_id && data.token && data.client_token) {
    return {
      instanceId: data.instance_id,
      token: data.token,
      clientToken: data.client_token,
    };
  }

  const envInstanceId = Deno.env.get("ZAPI_INSTANCE_ID");
  const envToken = Deno.env.get("ZAPI_TOKEN");
  const envClientToken = Deno.env.get("ZAPI_CLIENT_TOKEN");

  if (envInstanceId && envToken && envClientToken) {
    return {
      instanceId: envInstanceId,
      token: envToken,
      clientToken: envClientToken,
    };
  }

  throw new Error("Z-API credentials not configured");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    console.log(`[sync-group-metadata] Starting sync for user ${user.id}`);

    await supabase
      .from("group_sync_status")
      .upsert({
        user_id: user.id,
        status: "syncing",
        groups_synced: 0,
        error_message: null,
      }, {
        onConflict: "user_id"
      });

    const credentials = await getZAPICredentials();
    const ZAPI_BASE_URL = `https://api.z-api.io/instances/${credentials.instanceId}/token/${credentials.token}`;

    let allGroups: any[] = [];
    let currentPage = 1;
    const pageSize = 100;
    let hasMore = true;

    while (hasMore) {
      const listEndpoint = `/groups?page=${currentPage}&pageSize=${pageSize}`;
      console.log(`[sync-group-metadata] Fetching page ${currentPage}`);

      const listResponse = await fetch(`${ZAPI_BASE_URL}${listEndpoint}`, {
        method: "GET",
        headers: {
          "Client-Token": credentials.clientToken,
          "Content-Type": "application/json",
        },
      });

      if (!listResponse.ok) {
        throw new Error(`Failed to fetch groups: ${listResponse.status}`);
      }

      const pageData = await listResponse.json();

      if (Array.isArray(pageData) && pageData.length > 0) {
        allGroups = [...allGroups, ...pageData];
        currentPage++;
        if (pageData.length < pageSize) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    console.log(`[sync-group-metadata] Found ${allGroups.length} groups. Fetching metadata...`);

    const groupsWithMetadata: any[] = [];

    for (const group of allGroups) {
      try {
        const metadataEndpoint = `/group-metadata/${group.id.user}`;
        const metadataResponse = await fetch(`${ZAPI_BASE_URL}${metadataEndpoint}`, {
          method: "GET",
          headers: {
            "Client-Token": credentials.clientToken,
            "Content-Type": "application/json",
          },
        });

        if (metadataResponse.ok) {
          const metadata = await metadataResponse.json();
          groupsWithMetadata.push({
            user_id: user.id,
            group_id: group.id.user,
            group_name: metadata.subject || group.name || "Unnamed Group",
            group_description: metadata.desc || null,
            participant_count: metadata.participants?.length || 0,
            is_admin: metadata.participants?.some(
              (p: any) => p.isAdmin && p.id.user === credentials.instanceId
            ) || false,
            metadata: metadata,
            last_synced_at: new Date().toISOString(),
          });
        } else {
          console.warn(`[sync-group-metadata] Failed to fetch metadata for group ${group.id.user}`);
          groupsWithMetadata.push({
            user_id: user.id,
            group_id: group.id.user,
            group_name: group.name || "Unnamed Group",
            group_description: null,
            participant_count: 0,
            is_admin: false,
            metadata: group,
            last_synced_at: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error(`[sync-group-metadata] Error processing group ${group.id?.user}:`, error);
      }
    }

    console.log(`[sync-group-metadata] Saving ${groupsWithMetadata.length} groups to cache...`);

    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    for (const groupData of groupsWithMetadata) {
      await serviceClient
        .from("group_metadata_cache")
        .upsert(groupData, {
          onConflict: "user_id,group_id",
        });
    }

    await serviceClient
      .from("group_sync_status")
      .upsert({
        user_id: user.id,
        status: "idle",
        last_sync_at: new Date().toISOString(),
        groups_synced: groupsWithMetadata.length,
        error_message: null,
      }, {
        onConflict: "user_id"
      });

    console.log(`[sync-group-metadata] Sync completed successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        groupsSynced: groupsWithMetadata.length,
        syncedAt: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("[sync-group-metadata] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
        if (user) {
          await supabase
            .from("group_sync_status")
            .upsert({
              user_id: user.id,
              status: "error",
              error_message: errorMessage,
            }, {
              onConflict: "user_id"
            });
        }
      } catch (updateError) {
        console.error("[sync-group-metadata] Failed to update error status:", updateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});