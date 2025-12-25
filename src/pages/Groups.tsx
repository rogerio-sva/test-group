import { useState, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { GroupCard } from "@/components/groups/GroupCard";
import { GroupListItem } from "@/components/groups/GroupListItem";
import { GroupEditSheet } from "@/components/groups/GroupEditSheet";
import { ExportContactsDialog } from "@/components/groups/ExportContactsDialog";
import { BulkGroupCreateDialog } from "@/components/groups/BulkGroupCreateDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Search, RefreshCw, Loader2, Upload, X, Grid3x3, List, Download, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InfoTooltip, LabelWithTooltip } from "@/components/ui/info-tooltip";
import { useZAPIGroups, useCreateGroup, useUpdateGroupPhoto, useUpdateGroupDescription } from "@/hooks/use-zapi";
import { useMediaUpload } from "@/hooks/use-media-upload";
import { Skeleton } from "@/components/ui/skeleton";
import type { Group } from "@/core/types";
import { useGroupMetadata } from "@/hooks/use-group-metadata";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Groups() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isBulkCreateDialogOpen, setIsBulkCreateDialogOpen] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: "",
    phones: "",
    photoUrl: "",
    description: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado para edição de grupo
  const [editingGroup, setEditingGroup] = useState<{
    id: string;
    name: string;
    photoUrl?: string;
    description?: string;
  } | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

  const { data: groups = [], isLoading: isLoadingZAPI, refetch, isRefetching } = useZAPIGroups();
  const createGroup = useCreateGroup();
  const updatePhoto = useUpdateGroupPhoto();
  const updateDescription = useUpdateGroupDescription();
  const { uploadFile, isUploading } = useMediaUpload();

  const {
    groups: cachedGroups,
    syncStatus,
    isLoading: isLoadingCache,
    isSyncing,
    hasError,
    needsSync,
    syncGroups,
  } = useGroupMetadata();

  const isLoading = isLoadingZAPI || isLoadingCache;
  const whatsappGroups = cachedGroups.length > 0 ? cachedGroups : groups.filter((g) => g.isGroup);

  const filteredGroups = whatsappGroups.filter((group) => {
    const name = cachedGroups.length > 0 ? group.group_name : group.name;
    const description = cachedGroups.length > 0 ? group.group_description : null;
    return (
      name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const totalPages = Math.ceil(filteredGroups.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedGroups = filteredGroups.slice(startIndex, endIndex);

  const handleCreateGroup = async () => {
    if (!newGroup.name || !newGroup.phones) {
      toast({
        title: "Erro",
        description: "Preencha o nome e pelo menos um número de telefone.",
        variant: "destructive",
      });
      return;
    }

    // Limpa e formata os números
    const phones = newGroup.phones
      .split(",")
      .map((p) => p.trim().replace(/\D/g, ""))
      .filter((p) => p.length > 0);

    if (phones.length === 0) {
      toast({
        title: "Erro",
        description: "Informe pelo menos um número de telefone válido.",
        variant: "destructive",
      });
      return;
    }

    createGroup.mutate(
      { groupName: newGroup.name, phones },
      {
        onSuccess: async (data) => {
          const groupId = data.phone;
          
          // Atualiza foto e descrição se foram preenchidos
          if (newGroup.photoUrl.trim()) {
            try {
              await updatePhoto.mutateAsync({ groupId, groupPhoto: newGroup.photoUrl.trim() });
            } catch (e) {
              console.error("Erro ao atualizar foto:", e);
            }
          }
          
          if (newGroup.description.trim()) {
            try {
              await updateDescription.mutateAsync({ groupId, groupDescription: newGroup.description.trim() });
            } catch (e) {
              console.error("Erro ao atualizar descrição:", e);
            }
          }
          
          setNewGroup({ name: "", phones: "", photoUrl: "", description: "" });
          setPhotoPreview(null);
          setIsDialogOpen(false);
        },
      }
    );
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview local
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    const result = await uploadFile(file, "group-photos");
    if (result) {
      setNewGroup((prev) => ({ ...prev, photoUrl: result.url }));
    }
  };

  const clearPhotoPreview = () => {
    setPhotoPreview(null);
    setNewGroup((prev) => ({ ...prev, photoUrl: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleEditGroup = (group: any) => {
    const groupId = cachedGroups.length > 0 ? group.group_id : group.phone;
    const groupName = cachedGroups.length > 0 ? group.group_name : group.name;

    setEditingGroup({
      id: groupId,
      name: groupName || "Grupo sem nome",
    });
    setIsEditSheetOpen(true);
  };

  const activeGroups = whatsappGroups.filter((g) => {
    if (cachedGroups.length > 0) return true;
    return g.archived !== "true";
  });
  const archivedGroups = whatsappGroups.filter((g) => {
    if (cachedGroups.length > 0) return false;
    return g.archived === "true";
  });

  return (
    <MainLayout
      title="Gerenciamento de Grupos"
      subtitle="Gerencie todos os seus grupos do WhatsApp"
    >
      {/* Sync Status Alert */}
      {needsSync && !isSyncing && (
        <Alert className="mb-6">
          <AlertDescription>
            Sincronize seus grupos para obter informações detalhadas como número de participantes e descrições.
            <Button
              variant="link"
              className="ml-2 h-auto p-0"
              onClick={() => syncGroups()}
            >
              Sincronizar agora
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {hasError && syncStatus?.error_message && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            Erro na sincronização: {syncStatus.error_message}
            <Button
              variant="link"
              className="ml-2 h-auto p-0 text-destructive"
              onClick={() => syncGroups()}
            >
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isSyncing && (
        <Alert className="mb-6">
          <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
          <AlertDescription className="inline">
            Sincronizando grupos... Isso pode levar alguns minutos.
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar grupos..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="h-8 px-2"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-8 px-2"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Select value={itemsPerPage.toString()} onValueChange={(v) => {
            setItemsPerPage(Number(v));
            setCurrentPage(1);
          }}>
            <SelectTrigger className="w-[100px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExportDialogOpen(true)}
            disabled={whatsappGroups.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>

          <Button
            variant="outline"
            onClick={() => syncGroups()}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {isSyncing ? "Sincronizando..." : "Sincronizar"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            {isRefetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Atualizar Lista
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsBulkCreateDialogOpen(true)}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Criar Múltiplos
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus className="mr-2 h-4 w-4" />
                Novo Grupo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Novo Grupo</DialogTitle>
                <DialogDescription>
                  Crie um novo grupo no WhatsApp via Z-API.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="grid gap-2">
                  <LabelWithTooltip
                    htmlFor="name"
                    label="Nome do Grupo"
                    tooltip="O nome que aparecera no WhatsApp para todos os participantes do grupo."
                    required
                  />
                  <Input
                    id="name"
                    placeholder="Ex: Vendas Premium"
                    value={newGroup.name}
                    onChange={(e) =>
                      setNewGroup({ ...newGroup, name: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <LabelWithTooltip
                    htmlFor="phones"
                    label="Participantes Iniciais"
                    tooltip="Numeros de telefone dos primeiros membros do grupo. Use o formato internacional: 55 (Brasil) + DDD + numero."
                    required
                  />
                  <Input
                    id="phones"
                    placeholder="5511999999999, 5511888888888"
                    value={newGroup.phones}
                    onChange={(e) =>
                      setNewGroup({ ...newGroup, phones: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Separe os numeros por virgula. Inclua o codigo do pais (55 para Brasil).
                  </p>
                </div>
                <div className="grid gap-2">
                  <LabelWithTooltip
                    label="Foto do Grupo"
                    tooltip="Imagem que aparecera como avatar do grupo. Recomendamos uma imagem quadrada de pelo menos 192x192 pixels."
                    optional
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  {photoPreview ? (
                    <div className="relative">
                      <img 
                        src={photoPreview} 
                        alt="Preview" 
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={clearPhotoPreview}
                        type="button"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full h-20 border-dashed"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      type="button"
                    >
                      {isUploading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      {isUploading ? "Enviando..." : "Fazer upload de imagem"}
                    </Button>
                  )}

                  <Input
                    id="photoUrl"
                    placeholder="Ou cole uma URL de imagem"
                    value={newGroup.photoUrl}
                    onChange={(e) =>
                      setNewGroup({ ...newGroup, photoUrl: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <LabelWithTooltip
                    htmlFor="description"
                    label="Descricao do Grupo"
                    tooltip="Texto descritivo que aparece na info do grupo no WhatsApp. Pode ter ate 512 caracteres."
                    optional
                  />
                  <Textarea
                    id="description"
                    placeholder="Descricao do grupo..."
                    value={newGroup.description}
                    onChange={(e) =>
                      setNewGroup({ ...newGroup, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="secondary"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  variant="hero" 
                  onClick={handleCreateGroup}
                  disabled={createGroup.isPending}
                >
                  {createGroup.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Criar Grupo
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
            <p className="text-sm text-muted-foreground">Total de Grupos</p>
            <InfoTooltip content="Todos os grupos do WhatsApp que o sistema consegue acessar atraves da API." />
          </div>
          <p className="text-2xl font-bold text-card-foreground mt-1">
            {isLoading ? <Skeleton className="h-8 w-12" /> : whatsappGroups.length}
          </p>
        </div>
        <div className="rounded-xl bg-card p-4 shadow-card">
          <div className="flex items-center gap-1.5">
            <p className="text-sm text-muted-foreground">Grupos Ativos</p>
            <InfoTooltip content="Grupos que nao estao arquivados e podem receber mensagens." />
          </div>
          <p className="text-2xl font-bold text-primary mt-1">
            {isLoading ? <Skeleton className="h-8 w-12" /> : activeGroups.length}
          </p>
        </div>
        <div className="rounded-xl bg-card p-4 shadow-card">
          <div className="flex items-center gap-1.5">
            <p className="text-sm text-muted-foreground">Arquivados</p>
            <InfoTooltip content="Grupos que foram arquivados no WhatsApp. Podem ser reativados a qualquer momento." />
          </div>
          <p className="text-2xl font-bold text-muted-foreground mt-1">
            {isLoading ? <Skeleton className="h-8 w-12" /> : archivedGroups.length}
          </p>
        </div>
      </div>

      {/* Groups Display */}
      {isLoading ? (
        <div className={viewMode === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "space-y-3"}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-lg bg-card p-4 shadow-card border">
              <Skeleton className="h-6 w-3/4 mb-4" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-2 w-full mb-4" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className={viewMode === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "space-y-3"}>
            {paginatedGroups.map((group, index) => {
              const groupId = cachedGroups.length > 0 ? group.group_id : group.phone;
              const groupName = cachedGroups.length > 0 ? group.group_name : group.name;
              const memberCount = cachedGroups.length > 0 ? group.participant_count : 0;
              const isArchived = cachedGroups.length > 0 ? false : group.archived === "true";

              return (
                <div
                  key={groupId}
                  style={{ animationDelay: `${index * 30}ms` }}
                  className="animate-slide-up"
                >
                  {viewMode === "grid" ? (
                    <GroupCard
                      id={groupId}
                      name={groupName || "Grupo sem nome"}
                      members={memberCount}
                      maxMembers={256}
                      inviteLink={`https://chat.whatsapp.com/${groupId}`}
                      status={isArchived ? "inactive" : "active"}
                      onEdit={() => handleEditGroup(group)}
                    />
                  ) : (
                    <GroupListItem
                      id={groupId}
                      name={groupName || "Grupo sem nome"}
                      members={memberCount}
                      maxMembers={256}
                      inviteLink={`https://chat.whatsapp.com/${groupId}`}
                      status={isArchived ? "inactive" : "active"}
                      onEdit={() => handleEditGroup(group)}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t pt-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1}-{Math.min(endIndex, filteredGroups.length)} de {filteredGroups.length} grupos
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-9 h-9"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {!isLoading && filteredGroups.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {whatsappGroups.length === 0 
              ? "Nenhum grupo encontrado. Verifique se a instância Z-API está conectada."
              : "Nenhum grupo corresponde à busca."}
          </p>
        </div>
      )}

      {/* Sheet de edição */}
      <GroupEditSheet
        open={isEditSheetOpen}
        onOpenChange={setIsEditSheetOpen}
        group={editingGroup}
      />

      {/* Dialog de exportação */}
      <ExportContactsDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        groups={whatsappGroups}
      />

      {/* Dialog de criação em massa */}
      <BulkGroupCreateDialog
        open={isBulkCreateDialogOpen}
        onOpenChange={setIsBulkCreateDialogOpen}
        onSuccess={() => {
          refetch();
          syncGroups();
        }}
      />
    </MainLayout>
  );
}
