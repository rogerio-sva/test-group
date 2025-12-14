import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

interface BroadcastParams {
  title: string;
  content: string;
  messageType: 'text' | 'image' | 'video' | 'audio' | 'document';
  mediaUrl?: string;
  groups: Array<{ phone: string; name: string }>;
  delayBetween?: number;
  mentionsEveryOne?: boolean;
  scheduledAt?: string; // ISO string for scheduled messages
  campaignId?: string; // Optional campaign association
}

interface MessageHistory {
  id: string;
  title: string;
  content: string;
  message_type: string;
  media_url: string | null;
  status: string;
  successful_sends: number;
  failed_sends: number;
  target_groups: unknown;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  scheduled_at: string | null;
}

export function useStartBackgroundBroadcast() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: BroadcastParams) => {
      const { title, content, messageType, mediaUrl, groups, delayBetween = 5000, mentionsEveryOne = false, scheduledAt, campaignId } = params;

      const isScheduled = !!scheduledAt;

      // 1. Create message_history record
      const { data: messageHistory, error: historyError } = await supabase
        .from('message_history')
        .insert({
          title,
          content,
          message_type: messageType,
          media_url: mediaUrl,
          status: isScheduled ? 'scheduled' : 'pending',
          scheduled_at: scheduledAt || null,
          target_groups: groups.map(g => ({ phone: g.phone, name: g.name })),
          successful_sends: 0,
          failed_sends: 0,
          campaign_id: campaignId || null
        })
        .select()
        .single();

      if (historyError) throw historyError;

      // 2. Create message_send_details for each group
      const sendDetails = groups.map(group => ({
        message_history_id: messageHistory.id,
        group_phone: group.phone,
        group_name: group.name,
        status: 'pending'
      }));

      const { error: detailsError } = await supabase
        .from('message_send_details')
        .insert(sendDetails);

      if (detailsError) throw detailsError;

      // 3. If not scheduled, call edge function to start background processing immediately
      if (!isScheduled) {
        const { data, error: fnError } = await supabase.functions.invoke('zapi-broadcast', {
          body: {
            messageHistoryId: messageHistory.id,
            delayBetween,
            mentionsEveryOne
          }
        });

        if (fnError) throw fnError;
      }

      return { ...messageHistory, isScheduled };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['message-history'] });
      if (!data.isScheduled) {
        toast({
          title: "Broadcast iniciado",
          description: `O envio está sendo processado em segundo plano.`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao iniciar broadcast",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useBroadcastProgress(messageHistoryId: string | null) {
  const [progress, setProgress] = useState<MessageHistory | null>(null);

  useEffect(() => {
    if (!messageHistoryId) return;

    // Fetch initial data
    const fetchInitial = async () => {
      const { data } = await supabase
        .from('message_history')
        .select('*')
        .eq('id', messageHistoryId)
        .single();
      
      if (data) setProgress(data as MessageHistory);
    };
    
    fetchInitial();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`broadcast-progress-${messageHistoryId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'message_history',
          filter: `id=eq.${messageHistoryId}`
        },
        (payload) => {
          setProgress(payload.new as MessageHistory);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageHistoryId]);

  return progress;
}

export function useActiveBroadcasts() {
  return useQuery({
    queryKey: ['active-broadcasts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_history')
        .select('*')
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MessageHistory[];
    },
    refetchInterval: 5000, // Refetch every 5 seconds
  });
}

export function useMessageHistoryList() {
  return useQuery({
    queryKey: ['message-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as MessageHistory[];
    },
  });
}
