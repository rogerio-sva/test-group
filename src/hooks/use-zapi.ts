import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { groups, messages, instance } from "@/providers";
import { useToast } from "@/hooks/use-toast";

// Hook para listar todos os grupos (busca todas as páginas automaticamente)
export function useZAPIGroups() {
  return useQuery({
    queryKey: ['zapi-groups'],
    queryFn: () => groups.list(),
  });
}

// Hook para status da instância
export function useZAPIInstanceStatus() {
  return useQuery({
    queryKey: ['zapi-instance-status'],
    queryFn: () => instance.getStatus(),
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });
}

// Hook para criar grupo
export function useCreateGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ groupName, phones }: { groupName: string; phones: string[] }) =>
      groups.create(groupName, phones),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zapi-groups'] });
      toast({
        title: "Grupo criado",
        description: "O grupo foi criado com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar grupo",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook para atualizar nome do grupo
export function useUpdateGroupName() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ groupId, groupName }: { groupId: string; groupName: string }) =>
      groups.updateName(groupId, groupName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zapi-groups'] });
      toast({
        title: "Nome atualizado",
        description: "O nome do grupo foi atualizado!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar nome",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook para atualizar foto do grupo
export function useUpdateGroupPhoto() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ groupId, groupPhoto }: { groupId: string; groupPhoto: string }) =>
      groups.updatePhoto(groupId, groupPhoto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zapi-groups'] });
      toast({
        title: "Foto atualizada",
        description: "A foto do grupo foi atualizada!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar foto",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook para atualizar descrição do grupo
export function useUpdateGroupDescription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ groupId, groupDescription }: { groupId: string; groupDescription: string }) =>
      groups.updateDescription(groupId, groupDescription),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zapi-groups'] });
      toast({
        title: "Descrição atualizada",
        description: "A descrição do grupo foi atualizada!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar descrição",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook para enviar mensagem de texto
export function useSendTextMessage() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ phone, message, delayMessage }: { phone: string; message: string; delayMessage?: number }) =>
      messages.sendText({ phone, message, delayMessage }),
    onSuccess: () => {
      toast({
        title: "Mensagem enviada",
        description: "A mensagem foi enviada com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook para enviar imagem
export function useSendImageMessage() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ phone, image, caption }: { phone: string; image: string; caption?: string }) =>
      messages.sendImage({ phone, mediaUrl: image, caption }),
    onSuccess: () => {
      toast({
        title: "Imagem enviada",
        description: "A imagem foi enviada com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar imagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook para enviar para múltiplos grupos (broadcast de texto)
export function useBroadcastMessage() {
  const { toast } = useToast();

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
        
        // Aguarda entre envios para evitar bloqueio
        if (i < phones.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayBetween));
        }
      }
      return results;
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Broadcast enviado",
        description: `Mensagem enviada para ${variables.phones.length} grupos!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no broadcast",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook para broadcast de imagem
export function useBroadcastImage() {
  const { toast } = useToast();

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
      toast({
        title: "Broadcast de imagem enviado",
        description: `Imagem enviada para ${variables.phones.length} grupos!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no broadcast",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook para broadcast de vídeo
export function useBroadcastVideo() {
  const { toast } = useToast();

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
      toast({
        title: "Broadcast de vídeo enviado",
        description: `Vídeo enviado para ${variables.phones.length} grupos!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no broadcast",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook para broadcast de áudio
export function useBroadcastAudio() {
  const { toast } = useToast();

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
      toast({
        title: "Broadcast de áudio enviado",
        description: `Áudio enviado para ${variables.phones.length} grupos!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no broadcast",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook para broadcast de documento
export function useBroadcastDocument() {
  const { toast } = useToast();

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
      toast({
        title: "Broadcast de documento enviado",
        description: `Documento enviado para ${variables.phones.length} grupos!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no broadcast",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
