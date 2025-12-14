import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

export function useCancelScheduledMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (messageHistoryId: string) => {
      const { data, error } = await supabase.rpc("cancel_scheduled_message", {
        p_message_history_id: messageHistoryId,
        p_cancelled_by: "user",
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-history"] });
      queryClient.invalidateQueries({ queryKey: ["active-broadcasts"] });
      toast({
        title: "Mensagem cancelada",
        description: "O agendamento foi cancelado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao cancelar mensagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteMessage() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      phone,
      messageId,
    }: {
      phone: string;
      messageId: string;
    }) => {
      const { error } = await supabase.functions.invoke("zapi-messages", {
        body: {
          action: "deleteMessage",
          phone,
          messageId,
        },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Mensagem deletada",
        description: "A mensagem foi deletada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao deletar mensagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function usePinMessage() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      groupId,
      messageId,
    }: {
      groupId: string;
      messageId: string;
    }) => {
      const { error } = await supabase.functions.invoke("zapi-groups", {
        body: {
          action: "pinMessage",
          groupId,
          messageId,
        },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Mensagem fixada",
        description: "A mensagem foi fixada no grupo.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao fixar mensagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUnpinMessage() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      groupId,
      messageId,
    }: {
      groupId: string;
      messageId: string;
    }) => {
      const { error } = await supabase.functions.invoke("zapi-groups", {
        body: {
          action: "unpinMessage",
          groupId,
          messageId,
        },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Mensagem desafixada",
        description: "A mensagem foi desafixada do grupo.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao desafixar mensagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
