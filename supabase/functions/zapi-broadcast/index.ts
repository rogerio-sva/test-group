import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

function maskUrl(url: string): string {
  return url.replace(/\/instances\/[^\/]+\/token\/[^\/]+/, "/instances/***MASKED***/token/***MASKED***");
}

const BATCH_SIZE = 50;

interface BroadcastRequest {
  messageHistoryId: string;
  delayBetween?: number;
  mentionsEveryOne?: boolean;
}

async function sendMessage(
  credentials: ZAPICredentials,
  messageType: string,
  phone: string,
  content: string,
  mediaUrl?: string,
  caption?: string,
  mentionsEveryOne?: boolean
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const ZAPI_BASE_URL = `https://api.z-api.io/instances/${credentials.instanceId}/token/${credentials.token}`;
    let endpoint = "";
    let body: Record<string, unknown> = { phone };

    switch (messageType) {
      case "text":
        endpoint = "/send-text";
        body.message = content;
        if (mentionsEveryOne) body.mentionsEveryOne = true;
        break;
      case "image":
        endpoint = "/send-image";
        body.image = mediaUrl;
        if (caption) body.caption = caption;
        if (mentionsEveryOne) body.mentionsEveryOne = true;
        break;
      case "video":
        endpoint = "/send-video";
        body.video = mediaUrl;
        if (caption) body.caption = caption;
        if (mentionsEveryOne) body.mentionsEveryOne = true;
        break;
      case "audio":
        endpoint = "/send-audio";
        body.audio = mediaUrl;
        if (mentionsEveryOne) body.mentionsEveryOne = true;
        break;
      case "document":
        endpoint = "/send-document";
        body.document = mediaUrl;
        if (mentionsEveryOne) body.mentionsEveryOne = true;
        break;
      default:
        endpoint = "/send-text";
        body.message = content;
        if (mentionsEveryOne) body.mentionsEveryOne = true;
    }

    console.log(`Sending message via Z-API: ${maskUrl(ZAPI_BASE_URL + endpoint)}`);
    const response = await fetch(`${ZAPI_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Client-Token": credentials.clientToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.zapiMessageId || data.messageId) {
      return { success: true, messageId: data.zapiMessageId || data.messageId };
    } else if (data.error) {
      return { success: false, error: data.error };
    }

    return { success: true, messageId: data.zapiMessageId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function invokeContinuation(messageHistoryId: string, delayBetween: number, mentionsEveryOne: boolean) {
  const functionUrl = `${SUPABASE_URL}/functions/v1/zapi-broadcast`;

  console.log(`Invoking continuation for ${messageHistoryId}`);

  try {
    await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messageHistoryId,
        delayBetween,
        mentionsEveryOne,
      }),
    });
  } catch (error) {
    console.error("Failed to invoke continuation:", error);
  }
}

async function processBroadcast(messageHistoryId: string, delayBetween: number, mentionsEveryOne: boolean) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log(`Processing broadcast for message: ${messageHistoryId}`);

  const credentials = await getZAPICredentials(supabase);

  const { data: messageHistory, error: historyError } = await supabase
    .from("message_history")
    .select("*")
    .eq("id", messageHistoryId)
    .single();

  if (historyError || !messageHistory) {
    console.error("Failed to fetch message history:", historyError);
    return;
  }

  if (messageHistory.status === "pending") {
    await supabase
      .from("message_history")
      .update({ status: "processing", sent_at: new Date().toISOString() })
      .eq("id", messageHistoryId);
  }

  const { data: sendDetails, error: detailsError } = await supabase
    .from("message_send_details")
    .select("*")
    .eq("message_history_id", messageHistoryId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (detailsError) {
    console.error("Failed to fetch send details:", detailsError);
    return;
  }

  if (!sendDetails || sendDetails.length === 0) {
    console.log(`No more pending messages for ${messageHistoryId}, finalizing...`);

    const { data: allDetails } = await supabase
      .from("message_send_details")
      .select("status")
      .eq("message_history_id", messageHistoryId);

    const successCount = allDetails?.filter((d) => d.status === "sent").length || 0;
    const failCount = allDetails?.filter((d) => d.status === "failed").length || 0;

    const finalStatus = failCount === allDetails?.length ? "failed" : "sent";

    await supabase
      .from("message_history")
      .update({
        status: finalStatus,
        successful_sends: successCount,
        failed_sends: failCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageHistoryId);

    console.log(`Broadcast completed: ${successCount} sent, ${failCount} failed`);
    return;
  }

  const { data: currentCounts } = await supabase
    .from("message_send_details")
    .select("status")
    .eq("message_history_id", messageHistoryId);

  let successCount = currentCounts?.filter((d) => d.status === "sent").length || 0;
  let failCount = currentCounts?.filter((d) => d.status === "failed").length || 0;
  const totalCount = currentCounts?.length || 0;

  console.log(`Processing batch of ${sendDetails.length} messages (${successCount + failCount}/${totalCount} already processed)`);

  for (let i = 0; i < sendDetails.length; i++) {
    const detail = sendDetails[i];

    console.log(`Sending to ${detail.group_phone} (${successCount + failCount + 1}/${totalCount})`);

    const result = await sendMessage(
      credentials,
      messageHistory.message_type,
      detail.group_phone,
      messageHistory.content,
      messageHistory.media_url,
      messageHistory.content,
      mentionsEveryOne
    );

    if (result.success) {
      successCount++;
      await supabase
        .from("message_send_details")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          zapi_message_id: result.messageId,
        })
        .eq("id", detail.id);
    } else {
      failCount++;
      await supabase
        .from("message_send_details")
        .update({
          status: "failed",
          error_message: result.error,
        })
        .eq("id", detail.id);
    }

    await supabase
      .from("message_history")
      .update({
        successful_sends: successCount,
        failed_sends: failCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageHistoryId);

    if (i < sendDetails.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayBetween));
    }
  }

  console.log(`Batch completed: ${successCount} sent, ${failCount} failed`);

  const { count: remainingCount } = await supabase
    .from("message_send_details")
    .select("*", { count: "exact", head: true })
    .eq("message_history_id", messageHistoryId)
    .eq("status", "pending");

  if (remainingCount && remainingCount > 0) {
    console.log(`${remainingCount} messages remaining, invoking continuation...`);
    await invokeContinuation(messageHistoryId, delayBetween, mentionsEveryOne);
  } else {
    const finalStatus = failCount === totalCount ? "failed" : "sent";
    await supabase
      .from("message_history")
      .update({
        status: finalStatus,
        successful_sends: successCount,
        failed_sends: failCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageHistoryId);

    console.log(`Broadcast fully completed: ${successCount} sent, ${failCount} failed`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { messageHistoryId, delayBetween = 5000, mentionsEveryOne = false }: BroadcastRequest = await req.json();

    if (!messageHistoryId) {
      throw new Error("messageHistoryId is required");
    }

    console.log(`Received broadcast request for: ${messageHistoryId}, mentionsEveryOne: ${mentionsEveryOne}`);

    processBroadcast(messageHistoryId, delayBetween, mentionsEveryOne).catch((err) =>
      console.error("Background task error:", err)
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: "Broadcast started in background",
        messageHistoryId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in zapi-broadcast function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});