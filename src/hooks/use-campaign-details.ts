import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CampaignWithStats extends Campaign {
  stats?: {
    total_contacts: number;
    total_groups: number;
    total_smart_links: number;
    messages_sent_week: number;
    total_messages_sent: number;
  };
}

export function useCampaignDetails(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      if (!campaignId) throw new Error('Campaign ID is required');

      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Campaign not found');

      return data as Campaign;
    },
    enabled: !!campaignId,
  });
}

export function useCampaignWithStats(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['campaign-with-stats', campaignId],
    queryFn: async () => {
      if (!campaignId) throw new Error('Campaign ID is required');

      const { data, error } = await supabase
        .from('campaign_stats')
        .select('*')
        .eq('campaign_id', campaignId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Campaign not found');

      return {
        id: data.campaign_id,
        name: data.campaign_name,
        is_active: data.is_active,
        stats: {
          total_contacts: data.total_contacts || 0,
          total_groups: data.total_groups || 0,
          total_smart_links: data.total_smart_links || 0,
          messages_sent_week: data.messages_sent_week || 0,
          total_messages_sent: data.total_messages_sent || 0,
        },
      } as CampaignWithStats;
    },
    enabled: !!campaignId,
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Campaign> }) => {
      const { data: updated, error } = await supabase
        .from('campaigns')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign', data.id] });
      queryClient.invalidateQueries({ queryKey: ['campaign-with-stats', data.id] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update campaign: ' + error.message);
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete campaign: ' + error.message);
    },
  });
}
