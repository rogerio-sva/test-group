import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { GroupCard } from '@/components/groups/GroupCard';
import { useCampaignGroups, useRemoveGroupFromCampaign, useUpdateCampaignGroup } from '@/hooks/use-campaign-groups';
import { useSyncGroupMembers } from '@/hooks/use-sync-group-members';
import { AddGroupsToCampaignDialog } from './AddGroupsToCampaignDialog';
import { CampaignClicksDashboard } from './CampaignClicksDashboard';
import { Users, Plus, Copy, Send, AlertCircle, RefreshCw, RotateCw, Power, PowerOff } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useQueryClient } from '@tanstack/react-query';

interface CampaignGroupsTabProps {
  campaignId: string;
  onSendToGroup: (groupPhone: string) => void;
}

export function CampaignGroupsTab({ campaignId, onSendToGroup }: CampaignGroupsTabProps) {
  const queryClient = useQueryClient();
  const { data: groups, isLoading } = useCampaignGroups(campaignId);
  const removeGroupMutation = useRemoveGroupFromCampaign();
  const updateGroupMutation = useUpdateCampaignGroup();
  const syncMembersMutation = useSyncGroupMembers();

  const [groupToRemove, setGroupToRemove] = useState<string | null>(null);
  const [syncingGroupId, setSyncingGroupId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  const handleGroupsAdded = () => {
    queryClient.invalidateQueries({ queryKey: ['campaign-groups', campaignId] });
    queryClient.invalidateQueries({ queryKey: ['campaign-with-stats', campaignId] });
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success('Link de convite copiado para a área de transferência');
  };

  const handleToggleActive = (groupId: string, currentStatus: boolean) => {
    updateGroupMutation.mutate({
      id: groupId,
      data: { is_active: !currentStatus },
    });
  };

  const handleToggleRotation = (groupId: string, currentStatus: boolean) => {
    updateGroupMutation.mutate({
      id: groupId,
      data: { rotation_enabled: !currentStatus },
    });
  };

  const handleBulkRotationToggle = (enable: boolean) => {
    if (!groups) return;

    const confirmMessage = enable
      ? 'Ativar rotação em todos os grupos?'
      : 'Pausar rotação em todos os grupos?';

    if (!window.confirm(confirmMessage)) return;

    groups.forEach(group => {
      updateGroupMutation.mutate({
        id: group.id,
        data: { rotation_enabled: enable },
      });
    });

    toast.success(
      enable
        ? 'Rotação ativada em todos os grupos'
        : 'Rotação pausada em todos os grupos'
    );
  };

  const handleRemoveGroup = (groupId: string) => {
    setGroupToRemove(groupId);
  };

  const confirmRemoveGroup = () => {
    if (groupToRemove) {
      removeGroupMutation.mutate({
        campaignId,
        groupId: groupToRemove,
      });
      setGroupToRemove(null);
    }
  };

  const handleSyncMembers = async (groupId: string) => {
    setSyncingGroupId(groupId);
    try {
      await syncMembersMutation.mutateAsync({
        groupId,
        campaignId,
      });
    } finally {
      setSyncingGroupId(null);
    }
  };

  const handleSyncAllGroups = async () => {
    if (!groups || groups.length === 0) return;

    setIsSyncingAll(true);
    let successCount = 0;
    let errorCount = 0;

    toast.info(`Sincronizando ${groups.length} grupo(s)...`);

    for (const group of groups) {
      try {
        await syncMembersMutation.mutateAsync({
          groupId: group.id,
          campaignId,
        });
        successCount++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to sync group ${group.id}:`, error);
        errorCount++;
      }
    }

    setIsSyncingAll(false);

    toast.success(
      `Sincronização concluída: ${successCount} grupo(s) sincronizado(s)${
        errorCount > 0 ? `, ${errorCount} erro(s)` : ''
      }`
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <CampaignClicksDashboard campaignId={campaignId} />

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-foreground">Grupos da Campanha</h3>
            <p className="text-sm text-muted-foreground">
              Gerencie os grupos do WhatsApp vinculados a esta campanha
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {groups && groups.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncAllGroups}
                  disabled={isSyncingAll}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isSyncingAll ? 'animate-spin' : ''}`} />
                  {isSyncingAll ? 'Sincronizando...' : 'Sincronizar Todos'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleBulkRotationToggle(true)}>
                  <Power className="mr-2 h-4 w-4" />
                  Ativar Rotação em Todos
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleBulkRotationToggle(false)}>
                  <PowerOff className="mr-2 h-4 w-4" />
                  Pausar Rotação em Todos
                </Button>
              </>
            )}
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Grupos
            </Button>
          </div>
        </div>

        {groups && groups.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => {
              const isFull = group.current_members >= group.member_limit;
              const fillPercentage = (group.current_members / group.member_limit) * 100;
              const isAlmostFull = fillPercentage >= 90 && !isFull;
              const rotationEnabled = group.rotation_enabled ?? true;

              let barColor = 'bg-green-500';
              if (isFull) barColor = 'bg-red-500';
              else if (isAlmostFull) barColor = 'bg-yellow-500';
              else if (fillPercentage >= 70) barColor = 'bg-yellow-400';

              return (
                <Card key={group.id} className={!group.is_active ? 'opacity-60' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base text-foreground">{group.group_name}</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">
                          Prioridade: #{group.priority}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col gap-1">
                        {rotationEnabled ? (
                          <Badge variant="default" className="bg-green-600">
                            <RotateCw className="mr-1 h-3 w-3" />
                            Rotação Ativa
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Rotação Pausada
                          </Badge>
                        )}
                        {!group.is_active && (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                        {isFull && (
                          <Badge variant="destructive">Cheio</Badge>
                        )}
                        {isAlmostFull && (
                          <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                            Quase Cheio
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Membros</span>
                        <span className="font-medium text-foreground">
                          {group.current_members} / {group.member_limit}
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${barColor}`}
                          style={{ width: `${Math.min(fillPercentage, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {group.invite_link && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => handleCopyLink(group.invite_link!)}
                        >
                          <Copy className="mr-2 h-3 w-3" />
                          Copiar Link de Convite
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleSyncMembers(group.id)}
                        disabled={syncingGroupId === group.id}
                      >
                        <RefreshCw className={`mr-2 h-3 w-3 ${syncingGroupId === group.id ? 'animate-spin' : ''}`} />
                        {syncingGroupId === group.id ? 'Sincronizando...' : 'Sincronizar Contatos'}
                      </Button>
                      <Button
                        variant={rotationEnabled ? "default" : "outline"}
                        size="sm"
                        className="w-full"
                        onClick={() => handleToggleRotation(group.id, rotationEnabled)}
                      >
                        {rotationEnabled ? (
                          <>
                            <PowerOff className="mr-2 h-3 w-3" />
                            Pausar Rotação
                          </>
                        ) : (
                          <>
                            <Power className="mr-2 h-3 w-3" />
                            Ativar Rotação
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => onSendToGroup(group.group_phone)}
                      >
                        <Send className="mr-2 h-3 w-3" />
                        Enviar Mensagem
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleToggleActive(group.id, group.is_active)}
                        >
                          {group.is_active ? 'Desativar' : 'Ativar'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleRemoveGroup(group.id)}
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhum Grupo Ainda</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Adicione grupos do WhatsApp a esta campanha para começar a enviar mensagens e rastrear o engajamento.
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Grupos
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <AddGroupsToCampaignDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        campaignId={campaignId}
        onSuccess={handleGroupsAdded}
      />

      <AlertDialog open={!!groupToRemove} onOpenChange={() => setGroupToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Grupo da Campanha?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso removerá o grupo desta campanha. O grupo em si não será excluído
              do WhatsApp. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveGroup}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
