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

  throw new Error("Z-API credentials not configured");
}

function maskUrl(url: string): string {
  return url.replace(/\/instances\/[^\/]+\/token\/[^\/]+/, "/instances/***MASKED***/token/***MASKED***/");
}

const BATCH_SIZE = 10;
const MAX_EXECUTION_TIME = 50000;
const DEFAULT_DELAY = 5000;

interface BroadcastRequest {
  messageHistoryId?: string;
  batchId?: string;
  delayBetween?: number;
  mentionsEveryOne?: boolean;
}

async function sendMessage(
  credentials: ZAPICredentials,
  messageContent: any
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const ZAPI_BASE_URL = `https://api.z-api.io/instances/${credentials.instanceId}/token/${credentials.token}`;
    let endpoint = "";
    let body: Record<string, unknown> = { phone: messageContent.phone };

    switch (messageContent.messageType) {
      case "text":
        endpoint = "/send-text";
        body.message = messageContent.content;
        if (messageContent.mentionsEveryOne) body.mentionsEveryOne = true;
        break;
      case "image":
        endpoint = "/send-image";
        body.image = messageContent.mediaUrl;
        if (messageContent.caption) body.caption = messageContent.caption;
        if (messageContent.mentionsEveryOne) body.mentionsEveryOne = true;
        break;
      case "video":
        endpoint = "/send-video";
        body.video = messageContent.mediaUrl;
        if (messageContent.caption) body.caption = messageContent.caption;
        if (messageContent.mentionsEveryOne) body.mentionsEveryOne = true;
        break;
      case "audio":
        endpoint = "/send-audio";
        body.audio = messageContent.mediaUrl;
        if (messageContent.mentionsEveryOne) body.mentionsEveryOne = true;
        break;
      case "document":
        endpoint = "/send-document";
        body.document = messageContent.mediaUrl;
        if (messageContent.mentionsEveryOne) body.mentionsEveryOne = true;
        break;
      default:
        endpoint = "/send-text";
        body.message = messageContent.content;
        if (messageContent.mentionsEveryOne) body.mentionsEveryOne = true;
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

async function invokeContinuation(batchId: string) {
  const functionUrl = `${SUPABASE_URL}/functions/v1/zapi-broadcast`;

  console.log(`Invoking continuation for batch ${batchId}`);

  try {
    await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ batchId }),
    });
  } catch (error) {
    console.error("Failed to invoke continuation:", error);
  }
}

