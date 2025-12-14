import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { SmartLinkCard } from "@/components/smart-links/SmartLinkCard";
import { GroupSelector } from "@/components/groups/GroupSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Link2, Smartphone, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InfoTooltip, LabelWithTooltip } from "@/components/ui/info-tooltip";
import { 
  useSmartLinks, 
  useCreateSmartLink, 
  useCampaigns, 
  useCreateCampaign,
  useAllCampaignGroups,
  useAddCampaignGroup
} from "@/hooks/use-campaigns";
import { useZAPIGroups } from "@/hooks/use-zapi";
import { supabase } from "@/integrations/supabase/client";

export default function SmartLinks() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCampaignDialogOpen, setIsCampaignDialogOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: "", description: "" });
  const [newLink, setNewLink] = useState({
    name: "",
    slug: "",
    campaign_id: "",
    detect_device: true,
    track_clicks: true,
    selectedGroups: [] as string[],
  });

  const { data: smartLinks = [], isLoading } = useSmartLinks();
  const { data: campaigns = [], isLoading: isLoadingCampaigns } = useCampaigns();
  const { data: zapiGroups = [], isLoading: isLoadingGroups, refetch: refetchGroups } = useZAPIGroups();
  const createSmartLink = useCreateSmartLink();
  const createCampaign = useCreateCampaign();
  const addCampaignGroup = useAddCampaignGroup();
  const { data: allCampaignGroups = [] } = useAllCampaignGroups();

  const whatsappGroups = zapiGroups.filter((g) => g.isGroup);

  const filteredLinks = smartLinks.filter((link) =>
    link.name.toLowerCase().includes(searchQuery.toLowerCase())
  );


  const handleCreateCampaign = () => {
    if (!newCampaign.name) {
      toast({
        title: "Erro",
        description: "Informe o nome da campanha.",
        variant: "destructive",
      });
      return;
    }

    createCampaign.mutate(newCampaign, {
      onSuccess: (campaign) => {
        setNewCampaign({ name: "", description: "" });
        setIsCampaignDialogOpen(false);
        setNewLink((prev) => ({ ...prev, campaign_id: campaign.id }));
      },
    });
  };

  const [isCreatingLink, setIsCreatingLink] = useState(false);

  const fetchInviteLink = async (groupPhone: string): Promise<{ link: string | null; error?: string }> => {
    try {
      console.log(`Fetching invite link for: ${groupPhone}`);

      const { data, error } = await supabase.functions.invoke('zapi-groups', {
        body: { action: 'getInviteLink', groupId: groupPhone }
      });

      if (error) {
        console.error('Error from zapi-groups:', error);
        return { link: null, error: error.message || 'Erro ao buscar link' };
      }

      if (!data?.invitationLink) {
        console.warn(`No invitation link returned for ${groupPhone}`);
        return { link: null, error: 'Link de convite não disponível' };
      }

      const inviteLink = data.invitationLink;
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

  const handleCreateLink = async () => {
    if (!newLink.name || !newLink.slug || !newLink.campaign_id) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (newLink.selectedGroups.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um grupo.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingLink(true);

    try {
      const failedGroups: Array<{ name: string; error: string }> = [];
      const successGroups: string[] = [];

      for (let i = 0; i < newLink.selectedGroups.length; i++) {
        const groupPhone = newLink.selectedGroups[i];
        const group = whatsappGroups.find((g) => g.phone === groupPhone);

        if (!group) {
          console.warn(`Group ${groupPhone} not found in whatsappGroups`);
          continue;
        }

        const { link: inviteLink, error: fetchError } = await fetchInviteLink(groupPhone);

        if (!inviteLink || fetchError) {
          failedGroups.push({
            name: group.name || groupPhone,
            error: fetchError || 'Link não disponível'
          });
        } else {
          successGroups.push(group.name || groupPhone);
        }

        await addCampaignGroup.mutateAsync({
          campaign_id: newLink.campaign_id,
          group_phone: groupPhone,
          group_name: group.name || "Grupo sem nome",
          member_limit: 256,
          current_members: 0,
          invite_link: inviteLink,
          priority: i,
          is_active: true,
        });
      }

      if (failedGroups.length > 0) {
        const failedList = failedGroups.map(g => `${g.name}: ${g.error}`).join(', ');
        toast({
          title: "Atenção - Links Incompletos",
          description: `${successGroups.length} grupo(s) configurado(s) com sucesso. ${failedGroups.length} grupo(s) precisam de configuração manual: ${failedList}`,
          variant: "destructive",
          duration: 10000,
        });
      }

      // Cria o smart link
      await createSmartLink.mutateAsync({
        campaign_id: newLink.campaign_id,
        slug: newLink.slug,
        name: newLink.name,
        detect_device: newLink.detect_device,
        track_clicks: newLink.track_clicks,
      });

      toast({
        title: "Sucesso!",
        description: "Smart Link criado com sucesso.",
      });

      setNewLink({
        name: "",
        slug: "",
        campaign_id: "",
        detect_device: true,
        track_clicks: true,
        selectedGroups: [],
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Erro ao criar smart link:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar o smart link. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingLink(false);
    }
  };

  return (
    <MainLayout
      title="Links Inteligentes"
      subtitle="Gerencie links que alternam grupos automaticamente"
    >
      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar links..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Dialog open={isCampaignDialogOpen} onOpenChange={setIsCampaignDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary">
                <Plus className="mr-2 h-4 w-4" />
                Nova Campanha
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Campanha</DialogTitle>
                <DialogDescription>
                  Campanhas agrupam múltiplos grupos para rotação de smart links.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="campaignName" className="font-medium">Nome da Campanha</Label>
                  <Input
                    id="campaignName"
                    placeholder="Ex: Black Friday 2024"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="campaignDesc" className="font-medium">Descrição <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                  <Input
                    id="campaignDesc"
                    placeholder="Descrição da campanha..."
                    value={newCampaign.description}
                    onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setIsCampaignDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="hero" onClick={handleCreateCampaign} disabled={createCampaign.isPending}>
                  {createCampaign.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar Campanha
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus className="mr-2 h-4 w-4" />
                Novo Link Inteligente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Criar Link Inteligente</DialogTitle>
                <DialogDescription>
                  Crie um link que alterna entre grupos quando atingem o limite.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="grid gap-2">
                  <LabelWithTooltip
                    htmlFor="linkName"
                    label="Nome do Link"
                    tooltip="Nome interno para identificar este link. Aparece apenas no painel de controle."
                    required
                  />
                  <Input
                    id="linkName"
                    placeholder="Ex: Link de Vendas"
                    value={newLink.name}
                    onChange={(e) => setNewLink({ ...newLink, name: e.target.value })}
                  />
                </div>

                <div className="grid gap-2">
                  <LabelWithTooltip
                    htmlFor="campaign"
                    label="Campanha"
                    tooltip="Campanha que contem os grupos para rotacao. O link direcionara para os grupos desta campanha."
                    required
                  />
                  <Select
                    value={newLink.campaign_id}
                    onValueChange={(value) => setNewLink({ ...newLink, campaign_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma campanha" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {campaigns.length === 0 && !isLoadingCampaigns && (
                    <p className="text-xs text-muted-foreground">
                      Nenhuma campanha encontrada. Crie uma primeiro.
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <LabelWithTooltip
                    htmlFor="slug"
                    label="URL Personalizada"
                    tooltip="Identificador unico do link. Aparecera na URL: zap.link/seu-identificador. Use apenas letras minusculas, numeros e hifens."
                    required
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">zap.link/</span>
                    <Input
                      id="slug"
                      placeholder="meu-link"
                      value={newLink.slug}
                      onChange={(e) => setNewLink({ ...newLink, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="grid gap-3">
                  <Label className="font-medium">Opcoes</Label>
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="detectDevice"
                        checked={newLink.detect_device}
                        onCheckedChange={(checked) => setNewLink({ ...newLink, detect_device: checked })}
                      />
                      <Label htmlFor="detectDevice" className="flex items-center gap-2 cursor-pointer">
                        <Smartphone className="h-4 w-4" />
                        Detectar Dispositivo
                      </Label>
                      <InfoTooltip content="Identifica automaticamente se o usuario esta em iPhone ou Android e abre o app correto do WhatsApp." />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="trackClicks"
                        checked={newLink.track_clicks}
                        onCheckedChange={(checked) => setNewLink({ ...newLink, track_clicks: checked })}
                      />
                      <Label htmlFor="trackClicks" className="cursor-pointer">
                        Rastrear Cliques
                      </Label>
                      <InfoTooltip content="Registra cada clique no link para analise posterior. Inclui horario, dispositivo e localizacao aproximada." />
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <LabelWithTooltip
                    label="Adicionar Grupos a Campanha"
                    tooltip="Selecione os grupos que farao parte da rotacao. Quando um grupo lota, o link direciona para o proximo."
                  />
                  <p className="text-xs text-muted-foreground">
                    Os grupos serao adicionados a campanha selecionada.
                  </p>
                  <GroupSelector
                    groups={whatsappGroups.map((g) => ({
                      id: g.phone,
                      name: g.name || "Grupo sem nome",
                      phone: g.phone,
                    }))}
                    selectedGroups={newLink.selectedGroups}
                    onSelectionChange={(selected) =>
                      setNewLink({ ...newLink, selectedGroups: selected })
                    }
                    isLoading={isLoadingGroups}
                    onRefresh={() => refetchGroups()}
                    maxHeight="200px"
                    showPriority
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  variant="hero" 
                  onClick={handleCreateLink}
                  disabled={isCreatingLink}
                >
                  {isCreatingLink && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <Link2 className="mr-2 h-4 w-4" />
                  {isCreatingLink ? "Criando..." : "Criar Link"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl bg-card p-4 shadow-card">
          <div className="flex items-center gap-1.5">
            <p className="text-sm text-muted-foreground">Total de Links</p>
            <InfoTooltip content="Quantidade total de links inteligentes criados no sistema." />
          </div>
          <p className="text-2xl font-bold text-card-foreground mt-1">
            {isLoading ? <Skeleton className="h-8 w-12" /> : smartLinks.length}
          </p>
        </div>
        <div className="rounded-xl bg-card p-4 shadow-card">
          <div className="flex items-center gap-1.5">
            <p className="text-sm text-muted-foreground">Total de Cliques</p>
            <InfoTooltip content="Soma de todos os acessos em todos os links inteligentes." />
          </div>
          <p className="text-2xl font-bold text-primary mt-1">
            {isLoading ? <Skeleton className="h-8 w-12" /> : smartLinks.reduce((acc, l) => acc + l.total_clicks, 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl bg-card p-4 shadow-card">
          <div className="flex items-center gap-1.5">
            <p className="text-sm text-muted-foreground">Campanhas Ativas</p>
            <InfoTooltip content="Campanhas que estao habilitadas e funcionando para rotacao de grupos." />
          </div>
          <p className="text-2xl font-bold text-accent-foreground mt-1">
            {isLoadingCampaigns ? <Skeleton className="h-8 w-12" /> : campaigns.filter((c) => c.is_active).length}
          </p>
        </div>
      </div>

      {/* Info Card */}
      <div className="rounded-xl bg-accent/50 border border-accent p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Link2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-accent-foreground">
              Como funcionam os Links Inteligentes?
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Os links inteligentes direcionam automaticamente para o próximo
              grupo disponível quando o atual atinge o limite de membros. Também
              detectam o dispositivo (iOS/Android) para abrir diretamente no app
              correto.
            </p>
          </div>
        </div>
      </div>

      {/* Links Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl bg-card p-6 shadow-card">
              <Skeleton className="h-6 w-3/4 mb-4" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-4 w-full mb-4" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLinks.map((link, index) => (
            <div
              key={link.id}
              style={{ animationDelay: `${index * 50}ms` }}
              className="animate-slide-up"
            >
              <SmartLinkCard
                id={link.id}
                name={link.name}
                shortUrl={`zap.link/${link.slug}`}
                clicks={link.total_clicks}
                activeGroupIndex={1}
                totalGroups={allCampaignGroups.filter(g => g.campaign_id === link.campaign_id).length}
                iosEnabled={link.detect_device}
                androidEnabled={link.detect_device}
                campaignId={link.campaign_id}
                campaignName={link.campaign?.name || "Campanha"}
                configuredGroups={allCampaignGroups.filter(g => g.campaign_id === link.campaign_id && g.invite_link).length}
                slug={link.slug}
                detectDevice={link.detect_device}
                trackClicks={link.track_clicks}
                isActive={link.is_active}
              />
            </div>
          ))}
        </div>
      )}

      {!isLoading && filteredLinks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nenhum link encontrado.</p>
        </div>
      )}
    </MainLayout>
  );
}
