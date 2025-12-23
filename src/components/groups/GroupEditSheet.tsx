import { useState, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Users, Image, FileText, Upload, X } from "lucide-react";
import { useUpdateGroupName, useUpdateGroupPhoto, useUpdateGroupDescription } from "@/hooks/use-zapi";
import { useMediaUpload } from "@/hooks/use-media-upload";

interface GroupEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: {
    id: string;
    name: string;
    photoUrl?: string;
    description?: string;
  } | null;
}

export function GroupEditSheet({ open, onOpenChange, group }: GroupEditSheetProps) {
  const [name, setName] = useState(group?.name || "");
  const [photoUrl, setPhotoUrl] = useState(group?.photoUrl || "");
  const [description, setDescription] = useState(group?.description || "");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateName = useUpdateGroupName();
  const updatePhoto = useUpdateGroupPhoto();
  const updateDescription = useUpdateGroupDescription();
  const { uploadFile, isUploading } = useMediaUpload();

  // Atualiza os estados quando o grupo muda
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && group) {
      setName(group.name);
      setPhotoUrl(group.photoUrl || "");
      setDescription(group.description || "");
      setPhotoPreview(null);
    }
    onOpenChange(isOpen);
  };

  const handleSaveName = () => {
    if (!group || !name.trim()) return;
    updateName.mutate({ groupId: group.id, groupName: name.trim() });
  };

  const handleSavePhoto = () => {
    if (!group || !photoUrl.trim()) return;
    updatePhoto.mutate({ groupId: group.id, groupPhoto: photoUrl.trim() });
  };

  const handleSaveDescription = () => {
    if (!group) return;
    updateDescription.mutate({ groupId: group.id, groupDescription: description.trim() });
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
      setPhotoUrl(result.url);
    }
  };

  const clearPhotoPreview = () => {
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (!group) return null;

  const displayPhoto = photoPreview || photoUrl;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Editar Grupo
          </SheetTitle>
          <SheetDescription>
            Atualize as informações do grupo. Cada campo é salvo individualmente.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Preview do grupo */}
          <Card className="border-2 bg-card">
            <CardContent className="pt-4">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-primary/20 overflow-hidden border-2">
                  {displayPhoto ? (
                    <img src={displayPhoto} alt={name} className="h-full w-full object-cover" />
                  ) : (
                    <Users className="h-10 w-10 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-lg text-foreground truncate">{name || "Sem nome"}</p>
                  <p className="text-xs text-muted-foreground truncate font-medium">ID: {group.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Nome do grupo */}
          <Card className="border-2 bg-card">
            <CardContent className="pt-4 space-y-3">
              <Label htmlFor="edit-name" className="text-base font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Nome do Grupo
              </Label>
              <div className="flex gap-2">
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do grupo"
                  className="flex-1 font-medium"
                />
                <Button
                  onClick={handleSaveName}
                  disabled={updateName.isPending || !name.trim()}
                  size="icon"
                  variant="secondary"
                  className="h-10 w-10"
                >
                  {updateName.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Foto do grupo */}
          <Card className="border-2 bg-card">
            <CardContent className="pt-4 space-y-3">
              <Label className="text-base font-semibold text-foreground flex items-center gap-2">
                <Image className="h-4 w-4" />
                Foto do Grupo
              </Label>

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
                    className="w-full h-32 object-cover rounded-lg border-2"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={clearPhotoPreview}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-20 border-dashed border-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-5 w-5" />
                  )}
                  {isUploading ? "Enviando..." : "Fazer upload de imagem"}
                </Button>
              )}

              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-medium">ou informe a URL</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="flex gap-2">
                <Input
                  id="edit-photo"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="URL da imagem"
                  className="flex-1 font-medium"
                />
                <Button
                  onClick={handleSavePhoto}
                  disabled={updatePhoto.isPending || !photoUrl.trim() || isUploading}
                  size="icon"
                  variant="secondary"
                  className="h-10 w-10"
                >
                  {updatePhoto.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Descrição do grupo */}
          <Card className="border-2 bg-card">
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-description" className="text-base font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Descrição
                </Label>
                <Button
                  onClick={handleSaveDescription}
                  disabled={updateDescription.isPending}
                  size="sm"
                  variant="secondary"
                >
                  {updateDescription.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Salvar
                </Button>
              </div>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição do grupo..."
                rows={4}
                className="font-medium"
              />
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
