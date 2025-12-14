import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CampaignContact {
  id: string;
  campaign_id: string;
  contact_id: string;
  added_at: string;
  tags: string[];
  notes: string;
  priority: number;
  status: 'active' | 'paused' | 'removed';
  created_at: string;
  updated_at: string;
  contact?: {
    id: string;
    name: string;
    phone: string;
    is_valid: boolean;
    is_business: boolean;
  };
}

export function useCampaignContacts(campaignId: string | undefined, status?: 'active' | 'paused' | 'removed') {
  return useQuery({
    queryKey: ['campaign-contacts', campaignId, status],
    queryFn: async () => {
      if (!campaignId) throw new Error('Campaign ID is required');

      let query = supabase
        .from('campaign_contacts')
        .select(`
          *,
          contact:contacts(id, name, phone, is_valid, is_business)
        `)
        .eq('campaign_id', campaignId)
        .order('added_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as CampaignContact[];
    },
    enabled: !!campaignId,
  });
}

export function useAddContactsToCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      contactIds,
      tags = [],
      notes = '',
      priority = 5,
    }: {
      campaignId: string;
      contactIds: string[];
      tags?: string[];
      notes?: string;
      priority?: number;
    }) => {
      const inserts = contactIds.map((contactId) => ({
        campaign_id: campaignId,
        contact_id: contactId,
        tags,
        notes,
        priority,
        status: 'active' as const,
      }));

      const { data, error } = await supabase
        .from('campaign_contacts')
        .upsert(inserts, { onConflict: 'campaign_id,contact_id' })
        .select();

      if (error) throw error;

      await supabase.from('campaign_activity_log').insert({
        campaign_id: campaignId,
        action_type: 'contacts_added',
        action_data: {
          contact_ids: contactIds,
          count: contactIds.length,
        },
      });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-contacts', variables.campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-with-stats', variables.campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-activity', variables.campaignId] });
      toast.success(`${variables.contactIds.length} contact(s) added to campaign`);
    },
    onError: (error) => {
      toast.error('Failed to add contacts: ' + error.message);
    },
  });
}

export function useUpdateCampaignContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<CampaignContact, 'id' | 'campaign_id' | 'contact_id' | 'created_at' | 'updated_at'>>;
    }) => {
      const { data: updated, error } = await supabase
        .from('campaign_contacts')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-contacts', data.campaign_id] });
      toast.success('Contact updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update contact: ' + error.message);
    },
  });
}

export function useRemoveContactFromCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, contactId }: { campaignId: string; contactId: string }) => {
      const { error } = await supabase
        .from('campaign_contacts')
        .delete()
        .eq('campaign_id', campaignId)
        .eq('contact_id', contactId);

      if (error) throw error;

      await supabase.from('campaign_activity_log').insert({
        campaign_id: campaignId,
        action_type: 'contact_removed',
        action_data: {
          contact_id: contactId,
        },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-contacts', variables.campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-with-stats', variables.campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-activity', variables.campaignId] });
      toast.success('Contact removed from campaign');
    },
    onError: (error) => {
      toast.error('Failed to remove contact: ' + error.message);
    },
  });
}

export function useBulkUpdateCampaignContacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      contactIds,
      data,
    }: {
      campaignId: string;
      contactIds: string[];
      data: Partial<Pick<CampaignContact, 'status' | 'tags' | 'priority'>>;
    }) => {
      const updates = contactIds.map(async (contactId) => {
        return supabase
          .from('campaign_contacts')
          .update(data)
          .eq('campaign_id', campaignId)
          .eq('contact_id', contactId);
      });

      await Promise.all(updates);

      await supabase.from('campaign_activity_log').insert({
        campaign_id: campaignId,
        action_type: 'contacts_bulk_updated',
        action_data: {
          contact_ids: contactIds,
          count: contactIds.length,
          updates: data,
        },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-contacts', variables.campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-activity', variables.campaignId] });
      toast.success(`${variables.contactIds.length} contact(s) updated`);
    },
    onError: (error) => {
      toast.error('Failed to update contacts: ' + error.message);
    },
  });
}
