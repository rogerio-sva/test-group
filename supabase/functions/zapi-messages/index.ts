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

    const { action, ...params } = await req.json();
    console.log(`Z-API Messages action: ${action}`, params);

    let endpoint = "";
    let body: Record<string, unknown> = {};

    switch (action) {
      case "sendText":
        if (!params.phone || !params.message) {
          throw new Error("phone and message are required for sendText action");
        }
        endpoint = "/send-text";
        body = {
          phone: params.phone,
          message: params.message,
        };
        if (params.delayMessage) body.delayMessage = params.delayMessage;
        if (params.mentionsEveryOne) body.mentionsEveryOne = true;
        break;

      case "sendImage":
        if (!params.phone || !params.image) {
          throw new Error("phone and image are required for sendImage action");
        }
        endpoint = "/send-image";
        body = {
          phone: params.phone,
          image: params.image,
        };
        if (params.caption) body.caption = params.caption;
        if (params.mentionsEveryOne) body.mentionsEveryOne = true;
        break;

      case "sendDocument":
        if (!params.phone || !params.document) {
          throw new Error("phone and document are required for sendDocument action");
        }
        endpoint = "/send-document";
        body = {
          phone: params.phone,
          document: params.document,
        };
        if (params.fileName) body.fileName = params.fileName;
        if (params.mentionsEveryOne) body.mentionsEveryOne = true;
        break;

      case "sendVideo":
        if (!params.phone || !params.video) {
          throw new Error("phone and video are required for sendVideo action");
        }
        endpoint = "/send-video";
        body = {
          phone: params.phone,
          video: params.video,
        };
        if (params.caption) body.caption = params.caption;
        if (params.mentionsEveryOne) body.mentionsEveryOne = true;
        break;

      case "sendAudio":
        if (!params.phone || !params.audio) {
          throw new Error("phone and audio are required for sendAudio action");
        }
        endpoint = "/send-audio";
        body = {
          phone: params.phone,
          audio: params.audio,
        };
        if (params.mentionsEveryOne) body.mentionsEveryOne = true;
        break;

      case "sendLink":
        if (!params.phone || !params.message || !params.linkUrl) {
          throw new Error("phone, message and linkUrl are required for sendLink action");
        }
        endpoint = "/send-link";
        body = {
          phone: params.phone,
          message: params.message,
          linkUrl: params.linkUrl,
        };
        if (params.title) body.title = params.title;
        if (params.linkDescription) body.linkDescription = params.linkDescription;
        if (params.image) body.image = params.image;
        break;

      case "sendPoll":
        if (!params.phone || !params.pollName || !params.pollOptions) {
          throw new Error("phone, pollName and pollOptions are required for sendPoll action");
        }
        endpoint = "/send-poll";
        body = {
          phone: params.phone,
          pollName: params.pollName,
          pollOptions: params.pollOptions,
        };
        if (params.multipleAnswers !== undefined) body.multipleAnswers = params.multipleAnswers;
        break;

      case "deleteMessage":
        if (!params.phone || !params.messageId) {
          throw new Error("phone and messageId are required for deleteMessage action");
        }
        endpoint = "/delete-message";
        body = {
          phone: params.phone,
          messageId: params.messageId,
        };
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`Calling Z-API: ${maskUrl(ZAPI_BASE_URL + endpoint)}`);
    const response = await fetch(`${ZAPI_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Client-Token": credentials.clientToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log("Z-API Response:", data);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in zapi-messages function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});