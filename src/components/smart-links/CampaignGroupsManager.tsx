import { useState } from "react";
import { Check, AlertTriangle, Link2, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useCampaignGroups, useUpdateCampaignGroup, CampaignGroup } from "@/hooks/use-campaigns";
import { supabase } from "@/integrations/supabase/client";

interface CampaignGroupsManagerProps {
  campaignId: string;
  campaignName: string;
}

export function CampaignGroupsManager({ campaignId, campaignName }: CampaignGroupsManagerProps) {
  const { toast } = useToast();
  const { data: groups = [], isLoading, refetch } = useCampaignGroups(campaignId);
  const updateGroup = useUpdateCampaignGroup();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isFetchingLinks, setIsFetchingLinks] = useState(false);

  const validateInviteLink = (link: string): boolean => {
    return link.startsWith("https://chat.whatsapp.com/") && link.length > 30;
  };

  const handleStartEdit = (group: CampaignGroup) => {
    setEditingId(group.id);
    setEditValue(group.invite_link || "");
  };

  const handleSaveInviteLink = (groupId: string) => {
    if (editValue && !validateInviteLink(editValue)) {
      toast({
        title: "Link inválido",
        description: "O link deve começar com https://chat.whatsapp.com/",
        variant: "destructive",
      });
      return;
    }

    updateGroup.mutate(
      { id: groupId, invite_link: editValue || null },
      {
        onSuccess: () => {
          toast({
            title: "Link salvo",
            description: "O link de convite foi atualizado com sucesso!",
          });
          setEditingId(null);
          setEditValue("");
        },
      }
    );
  };

  const fetchInviteLinkFromZAPI = async (groupPhone: string): Promise<{ link: string | null; error?: string }> => {
    try {
      console.log(`Fetching invite link for: ${groupPhone}`);

      const { data, error } = await supabase.functions.invoke('zapi-groups', {
        body: { action: 'getInviteLink', groupId: groupPhone }
      });

      if (error) {
        console.error('Error from zapi-groups:', error);
        return { link: null, error: error.message || 'Erro ao buscar link' };
      }

      if (data?.success === false) {
        console.error('Z-API error:', data.error);
        return { link: null, error: data.error || 'Erro ao buscar link da Z-API' };
      }

      if (!data?.invitationLink && !data?.link) {
        console.warn(`No invitation link returned for ${groupPhone}`);
        return { link: null, error: 'Link de convite não disponível' };
      }

      const inviteLink = data.invitationLink || data.link;
      if (!inviteLink.includes('chat.whatsapp.com/')) {
        console.warn(`Invalid invite link format for ${groupPhone}: ${inviteLink}`);
        return { link: null, error: 'Formato de link inválido' };
      }

      console.log(`Successfully fetched invite link for ${groupPhone}`);
      return { link: inviteLink };
    } catch (err) {
      console.error('Exception fetching invite link:', err);
      return { link: null, error: err instanceof Error ? err.message : 'Erro desconhecido' };
    }
  };

  const handleFetchAllLinks = async () => {
    const pendingGroups = groups.filter(g => !g.invite_link);
    if (pendingGroups.length === 0) {
      toast({ title: "Todos os grupos já estão configurados!" });
      return;
    }

    setIsFetchingLinks(true);
    let successCount = 0;
    const failedGroups: Array<{ name: string; error: string }> = [];

    console.log(`[CampaignGroupsManager] Buscando links para ${pendingGroups.length} grupos pendentes`);

    for (const group of pendingGroups) {
      console.log(`[CampaignGroupsManager] Processando grupo: ${group.group_name} (${group.group_phone})`);
      const { link: inviteLink, error: fetchError } = await fetchInviteLinkFromZAPI(group.group_phone);

      if (inviteLink) {
        try {
          console.log(`[CampaignGroupsManager] Link obtido para ${group.group_name}, salvando...`);
          await updateGroup.mutateAsync({ id: group.id, invite_link: inviteLink });
          successCount++;
          console.log(`[CampaignGroupsManager] Link salvo com sucesso para ${group.group_name}`);
        } catch (updateError) {
          console.error(`[CampaignGroupsManager] Erro ao salvar link para ${group.group_name}:`, updateError);
          failedGroups.push({
            name: group.group_name,
            error: 'Erro ao salvar no banco de dados'
          });
        }
      } else {
        console.error(`[CampaignGroupsManager] Falha ao obter link para ${group.group_name}:`, fetchError);
        failedGroups.push({
          name: group.group_name,
          error: fetchError || 'Link não disponível'
        });
      }
    }

    console.log(`[CampaignGroupsManager] Resultado: ${successCount} sucesso, ${failedGroups.length} falhas`);
    setIsFetchingLinks(false);
    refetch();

    if (successCount > 0 && failedGroups.length === 0) {
      toast({
        title: "Links atualizados!",
        description: `${successCount} link(s) configurado(s) com sucesso.`,
      });
    } else if (successCount > 0 && failedGroups.length > 0) {
      toast({
        title: "Atualização parcial",
        description: `${successCount} link(s) configurado(s). ${failedGroups.length} grupo(s) falharam e precisam de configuração manual.`,
        variant: "destructive",
        duration: 8000,
      });
    } else {
      const errorSummary = failedGroups.map(g => `• ${g.name}`).join('\n');
      toast({
        title: "Falha ao buscar links automaticamente",
        description: `Não foi possível obter os links dos seguintes grupos:\n${errorSummary}\n\nConfigure manualmente clicando em "Configurar" em cada grupo.`,
        variant: "destructive",
        duration: 10000,
      });
    }
  };

  const configuredCount = groups.filter((g) => g.invite_link).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">{campaignName}</h3>
          <p className="text-sm text-muted-foreground">
            {configuredCount === groups.length 
              ? "Todos os grupos configurados automaticamente" 
              : "Configure manualmente os links pendentes"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {configuredCount < groups.length && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleFetchAllLinks}
              disabled={isFetchingLinks}
            >
              {isFetchingLinks ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Buscar Links
            </Button>
          )}
          <Badge variant={configuredCount === groups.length ? "default" : "secondary"}>
            {configuredCount}/{groups.length} configurados
          </Badge>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-lg bg-secondary/50 p-6 text-center">
          <Link2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Nenhum grupo nesta campanha.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Adicione grupos ao criar um Smart Link.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <div
              key={group.id}
              className="rounded-lg border border-border bg-card p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      group.invite_link
                        ? "bg-primary/10 text-primary"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {group.invite_link ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-card-foreground">{group.group_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Prioridade: {group.priority + 1} • Limite: {group.member_limit} membros
                    </p>
                  </div>
                </div>
                <Badge variant={group.invite_link ? "default" : "destructive"}>
                  {group.invite_link ? "Configurado" : "Pendente"}
                </Badge>
              </div>

              {editingId === group.id ? (
                <div className="space-y-2">
                  <Label htmlFor={`invite-${group.id}`} className="text-xs">
                    Link de Convite do WhatsApp
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id={`invite-${group.id}`}
                      placeholder="https://chat.whatsapp.com/ABC123..."
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSaveInviteLink(group.id)}
                      disabled={updateGroup.isPending}
                    >
                      {updateGroup.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Salvar"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Para obter o link: WhatsApp → Abrir grupo → Toque no nome do grupo → "Convidar via link" → Copiar link
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  {group.invite_link ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground truncate max-w-[200px]">
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{group.invite_link}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-destructive">Link não configurado</p>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleStartEdit(group)}>
                    {group.invite_link ? "Editar" : "Configurar"}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {configuredCount < groups.length && groups.length > 0 && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Atenção</p>
              <p className="text-xs text-destructive">
                {groups.length - configuredCount} grupo(s) sem link de convite. Clique em "Buscar Links" para tentar buscar automaticamente ou configure manualmente clicando em "Configurar" em cada grupo.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
