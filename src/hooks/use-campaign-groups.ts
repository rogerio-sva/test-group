import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CampaignGroup } from '@/core/types';

export function useCampaignGroups(campaignId: string | undefined, activeOnly: boolean = false) {
  return useQuery({
    queryKey: ['campaign-groups', campaignId, activeOnly],
    queryFn: async () => {
      if (!campaignId) throw new Error('Campaign ID is required');

      let query = supabase
        .from('campaign_groups')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('priority', { ascending: true });

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as CampaignGroup[];
    },
    enabled: !!campaignId,
  });
}

export function useAddGroupToCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      groupData,
    }: {
      campaignId: string;
      groupData: Omit<CampaignGroup, 'id' | 'campaign_id' | 'created_at' | 'updated_at'>;
    }) => {
      const { data, error } = await supabase
        .from('campaign_groups')
        .insert({
          campaign_id: campaignId,
          ...groupData,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('campaign_activity_log').insert({
        campaign_id: campaignId,
        action_type: 'group_added',
        action_data: {
          group_phone: groupData.group_phone,
          group_name: groupData.group_name,
        },
      });

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-groups', data.campaign_id] });
      queryClient.invalidateQueries({ queryKey: ['campaign-with-stats', data.campaign_id] });
      queryClient.invalidateQueries({ queryKey: ['campaign-activity', data.campaign_id] });
      toast.success('Group added to campaign');
    },
    onError: (error) => {
      toast.error('Failed to add group: ' + error.message);
    },
  });
}

export function useUpdateCampaignGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CampaignGroup> }) => {
      const { data: updated, error } = await supabase
        .from('campaign_groups')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-groups', data.campaign_id] });
      toast.success('Group updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update group: ' + error.message);
    },
  });
}

export function useAddMultipleGroupsToCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      groups,
    }: {
      campaignId: string;
      groups: Array<Omit<CampaignGroup, 'id' | 'campaign_id' | 'created_at' | 'updated_at'>>;
    }) => {
      const groupsToInsert = groups.map(group => ({
        campaign_id: campaignId,
        ...group,
      }));

      const { data, error } = await supabase
        .from('campaign_groups')
        .insert(groupsToInsert)
        .select();

      if (error) throw error;

      for (const group of data) {
        await supabase.from('campaign_activity_log').insert({
          campaign_id: campaignId,
          action_type: 'group_added',
          action_data: {
            group_phone: group.group_phone,
            group_name: group.group_name,
          },
        });
      }

      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-groups', variables.campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-with-stats', variables.campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-activity', variables.campaignId] });
      toast.success(`${data.length} group(s) added to campaign`);
    },
    onError: (error) => {
      toast.error('Failed to add groups: ' + error.message);
    },
  });
}

export function useRemoveGroupFromCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, groupId }: { campaignId: string; groupId: string }) => {
      const { error } = await supabase
        .from('campaign_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      await supabase.from('campaign_activity_log').insert({
        campaign_id: campaignId,
        action_type: 'group_removed',
        action_data: {
          group_id: groupId,
        },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-groups', variables.campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-with-stats', variables.campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-activity', variables.campaignId] });
      toast.success('Group removed from campaign');
    },
    onError: (error) => {
      toast.error('Failed to remove group: ' + error.message);
    },
  });
}
