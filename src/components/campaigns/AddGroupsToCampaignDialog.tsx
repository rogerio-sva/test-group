import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GroupSelector } from '@/components/groups/GroupSelector';
import { useZAPIGroups } from '@/hooks/use-zapi';
import { useCampaignGroups } from '@/hooks/use-campaign-groups';
import { Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AddGroupsToCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  onSuccess?: () => void;
}

export function AddGroupsToCampaignDialog({
  open,
  onOpenChange,
  campaignId,
  onSuccess,
}: AddGroupsToCampaignDialogProps) {
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  const { data: allGroups = [], isLoading: isLoadingGroups, refetch } = useZAPIGroups();
  const { data: campaignGroups = [] } = useCampaignGroups(campaignId);

  const whatsappGroups = allGroups.filter((g) => g.isGroup);

  const availableGroups = whatsappGroups.map((g) => ({
    id: g.phone,
    name: g.name || 'Grupo sem nome',
    phone: g.phone,
  }));

  const existingGroupPhones = new Set(campaignGroups.map((cg) => cg.group_phone));

  useEffect(() => {
    if (!open) {
      setSelectedGroupIds([]);
      setIsAdding(false);
    }
  }, [open]);

  const handleAddGroups = async () => {
    if (selectedGroupIds.length === 0) {
      toast.error('Selecione pelo menos um grupo');
      return;
    }

    setIsAdding(true);

    try {
      const currentMaxPriority = campaignGroups.length > 0
        ? Math.max(...campaignGroups.map(g => g.priority))
        : 0;

      const groupsToAdd = selectedGroupIds
        .filter(groupId => !existingGroupPhones.has(groupId))
        .map((groupId, index) => {
          const group = whatsappGroups.find((g) => g.phone === groupId);
          return {
            campaign_id: campaignId,
            group_phone: groupId,
            group_name: group?.name || 'Grupo sem nome',
            member_limit: 256,
            current_members: 0,
            priority: currentMaxPriority + index + 1,
            is_active: true,
            invite_link: null,
          };
        });

      if (groupsToAdd.length === 0) {
        toast.info('Todos os grupos selecionados já estão na campanha');
        onOpenChange(false);
        return;
      }

      const { data, error } = await supabase
        .from('campaign_groups')
        .insert(groupsToAdd)
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

      toast.success(`${groupsToAdd.length} grupo(s) adicionado(s) à campanha`);

      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding groups:', error);
      toast.error('Erro ao adicionar grupos à campanha');
    } finally {
      setIsAdding(false);
    }
  };

  const newGroupsCount = selectedGroupIds.filter(
    (id) => !existingGroupPhones.has(id)
  ).length;

  const alreadyInCampaignCount = selectedGroupIds.filter((id) =>
    existingGroupPhones.has(id)
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Adicionar Grupos à Campanha
          </DialogTitle>
          <DialogDescription>
            Selecione um ou mais grupos do WhatsApp para adicionar a esta campanha.
            Você pode selecionar múltiplos grupos de uma vez.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <GroupSelector
            groups={availableGroups}
            selectedGroups={selectedGroupIds}
            onSelectionChange={setSelectedGroupIds}
            isLoading={isLoadingGroups}
            onRefresh={refetch}
            maxHeight="400px"
            showPriority={true}
          />
        </div>

        {selectedGroupIds.length > 0 && (
          <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-1">
            <p className="text-sm font-medium">
              Resumo da seleção:
            </p>
            {newGroupsCount > 0 && (
              <p className="text-sm text-muted-foreground">
                ✓ {newGroupsCount} novo(s) grupo(s) será(ão) adicionado(s)
              </p>
            )}
            {alreadyInCampaignCount > 0 && (
              <p className="text-sm text-amber-600">
                ⚠ {alreadyInCampaignCount} grupo(s) já está(ão) na campanha
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isAdding}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAddGroups}
            disabled={isAdding || selectedGroupIds.length === 0 || newGroupsCount === 0}
          >
            {isAdding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adicionando...
              </>
            ) : (
              <>Adicionar {newGroupsCount > 0 ? `(${newGroupsCount})` : ''}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
