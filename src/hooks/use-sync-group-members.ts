import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SyncGroupMembersParams {
  groupId: string;
  campaignId: string;
}

interface SyncResult {
  success: boolean;
  membersAdded: number;
  membersUpdated: number;
  totalProcessed: number;
  errors?: string[];
}

export function useSyncGroupMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, campaignId }: SyncGroupMembersParams): Promise<SyncResult> => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-group-members`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupId, campaignId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sync group members');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['group-members'] });
      queryClient.invalidateQueries({ queryKey: ['sync-jobs'] });

      toast.success(
        `Sincronização concluída`,
        {
          description: `${data.membersAdded} novos membros adicionados, ${data.membersUpdated} atualizados`,
        }
      );
    },
    onError: (error: Error) => {
      toast.error('Erro ao sincronizar', { description: error.message });
    },
  });
}

export function useGroupMembers(groupId?: string) {
  return useQuery({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      if (!groupId) return [];

      const { data, error } = await supabase
        .from('group_members')
        .select(`
          *,
          contact:contacts(*)
        `)
        .eq('group_id', groupId)
        .eq('is_active', true)
        .order('synced_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
  });
}

export function useSyncJobs(campaignId?: string) {
  return useQuery({
    queryKey: ['sync-jobs', campaignId],
    queryFn: async () => {
      if (!campaignId) return [];

      const { data, error } = await supabase
        .from('sync_jobs')
        .select(`
          *,
          group:campaign_groups(*)
        `)
        .eq('campaign_id', campaignId)
        .order('last_sync_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!campaignId,
  });
}

export function useUpdateSyncJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      syncJobId,
      updates
    }: {
      syncJobId: string;
      updates: {
        is_active?: boolean;
        sync_interval?: string;
        next_sync_at?: string;
      };
    }) => {
      const { data, error } = await supabase
        .from('sync_jobs')
        .update(updates)
        .eq('id', syncJobId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-jobs'] });
      toast.success('Configuração de sincronização atualizada');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar', { description: error.message });
    },
  });
}
