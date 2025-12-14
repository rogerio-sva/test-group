import { useState } from "react";
import { Link2, Smartphone, Apple, Copy, BarChart3, MoreVertical, Edit, Trash2, Settings2, AlertTriangle, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { CampaignGroupsManager } from "./CampaignGroupsManager";
import { useUpdateSmartLink, useDeleteSmartLink } from "@/hooks/use-campaigns";

interface SmartLinkCardProps {
  id: string;
  name: string;
  shortUrl: string;
  clicks: number;
  activeGroupIndex: number;
  totalGroups: number;
  iosEnabled: boolean;
  androidEnabled: boolean;
  campaignId: string;
  campaignName: string;
  configuredGroups: number;
  slug: string;
  detectDevice: boolean;
  trackClicks: boolean;
  isActive: boolean;
}

export function SmartLinkCard({
  id,
  name,
  shortUrl,
  clicks,
  activeGroupIndex,
  totalGroups,
  iosEnabled,
  androidEnabled,
  campaignId,
  campaignName,
  configuredGroups,
  slug,
  detectDevice,
  trackClicks,
  isActive,
}: SmartLinkCardProps) {
  const { toast } = useToast();
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editData, setEditData] = useState({
    name,
    slug,
    detect_device: detectDevice,
    track_clicks: trackClicks,
    is_active: isActive,
  });

  const updateSmartLink = useUpdateSmartLink();
  const deleteSmartLink = useDeleteSmartLink();

  const getFullUrl = () => {
    const slugValue = shortUrl.replace('zap.link/', '');
    return `${window.location.origin}/link/${slugValue}`;
  };

  const copyLink = () => {
    navigator.clipboard.writeText(getFullUrl());
    toast({
      title: "Link copiado!",
      description: "O link inteligente foi copiado para a área de transferência.",
    });
  };

  const handleSaveEdit = () => {
    if (!editData.name || !editData.slug) {
      toast({
        title: "Erro",
        description: "Nome e slug são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    updateSmartLink.mutate(
      {
        id,
        name: editData.name,
        slug: editData.slug,
        detect_device: editData.detect_device,
        track_clicks: editData.track_clicks,
        is_active: editData.is_active,
      },
      {
        onSuccess: () => {
          setIsEditSheetOpen(false);
        },
      }
    );
  };

  const handleDelete = () => {
    deleteSmartLink.mutate(id, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
      },
    });
  };

  const allConfigured = configuredGroups === totalGroups && totalGroups > 0;

  return (
    <>
      <div className="rounded-xl bg-card p-5 shadow-card transition-all duration-300 hover:shadow-elevated animate-scale-in">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary shadow-glow">
              <Link2 className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground">{name}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{shortUrl}</p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={copyLink}>
                <Copy className="mr-2 h-4 w-4" />
                Copiar link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsEditSheetOpen(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Group Configuration Status */}
        <div className="mt-3 flex items-center gap-2">
          {allConfigured ? (
            <Badge variant="default" className="gap-1">
              <Check className="h-3 w-3" />
              {configuredGroups}/{totalGroups} grupos configurados
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {configuredGroups}/{totalGroups} grupos configurados
            </Badge>
          )}
          {!isActive && (
            <Badge variant="secondary">Inativo</Badge>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-secondary p-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs">Cliques</span>
            </div>
            <p className="mt-1 text-xl font-bold text-card-foreground">{clicks}</p>
          </div>
          <div className="rounded-lg bg-secondary p-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Link2 className="h-4 w-4" />
              <span className="text-xs">Grupos</span>
            </div>
            <p className="mt-1 text-xl font-bold text-card-foreground">
              {totalGroups}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Plataformas:</span>
          <div className="flex gap-1">
            {androidEnabled && (
              <Badge variant="secondary" className="gap-1">
                <Smartphone className="h-3 w-3" />
                Android
              </Badge>
            )}
            {iosEnabled && (
              <Badge variant="secondary" className="gap-1">
                <Apple className="h-3 w-3" />
                iOS
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={copyLink}>
            <Copy className="mr-2 h-4 w-4" />
            Copiar Link
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant={allConfigured ? "secondary" : "destructive"} size="icon">
                <Settings2 className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Gerenciar Grupos</SheetTitle>
                <SheetDescription>
                  Configure os links de convite para cada grupo da campanha.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <CampaignGroupsManager campaignId={campaignId} campaignName={campaignName} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Edit Sheet */}
      <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Editar Link Inteligente</SheetTitle>
            <SheetDescription>
              Altere as configurações do seu smart link.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-6">
            <Card className="border-2">
              <CardContent className="pt-4 space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name" className="text-base font-semibold">Nome do Link</Label>
                  <Input
                    id="edit-name"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="font-medium"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-slug" className="text-base font-semibold">URL Personalizada</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground/80 whitespace-nowrap">zap.link/</span>
                    <Input
                      id="edit-slug"
                      value={editData.slug}
                      onChange={(e) => setEditData({ ...editData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      className="flex-1 font-medium"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 bg-muted/30">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="font-semibold">Detectar Dispositivo</Label>
                    <p className="text-xs text-foreground/80 leading-relaxed">
                      📱 Redireciona com base no sistema (iOS/Android)
                    </p>
                  </div>
                  <Switch
                    checked={editData.detect_device}
                    onCheckedChange={(checked) => setEditData({ ...editData, detect_device: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 bg-muted/30">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="font-semibold">Rastrear Cliques</Label>
                    <p className="text-xs text-foreground/80 leading-relaxed">
                      📊 Registra estatísticas de acesso
                    </p>
                  </div>
                  <Switch
                    checked={editData.track_clicks}
                    onCheckedChange={(checked) => setEditData({ ...editData, track_clicks: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 bg-muted/30">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="font-semibold">Link Ativo</Label>
                    <p className="text-xs text-foreground/80 leading-relaxed">
                      ⚡ Links inativos não redirecionam
                    </p>
                  </div>
                  <Switch
                    checked={editData.is_active}
                    onCheckedChange={(checked) => setEditData({ ...editData, is_active: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          <SheetFooter>
            <Button variant="secondary" onClick={() => setIsEditSheetOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="hero" 
              onClick={handleSaveEdit}
              disabled={updateSmartLink.isPending}
            >
              {updateSmartLink.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Link Inteligente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o link "{name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteSmartLink.isPending}
            >
              {deleteSmartLink.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
