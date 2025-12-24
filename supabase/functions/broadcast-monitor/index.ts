import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const STUCK_THRESHOLD_MINUTES = 10;
const RETRY_DELAY_MINUTES = 5;

async function invokeBroadcast(batchId: string) {
  const functionUrl = `${SUPABASE_URL}/functions/v1/zapi-broadcast`;

  console.log(`Invoking broadcast for stuck batch ${batchId}`);

  try {
    await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ batchId }),
    });
    return true;
  } catch (error) {
    console.error("Failed to invoke broadcast:", error);
    return false;
  }
}

async function monitorBroadcasts() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const results = {
    stuckBatchesFixed: 0,
    retriedItems: 0,
    errors: [] as string[],
  };

  try {
    const stuckThreshold = new Date(
      Date.now() - STUCK_THRESHOLD_MINUTES * 60 * 1000
    ).toISOString();

    console.log(`Looking for batches stuck before ${stuckThreshold}`);

    const { data: stuckBatches, error: batchError } = await supabase
      .from("broadcast_batch")
      .select("*")
      .eq("status", "processing")
      .lt("updated_at", stuckThreshold);

    if (batchError) {
      console.error("Error fetching stuck batches:", batchError);
      results.errors.push(`Batch query error: ${batchError.message}`);
    } else if (stuckBatches && stuckBatches.length > 0) {
      console.log(`Found ${stuckBatches.length} stuck batches`);

      for (const batch of stuckBatches) {
        console.log(`Restarting stuck batch ${batch.id}`);
        const success = await invokeBroadcast(batch.id);
        if (success) {
          results.stuckBatchesFixed++;
        } else {
          results.errors.push(`Failed to restart batch ${batch.id}`);
        }
      }
    }

    const retryThreshold = new Date(
      Date.now() - RETRY_DELAY_MINUTES * 60 * 1000
    ).toISOString();

    console.log(`Looking for items to retry before ${retryThreshold}`);

    const { data: failedItems, error: itemError } = await supabase
      .from("broadcast_queue")
      .select("*")
      .eq("status", "failed")
      .lt("retry_count", 3)
      .lt("updated_at", retryThreshold);

    if (itemError) {
      console.error("Error fetching failed items:", itemError);
      results.errors.push(`Queue query error: ${itemError.message}`);
    } else if (failedItems && failedItems.length > 0) {
      console.log(`Found ${failedItems.length} items to retry`);

      const batchIds = new Set<string>();

      for (const item of failedItems) {
        await supabase
          .from("broadcast_queue")
          .update({
            status: "pending",
            scheduled_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        results.retriedItems++;

        if (item.metadata?.batchId) {
          batchIds.add(item.metadata.batchId);
        }
      }

      for (const batchId of batchIds) {
        console.log(`Reactivating batch ${batchId} due to retried items`);
        await invokeBroadcast(batchId);
      }
    }

    const { data: stuckQueueItems, error: stuckQueueError } = await supabase
      .from("broadcast_queue")
      .select("*")
      .eq("status", "processing")
      .lt("updated_at", stuckThreshold);

    if (stuckQueueError) {
      console.error("Error fetching stuck queue items:", stuckQueueError);
      results.errors.push(`Stuck queue query error: ${stuckQueueError.message}`);
    } else if (stuckQueueItems && stuckQueueItems.length > 0) {
      console.log(`Found ${stuckQueueItems.length} stuck queue items`);

      const batchIds = new Set<string>();

      for (const item of stuckQueueItems) {
        await supabase
          .from("broadcast_queue")
          .update({
            status: "pending",
            scheduled_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        if (item.metadata?.batchId) {
          batchIds.add(item.metadata.batchId);
        }
      }

      for (const batchId of batchIds) {
        console.log(`Reactivating batch ${batchId} due to stuck items`);
        await invokeBroadcast(batchId);
        results.stuckBatchesFixed++;
      }
    }

    const { data: orphanedItems, error: orphanError } = await supabase
      .from("broadcast_queue")
      .select("*")
      .eq("status", "pending")
      .lt("scheduled_at", stuckThreshold);

    if (orphanError) {
      console.error("Error fetching orphaned items:", orphanError);
      results.errors.push(`Orphan query error: ${orphanError.message}`);
    } else if (orphanedItems && orphanedItems.length > 0) {
      console.log(`Found ${orphanedItems.length} orphaned items`);

      const batchIds = new Set<string>();

      for (const item of orphanedItems) {
        if (item.metadata?.batchId) {
          batchIds.add(item.metadata.batchId);
        }
      }

      for (const batchId of batchIds) {
        const { data: batch } = await supabase
          .from("broadcast_batch")
          .select("status")
          .eq("id", batchId)
          .single();

        if (batch && batch.status !== "processing") {
          console.log(`Reactivating orphaned batch ${batchId}`);
          await supabase
            .from("broadcast_batch")
            .update({ status: "processing" })
            .eq("id", batchId);

          await invokeBroadcast(batchId);
          results.stuckBatchesFixed++;
        }
      }
    }

    console.log(`Monitor results:`, results);
    return results;
  } catch (error) {
    console.error("Monitor error:", error);
    results.errors.push(error instanceof Error ? error.message : "Unknown error");
    return results;
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
    console.log("Starting broadcast monitor check...");
    
    const results = await monitorBroadcasts();

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        ...results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in broadcast-monitor function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});