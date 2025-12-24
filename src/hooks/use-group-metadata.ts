import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface GroupMetadata {
  id: string;
  user_id: string;
  group_id: string;
  group_name: string;
  group_description: string | null;
  participant_count: number;
  is_admin: boolean;
  metadata: any;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface GroupSyncStatus {
  id: string;
  user_id: string;
  status: "idle" | "syncing" | "error";
  last_sync_at: string | null;
  error_message: string | null;
  groups_synced: number;
  created_at: string;
  updated_at: string;
}

export const useGroupMetadata = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: syncStatus, isLoading: isLoadingSyncStatus } = useQuery({
    queryKey: ["group-sync-status"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_sync_status")
        .select("*")
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      return data as GroupSyncStatus | null;
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status === "syncing" ? 2000 : false;
    },
  });

  const { data: groups, isLoading: isLoadingGroups } = useQuery({
    queryKey: ["group-metadata"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_metadata_cache")
        .select("*")
        .order("group_name");

      if (error) throw error;

      return data as GroupMetadata[];
    },
    enabled: syncStatus?.status !== "syncing",
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-group-metadata`;
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to sync groups");
      }

      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["group-metadata"] });
      queryClient.invalidateQueries({ queryKey: ["group-sync-status"] });

      toast({
        title: "Groups synced successfully",
        description: `${data.groupsSynced} groups have been synchronized.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isSyncing = syncStatus?.status === "syncing" || syncMutation.isPending;
  const hasError = syncStatus?.status === "error";
  const needsSync = !syncStatus || !syncStatus.last_sync_at;

  const getGroupById = (groupId: string) => {
    return groups?.find((g) => g.group_id === groupId);
  };

  const getGroupsByIds = (groupIds: string[]) => {
    return groups?.filter((g) => groupIds.includes(g.group_id)) || [];
  };

  const searchGroups = (query: string) => {
    if (!groups) return [];
    const lowerQuery = query.toLowerCase();
    return groups.filter(
      (g) =>
        g.group_name.toLowerCase().includes(lowerQuery) ||
        g.group_description?.toLowerCase().includes(lowerQuery)
    );
  };

  return {
    groups: groups || [],
    syncStatus,
    isLoading: isLoadingGroups || isLoadingSyncStatus,
    isSyncing,
    hasError,
    needsSync,
    syncGroups: syncMutation.mutate,
    getGroupById,
    getGroupsByIds,
    searchGroups,
  };
};