async function processQueue(batchId?: string, messageHistoryId?: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const startTime = Date.now();

  console.log(`Processing queue - batchId: ${batchId}, messageHistoryId: ${messageHistoryId}`);

  const credentials = await getZAPICredentials(supabase);

  if (messageHistoryId) {
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

    const { data: sendDetails } = await supabase
      .from("message_send_details")
      .select("*")
      .eq("message_history_id", messageHistoryId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (!sendDetails || sendDetails.length === 0) {
      console.log("No pending messages, finalizing...");
      
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
        })
        .eq("id", messageHistoryId);

      return;
    }

    const { data: batch } = await supabase
      .from("broadcast_batch")
      .insert({
        user_id: messageHistory.user_id,
        campaign_id: messageHistory.campaign_id,
        batch_name: `Broadcast ${messageHistoryId}`,
        total_messages: sendDetails.length,
        status: "processing",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (batch) {
      for (const detail of sendDetails) {
        await supabase.from("broadcast_queue").insert({
          user_id: messageHistory.user_id,
          campaign_id: messageHistory.campaign_id,
          group_id: detail.group_phone,
          message_content: {
            messageType: messageHistory.message_type,
            content: messageHistory.content,
            mediaUrl: messageHistory.media_url,
            phone: detail.group_phone,
            mentionsEveryOne: false,
            caption: messageHistory.content,
          },
          status: "pending",
          scheduled_at: new Date().toISOString(),
          metadata: {
            messageHistoryId,
            sendDetailId: detail.id,
            batchId: batch.id,
          },
        });
      }
      
      await invokeContinuation(batch.id);
      return;
    }
  }

  if (batchId) {
    const { data: batch } = await supabase
      .from("broadcast_batch")
      .select("*")
      .eq("id", batchId)
      .single();

    if (!batch) {
      console.error("Batch not found");
      return;
    }

    const { data: queueItems } = await supabase
      .from("broadcast_queue")
      .select("*")
      .eq("metadata->>batchId", batchId)
      .in("status", ["pending", "failed"])
      .lt("retry_count", 3)
      .order("priority", { ascending: false })
      .order("scheduled_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (!queueItems || queueItems.length === 0) {
      console.log("No more queue items, finalizing batch...");

      const { data: allItems } = await supabase
        .from("broadcast_queue")
        .select("status")
        .eq("metadata->>batchId", batchId);

      const sentCount = allItems?.filter((i) => i.status === "sent").length || 0;
      const failedCount = allItems?.filter((i) => i.status === "failed").length || 0;

      await supabase
        .from("broadcast_batch")
        .update({
          status: "completed",
          sent_count: sentCount,
          failed_count: failedCount,
          completed_at: new Date().toISOString(),
        })
        .eq("id", batchId);

      const messageHistoryId = batch.metadata?.messageHistoryId;
      if (messageHistoryId) {
        const finalStatus = failedCount === allItems?.length ? "failed" : "sent";
        await supabase
          .from("message_history")
          .update({
            status: finalStatus,
            successful_sends: sentCount,
            failed_sends: failedCount,
          })
          .eq("id", messageHistoryId);
      }

      return;
    }

    console.log(`Processing ${queueItems.length} queue items...`);

    let sentInBatch = 0;
    let failedInBatch = 0;

    for (let i = 0; i < queueItems.length; i++) {
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime > MAX_EXECUTION_TIME) {
        console.log(`Timeout approaching (${elapsedTime}ms), invoking continuation...`);
        await invokeContinuation(batchId);
        return;
      }

      const item = queueItems[i];

      await supabase
        .from("broadcast_queue")
        .update({ status: "processing" })
        .eq("id", item.id);

      const result = await sendMessage(credentials, item.message_content);

      if (result.success) {
        sentInBatch++;
        await supabase
          .from("broadcast_queue")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            metadata: { ...item.metadata, zapiMessageId: result.messageId },
          })
          .eq("id", item.id);

        const sendDetailId = item.metadata?.sendDetailId;
        if (sendDetailId) {
          await supabase
            .from("message_send_details")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              zapi_message_id: result.messageId,
            })
            .eq("id", sendDetailId);
        }
      } else {
        failedInBatch++;
        const newRetryCount = item.retry_count + 1;
        const newStatus = newRetryCount >= item.max_retries ? "failed" : "pending";

        await supabase
          .from("broadcast_queue")
          .update({
            status: newStatus,
            retry_count: newRetryCount,
            error_message: result.error,
            failed_at: newStatus === "failed" ? new Date().toISOString() : null,
          })
          .eq("id", item.id);

        const sendDetailId = item.metadata?.sendDetailId;
        if (sendDetailId && newStatus === "failed") {
          await supabase
            .from("message_send_details")
            .update({
              status: "failed",
              error_message: result.error,
            })
            .eq("id", sendDetailId);
        }
      }

      await supabase
        .from("broadcast_batch")
        .update({
          sent_count: batch.sent_count + sentInBatch,
          failed_count: batch.failed_count + failedInBatch,
        })
        .eq("id", batchId);

      if (i < queueItems.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, DEFAULT_DELAY));
      }
    }

    const { count: remainingCount } = await supabase
      .from("broadcast_queue")
      .select("*", { count: "exact", head: true })
      .eq("metadata->>batchId", batchId)
      .in("status", ["pending", "failed"])
      .lt("retry_count", 3);

    if (remainingCount && remainingCount > 0) {
      console.log(`${remainingCount} items remaining, continuing...`);
      await invokeContinuation(batchId);
    } else {
      const { data: allItems } = await supabase
        .from("broadcast_queue")
        .select("status")
        .eq("metadata->>batchId", batchId);

      const sentCount = allItems?.filter((i) => i.status === "sent").length || 0;
      const failedCount = allItems?.filter((i) => i.status === "failed").length || 0;

      await supabase
        .from("broadcast_batch")
        .update({
          status: "completed",
          sent_count: sentCount,
          failed_count: failedCount,
          completed_at: new Date().toISOString(),
        })
        .eq("id", batchId);

      console.log(`Batch completed: ${sentCount} sent, ${failedCount} failed`);
    }
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
    const { messageHistoryId, batchId, delayBetween = DEFAULT_DELAY, mentionsEveryOne = false }: BroadcastRequest = await req.json();

    if (!messageHistoryId && !batchId) {
      throw new Error("Either messageHistoryId or batchId is required");
    }

    console.log(`Received broadcast request - messageHistoryId: ${messageHistoryId}, batchId: ${batchId}`);

    processQueue(batchId, messageHistoryId).catch((err) =>
      console.error("Background task error:", err)
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: "Broadcast started in background",
        messageHistoryId,
        batchId,
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