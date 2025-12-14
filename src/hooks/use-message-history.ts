import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface MessageHistory {
  id: string;
  title: string;
  content: string;
  message_type: string;
  media_url: string | null;
  status: string;
  target_groups: string[];
  successful_sends: number;
  failed_sends: number;
  error_message: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageSendDetail {
  id: string;
  message_history_id: string;
  group_phone: string;
  group_name: string | null;
  status: string;
  zapi_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

export function useMessageHistory() {
  return useQuery({
    queryKey: ['message-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_history')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as MessageHistory[];
    },
  });
}

export function useCreateMessageHistory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (message: {
      title: string;
      content: string;
      message_type?: string;
      media_url?: string;
      status?: string;
      target_groups: string[];
      scheduled_at?: string;
    }) => {
      const { data, error } = await supabase
        .from('message_history')
        .insert({
          ...message,
          target_groups: message.target_groups,
        })
        .select()
        .single();
      if (error) throw error;
      return data as MessageHistory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-history'] });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateMessageHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MessageHistory> & { id: string }) => {
      const { data, error } = await supabase
        .from('message_history')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as MessageHistory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-history'] });
    },
  });
}

export function useMessageSendDetails(messageHistoryId: string) {
  return useQuery({
    queryKey: ['message-send-details', messageHistoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_send_details')
        .select('*')
        .eq('message_history_id', messageHistoryId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as MessageSendDetail[];
    },
    enabled: !!messageHistoryId,
  });
}

export function useCreateMessageSendDetail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (detail: {
      message_history_id: string;
      group_phone: string;
      group_name?: string;
      status?: string;
      zapi_message_id?: string;
      error_message?: string;
      sent_at?: string;
    }) => {
      const { data, error } = await supabase
        .from('message_send_details')
        .insert(detail)
        .select()
        .single();
      if (error) throw error;
      return data as MessageSendDetail;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['message-send-details', data.message_history_id] });
    },
  });
}
