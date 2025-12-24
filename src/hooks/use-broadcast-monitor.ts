import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BroadcastBatch {
  id: string;
  user_id: string;
  campaign_id: string | null;
  batch_name: string;
  total_messages: number;
  sent_count: number;
  failed_count: number;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  started_at: string | null;
  completed_at: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface BroadcastQueueItem {
  id: string;
  user_id: string;
  campaign_id: string | null;
  group_id: string;
  message_content: any;
  status: "pending" | "processing" | "sent" | "failed" | "cancelled";
  priority: number;
  scheduled_at: string;
  sent_at: string | null;
  failed_at: string | null;
  retry_count: number;
  max_retries: number;
  error_message: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export const useBroadcastMonitor = () => {
  const { data: activeBatches, isLoading: isLoadingBatches } = useQuery({
    queryKey: ["broadcast-batches-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("broadcast_batch")
        .select("*")
        .in("status", ["pending", "processing"])
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as BroadcastBatch[];
    },
    refetchInterval: 3000,
  });

  const { data: recentBatches, isLoading: isLoadingRecent } = useQuery({
    queryKey: ["broadcast-batches-recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("broadcast_batch")
        .select("*")
        .in("status", ["completed", "failed"])
        .order("completed_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data as BroadcastBatch[];
    },
    refetchInterval: 10000,
  });

  const { data: queueStats } = useQuery({
    queryKey: ["broadcast-queue-stats"],
    queryFn: async () => {
      const [pending, processing, failed] = await Promise.all([
        supabase
          .from("broadcast_queue")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("broadcast_queue")
          .select("id", { count: "exact", head: true })
          .eq("status", "processing"),
        supabase
          .from("broadcast_queue")
          .select("id", { count: "exact", head: true })
          .eq("status", "failed")
          .lt("retry_count", 3),
      ]);

      return {
        pending: pending.count || 0,
        processing: processing.count || 0,
        retriable: failed.count || 0,
      };
    },
    refetchInterval: 5000,
  });

  const getBatchProgress = (batch: BroadcastBatch) => {
    const total = batch.total_messages;
    const completed = batch.sent_count + batch.failed_count;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  };

  const isAnyBatchActive = (activeBatches?.length || 0) > 0;

  return {
    activeBatches: activeBatches || [],
    recentBatches: recentBatches || [],
    queueStats,
    isLoading: isLoadingBatches || isLoadingRecent,
    isAnyBatchActive,
    getBatchProgress,
  };
};
