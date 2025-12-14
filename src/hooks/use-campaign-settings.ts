import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CampaignSettings {
  id: string;
  campaign_id: string;
  preferred_provider: 'zapi' | 'evolution' | null;
  send_interval_min: number;
  send_interval_max: number;
  retry_attempts: number;
  retry_delay: number;
  allowed_days: number[];
  allowed_hours_start: number;
  allowed_hours_end: number;
  timezone: string;
  auto_mention_all: boolean;
  custom_settings: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useCampaignSettings(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['campaign-settings', campaignId],
    queryFn: async () => {
      if (!campaignId) throw new Error('Campaign ID is required');

      const { data, error } = await supabase
        .from('campaign_settings')
        .select('*')
        .eq('campaign_id', campaignId)
        .maybeSingle();

      if (error) throw error;
      return data as CampaignSettings | null;
    },
    enabled: !!campaignId,
  });
}

export function useUpsertCampaignSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      settings,
    }: {
      campaignId: string;
      settings: Partial<Omit<CampaignSettings, 'id' | 'campaign_id' | 'created_at' | 'updated_at'>>;
    }) => {
      const { data, error } = await supabase
        .from('campaign_settings')
        .upsert(
          {
            campaign_id: campaignId,
            ...settings,
          },
          { onConflict: 'campaign_id' }
        )
        .select()
        .single();

      if (error) throw error;

      await supabase.from('campaign_activity_log').insert({
        campaign_id: campaignId,
        action_type: 'settings_updated',
        action_data: {
          settings,
        },
      });

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-settings', data.campaign_id] });
      queryClient.invalidateQueries({ queryKey: ['campaign-activity', data.campaign_id] });
      toast.success('Campaign settings updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update settings: ' + error.message);
    },
  });
}

export function useDeleteCampaignSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from('campaign_settings')
        .delete()
        .eq('campaign_id', campaignId);

      if (error) throw error;
    },
    onSuccess: (_, campaignId) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-settings', campaignId] });
      toast.success('Campaign settings reset to defaults');
    },
    onError: (error) => {
      toast.error('Failed to reset settings: ' + error.message);
    },
  });
}
