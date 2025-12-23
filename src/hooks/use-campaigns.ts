import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Campaign, CampaignGroup, SmartLink, SmartLinkClick } from "@/core/types";

// Campanhas
export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Campaign[];
    },
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaign: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from('campaigns')
        .insert(campaign)
        .select()
        .single();
      if (error) throw error;
      return data as Campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success("Campanha criada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar campanha: " + error.message);
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('campaigns').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success("Campanha excluída");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir campanha: " + error.message);
    },
  });
}

// Grupos da Campanha
export function useCampaignGroups(campaignId: string) {
  return useQuery({
    queryKey: ['campaign-groups', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_groups')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('priority', { ascending: true });
      if (error) throw error;
      return data as CampaignGroup[];
    },
    enabled: !!campaignId,
  });
}

// Fetch all campaign groups (for stats without violating hooks rules)
export function useAllCampaignGroups() {
  return useQuery({
    queryKey: ['all-campaign-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_groups')
        .select('*')
        .order('priority', { ascending: true });
      if (error) throw error;
      return data as CampaignGroup[];
    },
  });
}

export function useAddCampaignGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (group: Omit<CampaignGroup, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('campaign_groups')
        .insert(group)
        .select()
        .single();
      if (error) throw error;
      return data as CampaignGroup;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-groups', data.campaign_id] });
      toast.success("Grupo adicionado à campanha!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao adicionar grupo: " + error.message);
    },
  });
}

export function useUpdateCampaignGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CampaignGroup> & { id: string }) => {
      const { data, error } = await supabase
        .from('campaign_groups')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as CampaignGroup;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-groups', data.campaign_id] });
    },
  });
}

// Smart Links
export function useSmartLinks() {
  return useQuery({
    queryKey: ['smart-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('smart_links')
        .select('*, campaign:campaigns(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SmartLink[];
    },
  });
}

export function useCreateSmartLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (link: {
      campaign_id: string;
      slug: string;
      name: string;
      description?: string;
      redirect_delay?: number;
      track_clicks?: boolean;
      detect_device?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('smart_links')
        .insert(link)
        .select()
        .single();
      if (error) throw error;
      return data as SmartLink;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-links'] });
      toast.success("Smart Link criado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar Smart Link: " + error.message);
    },
  });
}

export function useUpdateSmartLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SmartLink> & { id: string }) => {
      const { data, error } = await supabase
        .from('smart_links')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as SmartLink;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-links'] });
      toast.success("Smart Link atualizado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar Smart Link: " + error.message);
    },
  });
}

export function useDeleteSmartLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('smart_links').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-links'] });
      toast.success("Smart Link excluído");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir Smart Link: " + error.message);
    },
  });
}

// Analytics de cliques
export function useSmartLinkClicks(smartLinkId: string) {
  return useQuery({
    queryKey: ['smart-link-clicks', smartLinkId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('smart_link_clicks')
        .select('*')
        .eq('smart_link_id', smartLinkId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as SmartLinkClick[];
    },
    enabled: !!smartLinkId,
  });
}

export function useRecordClick() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (click: {
      smart_link_id: string;
      redirected_to_group?: string;
      device_type?: string;
      user_agent?: string;
      referrer?: string;
    }) => {
      // Registra o clique
      const { error: clickError } = await supabase
        .from('smart_link_clicks')
        .insert(click);
      if (clickError) throw clickError;

      // Incrementa o contador diretamente
      const { data: linkData } = await supabase
        .from('smart_links')
        .select('total_clicks')
        .eq('id', click.smart_link_id)
        .single();
      
      if (linkData) {
        await supabase
          .from('smart_links')
          .update({ total_clicks: (linkData.total_clicks || 0) + 1 })
          .eq('id', click.smart_link_id);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['smart-link-clicks', variables.smart_link_id] });
      queryClient.invalidateQueries({ queryKey: ['smart-links'] });
    },
  });
}
