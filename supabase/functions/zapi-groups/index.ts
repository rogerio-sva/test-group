import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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

  throw new Error("Z-API credentials not configured. Please configure them in Settings.");
}

function maskUrl(url: string): string {
  return url.replace(/\/instances\/[^\/]+\/token\/[^\/]+/, "/instances/***MASKED***/token/***MASKED***/");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const credentials = await getZAPICredentials();
    const ZAPI_BASE_URL = `https://api.z-api.io/instances/${credentials.instanceId}/token/${credentials.token}`;

    const { action, ...params } = await req.json();
    console.log(`Z-API Groups action: ${action}`, params);

    let endpoint = "";
    let method = "GET";
    let body = null;

    switch (action) {
      case "list":
        const pageSize = params.pageSize || 100;
        let allGroups: any[] = [];
        let currentPage = 1;
        let hasMore = true;

        while (hasMore) {
          const listEndpoint = `/groups?page=${currentPage}&pageSize=${pageSize}`;
          console.log(`Fetching page ${currentPage}: ${maskUrl(ZAPI_BASE_URL + listEndpoint)}`);

          const listResponse = await fetch(`${ZAPI_BASE_URL}${listEndpoint}`, {
            method: "GET",
            headers: {
              "Client-Token": credentials.clientToken,
              "Content-Type": "application/json",
            },
          });

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

        console.log(`Total groups fetched: ${allGroups.length}`);
        return new Response(JSON.stringify(allGroups), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      case "metadata":
        if (!params.inviteUrl) {
          throw new Error("inviteUrl is required for metadata action");
        }
        endpoint = `/group-invitation-metadata?url=${encodeURIComponent(params.inviteUrl)}`;
        break;

      case "create":
        if (!params.groupName || !params.phones) {
          throw new Error("groupName and phones are required for create action");
        }
        endpoint = "/create-group";
        method = "POST";
        body = {
          groupName: params.groupName,
          phones: params.phones,
        };
        break;

      case "updateName":
        if (!params.groupId || !params.groupName) {
          throw new Error("groupId and groupName are required for updateName action");
        }
        endpoint = "/update-group-name";
        method = "POST";
        body = {
          groupId: params.groupId,
          groupName: params.groupName,
        };
        break;

      case "updatePhoto":
        if (!params.groupId || !params.groupPhoto) {
          throw new Error("groupId and groupPhoto are required for updatePhoto action");
        }
        endpoint = "/update-group-photo";
        method = "POST";
        body = {
          groupId: params.groupId,
          groupPhoto: params.groupPhoto,
        };
        break;

      case "updateDescription":
        if (!params.groupId || !params.groupDescription) {
          throw new Error("groupId and groupDescription are required for updateDescription action");
        }
        endpoint = "/update-group-description";
        method = "POST";
        body = {
          groupId: params.groupId,
          groupDescription: params.groupDescription,
        };
        break;

      case "addParticipant":
        if (!params.groupId || !params.phones) {
          throw new Error("groupId and phones are required for addParticipant action");
        }
        endpoint = "/add-participant";
        method = "POST";
        body = {
          groupId: params.groupId,
          phones: params.phones,
          autoInvite: params.autoInvite ?? true,
        };
        break;

      case "removeParticipant":
        if (!params.groupId || !params.phones) {
          throw new Error("groupId and phones are required for removeParticipant action");
        }
        endpoint = "/remove-participant";
        method = "POST";
        body = {
          groupId: params.groupId,
          phones: params.phones,
        };
        break;

      case "getInviteLink":
        if (!params.groupId) {
          console.error("[getInviteLink] groupId is required but not provided");
          throw new Error("groupId is required for getInviteLink action");
        }

        let formattedGroupId = params.groupId;
        console.log(`[getInviteLink] Original groupId: ${params.groupId}`);

        if (!formattedGroupId.endsWith("@g.us")) {
          formattedGroupId = formattedGroupId.replace(/-group$/, "") + "@g.us";
          console.log(`[getInviteLink] Formatted groupId: ${formattedGroupId}`);
        }

        endpoint = `/group-invitation-link/${formattedGroupId}`;
        method = "GET";
        console.log(`[getInviteLink] Calling Z-API endpoint: ${endpoint}`);
        break;

      case "pinMessage":
        if (!params.groupId || !params.messageId) {
          throw new Error("groupId and messageId are required for pinMessage action");
        }
        endpoint = "/pin-message";
        method = "POST";
        body = {
          groupId: params.groupId,
          messageId: params.messageId,
        };
        break;

      case "unpinMessage":
        if (!params.groupId || !params.messageId) {
          throw new Error("groupId and messageId are required for unpinMessage action");
        }
        endpoint = "/unpin-message";
        method = "POST";
        body = {
          groupId: params.groupId,
          messageId: params.messageId,
        };
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Client-Token": credentials.clientToken,
        "Content-Type": "application/json",
      },
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    console.log(`Calling Z-API: ${maskUrl(ZAPI_BASE_URL + endpoint)}`);
    const response = await fetch(`${ZAPI_BASE_URL}${endpoint}`, fetchOptions);

    if (!response.ok) {
      console.error(`Z-API returned status ${response.status}: ${response.statusText}`);
      const errorData = await response.text();
      console.error(`Z-API error response: ${errorData}`);
      return new Response(
        JSON.stringify({ error: `Z-API error: ${response.status} ${response.statusText}` }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    console.log("Z-API Response:", JSON.stringify(data, null, 2));

    if (action === "getInviteLink") {
      if (!data || typeof data !== "object") {
        console.error("[getInviteLink] Invalid response format:", data);
        return new Response(
          JSON.stringify({ error: "Invalid response format from Z-API" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (!data.invitationLink && !data.link) {
        console.error("[getInviteLink] No invitation link in response:", data);
        return new Response(
          JSON.stringify({ error: "No invitation link returned by Z-API", details: data }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log(`[getInviteLink] Successfully retrieved invite link: ${data.invitationLink || data.link}`);
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in zapi-groups function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});