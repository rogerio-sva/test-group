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
  return url.replace(/\/instances\/[^\/]+\/token\/[^\/]+/, "/instances/***MASKED***/token/***MASKED***");
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

    const { action } = await req.json();
    console.log(`Z-API Instance action: ${action}`);

    let endpoint = "";

    switch (action) {
      case "status":
        endpoint = "/status";
        break;
      case "qrcode":
        endpoint = "/qr-code";
        break;
      case "disconnect":
        endpoint = "/disconnect";
        break;
      case "restart":
        endpoint = "/restart";
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`Calling Z-API: ${maskUrl(ZAPI_BASE_URL + endpoint)}`);
    const response = await fetch(`${ZAPI_BASE_URL}${endpoint}`, {
      method: "GET",
      headers: {
        "Client-Token": credentials.clientToken,
      },
    });

    const data = await response.json();
    console.log("Z-API Response:", data);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in zapi-instance function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});