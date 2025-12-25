import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useCreateGroup, useUpdateGroupPhoto, useUpdateGroupDescription } from "@/hooks/use-zapi";
import { useMediaUpload } from "@/hooks/use-media-upload";
import { Loader2, Upload, CheckCircle2, XCircle, Hash, Image } from "lucide-react";
import { LabelWithTooltip } from "@/components/ui/info-tooltip";

interface NumberedGroupCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface CreationResult {
  name: string;
  status: "success" | "error";
  message?: string;
  groupId?: string;
}

export function NumberedGroupCreateDialog({ open, onOpenChange, onSuccess }: NumberedGroupCreateDialogProps) {
  const { toast } = useToast();
  const createGroup = useCreateGroup();
  const updatePhoto = useUpdateGroupPhoto();
  const updateDescription = useUpdateGroupDescription();
  const { uploadFile, isUploading } = useMediaUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [baseName, setBaseName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [phones, setPhones] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentGroupNumber, setCurrentGroupNumber] = useState(0);
  const [results, setResults] = useState<CreationResult[]>([]);

  const handleQuantityChange = (value: string) => {
    const num = parseInt(value) || 1;
    setQuantity(Math.min(Math.max(1, num), 50));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem.",
        variant: "destructive",
      });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);

    try {
      const uploadedUrl = await uploadFile(file);
      setPhotoUrl(uploadedUrl);
      toast({
        title: "Imagem carregada",
        description: "A imagem será aplicada a todos os grupos.",
      });
    } catch (error) {
      toast({
        title: "Erro no upload",
        description: "Não foi possível fazer upload da imagem.",
        variant: "destructive",
      });
      setPhotoPreview(null);
    }
  };

  const getGroupNames = () => {
    return Array.from({ length: quantity }, (_, i) => `${baseName} #${i + 1}`);
  };

  const handleCreateGroups = async () => {
    if (!baseName.trim()) {
      toast({
        title: "Erro",
        description: "Informe o nome base dos grupos.",
        variant: "destructive",
      });
      return;
    }

    if (!phones.trim()) {
      toast({
        title: "Erro",
        description: "Informe pelo menos um número de telefone.",
        variant: "destructive",
      });
      return;
    }

    const phoneList = phones
      .split(",")
      .map((p) => p.trim().replace(/\D/g, ""))
      .filter((p) => p.length >= 10);

    if (phoneList.length === 0) {
      toast({
        title: "Erro",
        description: "Informe pelo menos um número de telefone válido (mínimo 10 dígitos).",
        variant: "destructive",
      });
      return;
    }

    if (quantity > 20) {
      const confirmCreate = window.confirm(
        `Você está prestes a criar ${quantity} grupos. Isso pode levar alguns minutos. Deseja continuar?`
      );
      if (!confirmCreate) return;
    }

    setIsCreating(true);
    setProgress(0);
    setResults([]);
    setCurrentGroupNumber(0);

    const creationResults: CreationResult[] = [];
    const groupNames = getGroupNames();

    for (let i = 0; i < groupNames.length; i++) {
      const groupName = groupNames[i];
      setCurrentGroupNumber(i + 1);

      try {
        const result = await new Promise<{ success: boolean; groupId?: string; error?: string }>((resolve) => {
          createGroup.mutate(
            { groupName, phones: phoneList },
            {
              onSuccess: (data) => {
                resolve({ success: true, groupId: data.phone });
              },
              onError: (error: Error) => {
                resolve({ success: false, error: error.message });
              },
            }
          );
        });

        if (result.success && result.groupId) {
          if (photoUrl.trim()) {
            try {
              await updatePhoto.mutateAsync({
                groupId: result.groupId,
                groupPhoto: photoUrl.trim()
              });
            } catch (e) {
              console.error("Erro ao atualizar foto:", e);
            }
          }

          if (description.trim()) {
            try {
              await updateDescription.mutateAsync({
                groupId: result.groupId,
                groupDescription: description.trim()
              });
            } catch (e) {
              console.error("Erro ao atualizar descrição:", e);
            }
          }

          creationResults.push({
            name: groupName,
            status: "success",
            groupId: result.groupId,
          });
        } else {
          creationResults.push({
            name: groupName,
            status: "error",
            message: result.error || "Erro desconhecido",
          });
        }

        await new Promise(resolve => setTimeout(resolve, 2500));
      } catch (error) {
        creationResults.push({
          name: groupName,
          status: "error",
          message: "Erro desconhecido",
        });
      }

      setProgress(Math.round(((i + 1) / groupNames.length) * 100));
      setResults([...creationResults]);
    }

    setIsCreating(false);

    const successCount = creationResults.filter(r => r.status === "success").length;
    const errorCount = creationResults.filter(r => r.status === "error").length;

    toast({
      title: "Criação concluída",
      description: `${successCount} grupo(s) criado(s) com sucesso, ${errorCount} erro(s).`,
      variant: successCount > 0 ? "default" : "destructive",
    });

    if (successCount > 0 && onSuccess) {
      onSuccess();
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setBaseName("");
      setQuantity(1);
      setPhones("");
      setPhotoUrl("");
      setPhotoPreview(null);
      setDescription("");
      setResults([]);
      setProgress(0);
      setCurrentGroupNumber(0);
      onOpenChange(false);
    }
  };

  const previewNames = getGroupNames();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Grupos Numerados</DialogTitle>
          <DialogDescription>
            Crie múltiplos grupos automaticamente com numeração sequencial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <LabelWithTooltip
              label="Nome Base do Grupo"
              tooltip="O nome que será usado como base. A numeração será adicionada automaticamente"
              required
            />
            <Input
              placeholder="Ex: Lançamento IA"
              value={baseName}
              onChange={(e) => setBaseName(e.target.value)}
              disabled={isCreating}
            />
          </div>

          <div className="grid gap-2">
            <LabelWithTooltip
              label="Quantidade de Grupos"
              tooltip="Número de grupos a serem criados (máximo 50 por vez)"
              required
            />
            <Input
              type="number"
              min={1}
              max={50}
              value={quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              disabled={isCreating}
            />
            {quantity > 20 && (
              <Alert>
                <AlertDescription className="text-xs">
                  Criar mais de 20 grupos pode levar alguns minutos.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="grid gap-2">
            <LabelWithTooltip
              label="Telefones dos Participantes"
              tooltip="Números que serão adicionados em todos os grupos. Separe por vírgula"
              required
            />
            <Textarea
              placeholder="5511999999999, 5511888888888"
              value={phones}
              onChange={(e) => setPhones(e.target.value)}
              rows={3}
              disabled={isCreating}
            />
            <p className="text-xs text-muted-foreground">
              Separe os números por vírgula. Formato: 5511999999999
            </p>
          </div>

          <div className="grid gap-2">
            <Label>Imagem do Grupo (Opcional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isCreating || isUploading}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isCreating || isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fazendo upload...
                </>
              ) : photoPreview ? (
                <>
                  <Image className="mr-2 h-4 w-4" />
                  Imagem selecionada
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Selecionar Imagem
                </>
              )}
            </Button>
            {photoPreview && (
              <div className="relative w-24 h-24 rounded-lg overflow-hidden border">
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Descrição do Grupo (Opcional)</Label>
            <Textarea
              placeholder="Descrição que será aplicada a todos os grupos"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              disabled={isCreating}
            />
          </div>

          {baseName && quantity > 0 && (
            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Preview dos Grupos ({previewNames.length})
              </Label>
              <div className="p-3 bg-muted rounded-lg max-h-32 overflow-y-auto">
                <div className="space-y-1">
                  {previewNames.slice(0, 10).map((name, index) => (
                    <div key={index} className="text-sm text-muted-foreground">
                      {name}
                    </div>
                  ))}
                  {previewNames.length > 10 && (
                    <div className="text-sm text-muted-foreground italic">
                      ... e mais {previewNames.length - 10} grupo(s)
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {isCreating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Criando grupo {currentGroupNumber} de {quantity}...</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              <Label>Resultados</Label>
              <div className="space-y-1">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 rounded bg-secondary/20 text-sm animate-in fade-in duration-300"
                  >
                    {result.status === "success" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    )}
                    <span className="flex-1 truncate">{result.name}</span>
                    {result.message && (
                      <span className="text-xs text-muted-foreground truncate">
                        {result.message}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isCreating}
          >
            {results.length > 0 ? "Fechar" : "Cancelar"}
          </Button>
          <Button
            onClick={handleCreateGroups}
            disabled={isCreating || !baseName.trim() || !phones.trim() || isUploading}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Hash className="mr-2 h-4 w-4" />
                Criar {quantity} Grupo(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
