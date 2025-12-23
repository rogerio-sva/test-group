import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CampaignActivity } from '@/core/types';

export function useCampaignActivity(campaignId: string | undefined, limit: number = 50) {
  return useQuery({
    queryKey: ['campaign-activity', campaignId, limit],
    queryFn: async () => {
      if (!campaignId) throw new Error('Campaign ID is required');

      const { data, error } = await supabase
        .from('campaign_activity_log')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('performed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as CampaignActivity[];
    },
    enabled: !!campaignId,
  });
}

export function useCampaignActivityByType(
  campaignId: string | undefined,
  actionType: string,
  limit: number = 20
) {
  return useQuery({
    queryKey: ['campaign-activity-by-type', campaignId, actionType, limit],
    queryFn: async () => {
      if (!campaignId) throw new Error('Campaign ID is required');

      const { data, error } = await supabase
        .from('campaign_activity_log')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('action_type', actionType)
        .order('performed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as CampaignActivity[];
    },
    enabled: !!campaignId,
  });
}

export function getActivityLabel(actionType: string): string {
  const labels: Record<string, string> = {
    contacts_added: 'Contacts Added',
    contact_removed: 'Contact Removed',
    contacts_bulk_updated: 'Contacts Updated',
    group_added: 'Group Added',
    group_removed: 'Group Removed',
    message_sent: 'Message Sent',
    message_scheduled: 'Message Scheduled',
    link_created: 'Smart Link Created',
    link_updated: 'Smart Link Updated',
    settings_updated: 'Settings Updated',
    campaign_activated: 'Campaign Activated',
    campaign_deactivated: 'Campaign Deactivated',
  };

  return labels[actionType] || actionType;
}

export function getActivityIcon(actionType: string): string {
  const icons: Record<string, string> = {
    contacts_added: 'user-plus',
    contact_removed: 'user-minus',
    contacts_bulk_updated: 'users',
    group_added: 'users',
    group_removed: 'users',
    message_sent: 'send',
    message_scheduled: 'clock',
    link_created: 'link',
    link_updated: 'link',
    settings_updated: 'settings',
    campaign_activated: 'play',
    campaign_deactivated: 'pause',
  };

  return icons[actionType] || 'activity';
}
