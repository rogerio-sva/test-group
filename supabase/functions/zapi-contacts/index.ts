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

async function getZAPICredentials(supabase: any): Promise<ZAPICredentials> {
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

interface RequestBody {
  action: "list" | "add" | "block" | "unblock" | "report" | "validateNumbers";
  phone?: string;
  name?: string;
  phones?: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const credentials = await getZAPICredentials(supabase);
    const ZAPI_BASE_URL = `https://api.z-api.io/instances/${credentials.instanceId}/token/${credentials.token}`;

    const { action, phone, name, phones }: RequestBody = await req.json();

    const headers = {
      "Content-Type": "application/json",
      "Client-Token": credentials.clientToken,
    };

    let result;

    switch (action) {
      case "list": {
        const response = await fetch(
          `${ZAPI_BASE_URL}/contacts?page=1&pageSize=100`,
          { headers }
        );

        if (!response.ok) {
          throw new Error(`Z-API error: ${response.statusText}`);
        }

        const data = await response.json();

        if (data && Array.isArray(data)) {
          for (const contact of data) {
            await supabase.from("contacts").upsert({
              phone: contact.phone || contact.id,
              name: contact.name || contact.pushname || "",
              profile_pic_url: contact.profilePicUrl,
              is_business: contact.isBusiness || false,
              is_group: contact.isGroup || false,
              status: contact.status,
              metadata: {
                shortName: contact.shortName,
                notify: contact.notify,
              },
            }, {
              onConflict: "phone",
            });
          }
        }

        const { data: contacts, error } = await supabase
          .from("contacts")
          .select("*")
          .order("name", { ascending: true });

        if (error) throw error;

        result = { success: true, contacts };
        break;
      }

      case "add": {
        if (!phone) {
          throw new Error("Phone number is required");
        }

        const { data: contact, error } = await supabase
          .from("contacts")
          .upsert({
            phone,
            name: name || "",
            is_blocked: false,
            is_group: false,
          }, {
            onConflict: "phone",
          })
          .select()
          .single();

        if (error) throw error;

        result = { success: true, contact };
        break;
      }

      case "block": {
        if (!phone) {
          throw new Error("Phone number is required");
        }

        const response = await fetch(
          `${ZAPI_BASE_URL}/contacts/modify-blocked`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({ phone, action: "block" }),
          }
        );

        if (!response.ok) {
          throw new Error(`Z-API error: ${response.statusText}`);
        }

        const data = await response.json();

        const { error } = await supabase
          .from("contacts")
          .update({ is_blocked: true, updated_at: new Date().toISOString() })
          .eq("phone", phone);

        if (error) throw error;

        result = { success: true, message: "Contact blocked", zapiResponse: data };
        break;
      }

      case "unblock": {
        if (!phone) {
          throw new Error("Phone number is required");
        }

        const response = await fetch(
          `${ZAPI_BASE_URL}/contacts/modify-blocked`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({ phone, action: "unblock" }),
          }
        );

        if (!response.ok) {
          throw new Error(`Z-API error: ${response.statusText}`);
        }

        const data = await response.json();

        const { error } = await supabase
          .from("contacts")
          .update({ is_blocked: false, updated_at: new Date().toISOString() })
          .eq("phone", phone);

        if (error) throw error;

        result = { success: true, message: "Contact unblocked", zapiResponse: data };
        break;
      }

      case "report": {
        if (!phone) {
          throw new Error("Phone number is required");
        }

        const response = await fetch(
          `${ZAPI_BASE_URL}/contacts/${phone}/report`,
          {
            method: "POST",
            headers,
          }
        );

        if (!response.ok) {
          throw new Error(`Z-API error: ${response.statusText}`);
        }

        const data = await response.json();

        result = { success: true, message: "Contact reported", zapiResponse: data };
        break;
      }

      case "validateNumbers": {
        if (!phones || !Array.isArray(phones) || phones.length === 0) {
          throw new Error("Phone numbers array is required");
        }

        const validationResults = [];

        for (const phoneNum of phones) {
          try {
            const response = await fetch(
              `${ZAPI_BASE_URL}/phone-exists/${phoneNum}`,
              {
                method: "GET",
                headers,
              }
            );

            if (!response.ok) {
              validationResults.push({
                phone: phoneNum,
                is_valid: false,
                is_business: false,
                error: response.statusText,
              });
              continue;
            }

            const data = await response.json();

            const validationResult = {
              phone: phoneNum,
              is_valid: data.exists || false,
              is_business: data.isBusiness || false,
              metadata: data,
            };

            validationResults.push(validationResult);

            await supabase.from("contact_validation_results").insert(validationResult);
          } catch (error: any) {
            validationResults.push({
              phone: phoneNum,
              is_valid: false,
              is_business: false,
              error: error.message,
            });
          }

          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        result = { success: true, validationResults };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    console.error("Error in zapi-contacts:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});