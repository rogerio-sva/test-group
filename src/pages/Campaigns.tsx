import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { CampaignCard } from "@/components/campaigns/CampaignCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  Megaphone,
} from "lucide-react";
import {
  useCampaigns,
  useCreateCampaign,
  useDeleteCampaign,
  useAllCampaignGroups,
} from "@/hooks/use-campaigns";
import { useSmartLinks } from "@/hooks/use-campaigns";
import { Skeleton } from "@/components/ui/skeleton";

export default function Campaigns() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignDescription, setNewCampaignDescription] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: campaigns = [], isLoading } = useCampaigns();
  const { data: allGroups = [] } = useAllCampaignGroups();
  const { data: smartLinks = [] } = useSmartLinks();
  const createCampaign = useCreateCampaign();
  const deleteCampaign = useDeleteCampaign();

  const filteredCampaigns = campaigns.filter((campaign) =>
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateCampaign = async () => {
    if (!newCampaignName.trim()) return;

    const result = await createCampaign.mutateAsync({
      name: newCampaignName,
      description: newCampaignDescription || undefined,
    });

    setNewCampaignName("");
    setNewCampaignDescription("");
    setCreateDialogOpen(false);

    if (result) {
      navigate(`/campaigns/${result.id}`);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    await deleteCampaign.mutateAsync(id);
  };

  const getCampaignStats = (campaignId: string) => {
    const campaignGroups = allGroups.filter(g => g.campaign_id === campaignId);
    const campaignLinks = smartLinks.filter(l => l.campaign_id === campaignId);
    const totalClicks = campaignLinks.reduce((sum, link) => sum + (link.total_clicks || 0), 0);

    return {
      total_contacts: 0,
      total_groups: campaignGroups.length,
      total_smart_links: campaignLinks.length,
      messages_sent_week: 0,
      total_messages_sent: totalClicks,
    };
  };

  return (
    <MainLayout
      title="Campanhas de Disparo"
      subtitle="Organize suas campanhas de marketing no WhatsApp"
      action={
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Campanha
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
            {/* Header com gradiente e ícone */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="bg-white/20 backdrop-blur-sm p-4 rounded-full shadow-lg">
                  <Megaphone className="h-10 w-10 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold text-white mb-2">
                    Criar Nova Campanha
                  </DialogTitle>
                  <DialogDescription className="text-white text-base">
                    Organize seus grupos e smart links em uma campanha
                  </DialogDescription>
                </div>
              </div>
            </div>

            {/* Conteúdo do formulário */}
            <div className="p-8 space-y-6 bg-card">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-base font-semibold text-card-foreground">
                  Nome da Campanha
                </Label>
                <Input
                  id="name"
                  placeholder="Ex: Promoção Black Friday 2024"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  className="h-12 text-base transition-all duration-200 focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="description" className="text-base font-semibold text-card-foreground">
                  Descrição <span className="text-card-foreground/70 font-normal">(opcional)</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Descreva o objetivo desta campanha..."
                  value={newCampaignDescription}
                  onChange={(e) => setNewCampaignDescription(e.target.value)}
                  rows={4}
                  className="resize-none text-base transition-all duration-200 focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Botão de ação */}
              <Button
                onClick={handleCreateCampaign}
                disabled={!newCampaignName.trim() || createCampaign.isPending}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                size="lg"
              >
                {createCampaign.isPending ? (
                  <span className="flex items-center gap-2 text-white">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Criando campanha...
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-white">
                    <Megaphone className="h-5 w-5" />
                    Criar Campanha
                  </span>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar campanhas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Campanhas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-12" /> : campaigns.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Campanhas Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoading ? <Skeleton className="h-8 w-12" /> : campaigns.filter(c => c.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Grupos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {isLoading ? <Skeleton className="h-8 w-12" /> : allGroups.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {campaigns.length === 0
                ? "Nenhuma campanha criada ainda. Crie sua primeira campanha!"
                : "Nenhuma campanha corresponde à busca."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCampaigns.map((campaign) => {
            const stats = getCampaignStats(campaign.id);

            return (
              <CampaignCard
                key={campaign.id}
                campaign={{
                  ...campaign,
                  stats,
                }}
                onManage={() => navigate(`/campaigns/${campaign.id}`)}
                onDelete={() => handleDeleteCampaign(campaign.id)}
              />
            );
          })}
        </div>
      )}
    </MainLayout>
  );
}
