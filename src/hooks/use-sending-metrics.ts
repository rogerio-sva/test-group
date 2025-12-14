import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SendingMetric {
  id: string;
  timestamp: string;
  messages_sent: number;
  messages_failed: number;
  period_start: string;
  period_end: string;
  period_type: string;
}

interface SendingRateLimit {
  id: string;
  limit_type: string;
  limit_value: number;
  current_count: number;
  period_start: string;
  is_active: boolean;
}

export function useSendingMetrics(periodType: "minute" | "hour" | "day" = "hour", limit = 24) {
  return useQuery({
    queryKey: ["sending-metrics", periodType, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sending_metrics")
        .select("*")
        .eq("period_type", periodType)
        .order("period_start", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data as SendingMetric[]).reverse();
    },
    refetchInterval: periodType === "minute" ? 10000 : 60000,
  });
}

export function useSendingRateLimits() {
  return useQuery({
    queryKey: ["sending-rate-limits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sending_rate_limits")
        .select("*")
        .eq("is_active", true)
        .order("limit_type");

      if (error) throw error;
      return data as SendingRateLimit[];
    },
    refetchInterval: 5000,
  });
}

export function useCurrentSendingRate() {
  return useQuery({
    queryKey: ["current-sending-rate"],
    queryFn: async () => {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60000);
      const oneHourAgo = new Date(now.getTime() - 3600000);

      const { data: recentMetrics, error } = await supabase
        .from("sending_metrics")
        .select("*")
        .gte("timestamp", oneHourAgo.toISOString())
        .order("timestamp", { ascending: false });

      if (error) throw error;

      const metrics = recentMetrics as SendingMetric[];

      const lastMinute = metrics
        .filter((m) => new Date(m.timestamp) >= oneMinuteAgo)
        .reduce((sum, m) => sum + m.messages_sent, 0);

      const lastHour = metrics.reduce((sum, m) => sum + m.messages_sent, 0);

      return {
        perMinute: lastMinute,
        perHour: lastHour,
        timestamp: now.toISOString(),
      };
    },
    refetchInterval: 5000,
  });
}

export function useCheckRateLimitStatus() {
  const { data: limits } = useSendingRateLimits();
  const { data: currentRate } = useCurrentSendingRate();

  if (!limits || !currentRate) {
    return {
      isNearLimit: false,
      isAtLimit: false,
      percentages: {},
    };
  }

  const percentages: Record<string, number> = {};
  let isNearLimit = false;
  let isAtLimit = false;

  limits.forEach((limit) => {
    const currentCount =
      limit.limit_type === "per_minute"
        ? currentRate.perMinute
        : limit.limit_type === "per_hour"
        ? currentRate.perHour
        : limit.current_count;

    const percentage = (currentCount / limit.limit_value) * 100;
    percentages[limit.limit_type] = percentage;

    if (percentage >= 100) {
      isAtLimit = true;
    } else if (percentage >= 80) {
      isNearLimit = true;
    }
  });

  return {
    isNearLimit,
    isAtLimit,
    percentages,
    limits,
    currentRate,
  };
}
