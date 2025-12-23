import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { groups, messages, instance } from "@/providers";
import { toast } from "sonner";

export function useZAPIGroups() {
  return useQuery({
    queryKey: ['zapi-groups'],
    queryFn: () => groups.list(),
    staleTime: 60000,
  });
}

export function useZAPIInstanceStatus() {
  return useQuery({
    queryKey: ['zapi-instance-status'],
    queryFn: () => instance.getStatus(),
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupName, phones }: { groupName: string; phones: string[] }) =>
      groups.create(groupName, phones),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zapi-groups'] });
      toast.success("Grupo criado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar grupo: " + error.message);
    },
  });
}

export function useUpdateGroupName() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, groupName }: { groupId: string; groupName: string }) =>
      groups.updateName(groupId, groupName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zapi-groups'] });
      toast.success("Nome do grupo atualizado!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar nome: " + error.message);
    },
  });
}

export function useUpdateGroupPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, groupPhoto }: { groupId: string; groupPhoto: string }) =>
      groups.updatePhoto(groupId, groupPhoto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zapi-groups'] });
      toast.success("Foto do grupo atualizada!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar foto: " + error.message);
    },
  });
}

export function useUpdateGroupDescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, groupDescription }: { groupId: string; groupDescription: string }) =>
      groups.updateDescription(groupId, groupDescription),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zapi-groups'] });
      toast.success("Descrição do grupo atualizada!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar descrição: " + error.message);
    },
  });
}

export function useSendTextMessage() {
  return useMutation({
    mutationFn: ({ phone, message, delayMessage }: { phone: string; message: string; delayMessage?: number }) =>
      messages.sendText({ phone, message, delayMessage }),
    onSuccess: () => {
      toast.success("Mensagem enviada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao enviar mensagem: " + error.message);
    },
  });
}

export function useSendImageMessage() {
  return useMutation({
    mutationFn: ({ phone, image, caption }: { phone: string; image: string; caption?: string }) =>
      messages.sendImage({ phone, mediaUrl: image, caption }),
    onSuccess: () => {
      toast.success("Imagem enviada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao enviar imagem: " + error.message);
    },
  });
}

export function useBroadcastMessage() {
  return useMutation({
    mutationFn: async ({
      phones,
      message,
      delayBetween = 2000
    }: {
      phones: string[];
      message: string;
      delayBetween?: number;
    }) => {
      const results = [];
      for (let i = 0; i < phones.length; i++) {
        const result = await messages.sendText({ phone: phones[i], message });
        results.push(result);

        if (i < phones.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayBetween));
        }
      }
      return results;
    },
    onSuccess: (_, variables) => {
      toast.success(`Mensagem enviada para ${variables.phones.length} grupos!`);
    },
    onError: (error: Error) => {
      toast.error("Erro no broadcast: " + error.message);
    },
  });
}

export function useBroadcastImage() {
  return useMutation({
    mutationFn: async ({
      phones,
      imageUrl,
      caption,
      delayBetween = 2000
    }: {
      phones: string[];
      imageUrl: string;
      caption?: string;
      delayBetween?: number;
    }) => {
      const results = [];
      for (let i = 0; i < phones.length; i++) {
        const result = await messages.sendImage({ phone: phones[i], mediaUrl: imageUrl, caption });
        results.push(result);

        if (i < phones.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayBetween));
        }
      }
      return results;
    },
    onSuccess: (_, variables) => {
      toast.success(`Imagem enviada para ${variables.phones.length} grupos!`);
    },
    onError: (error: Error) => {
      toast.error("Erro no broadcast: " + error.message);
    },
  });
}

export function useBroadcastVideo() {
  return useMutation({
    mutationFn: async ({
      phones,
      videoUrl,
      caption,
      delayBetween = 2000
    }: {
      phones: string[];
      videoUrl: string;
      caption?: string;
      delayBetween?: number;
    }) => {
      const results = [];
      for (let i = 0; i < phones.length; i++) {
        const result = await messages.sendVideo({ phone: phones[i], mediaUrl: videoUrl, caption });
        results.push(result);

        if (i < phones.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayBetween));
        }
      }
      return results;
    },
    onSuccess: (_, variables) => {
      toast.success(`Vídeo enviado para ${variables.phones.length} grupos!`);
    },
    onError: (error: Error) => {
      toast.error("Erro no broadcast: " + error.message);
    },
  });
}

export function useBroadcastAudio() {
  return useMutation({
    mutationFn: async ({
      phones,
      audioUrl,
      delayBetween = 2000
    }: {
      phones: string[];
      audioUrl: string;
      delayBetween?: number;
    }) => {
      const results = [];
      for (let i = 0; i < phones.length; i++) {
        const result = await messages.sendAudio({ phone: phones[i], mediaUrl: audioUrl });
        results.push(result);

        if (i < phones.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayBetween));
        }
      }
      return results;
    },
    onSuccess: (_, variables) => {
      toast.success(`Áudio enviado para ${variables.phones.length} grupos!`);
    },
    onError: (error: Error) => {
      toast.error("Erro no broadcast: " + error.message);
    },
  });
}

export function useBroadcastDocument() {
  return useMutation({
    mutationFn: async ({
      phones,
      documentUrl,
      fileName,
      delayBetween = 2000
    }: {
      phones: string[];
      documentUrl: string;
      fileName?: string;
      delayBetween?: number;
    }) => {
      const results = [];
      for (let i = 0; i < phones.length; i++) {
        const result = await messages.sendDocument({ phone: phones[i], documentUrl, fileName });
        results.push(result);

        if (i < phones.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayBetween));
        }
      }
      return results;
    },
    onSuccess: (_, variables) => {
      toast.success(`Documento enviado para ${variables.phones.length} grupos!`);
    },
    onError: (error: Error) => {
      toast.error("Erro no broadcast: " + error.message);
    },
  });
}
