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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useCreateGroup } from "@/hooks/use-zapi";
import { Loader2, Upload, FileSpreadsheet, Type, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { LabelWithTooltip } from "@/components/ui/info-tooltip";

interface BulkGroupCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface GroupToCreate {
  name: string;
  phones: string[];
}

interface CreationResult {
  name: string;
  status: "success" | "error";
  message?: string;
}

export function BulkGroupCreateDialog({ open, onOpenChange, onSuccess }: BulkGroupCreateDialogProps) {
  const { toast } = useToast();
  const createGroup = useCreateGroup();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [textInput, setTextInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<CreationResult[]>([]);

  const parseTextInput = (text: string): GroupToCreate[] => {
    const lines = text.split("\n").filter(line => line.trim());
    const groups: GroupToCreate[] = [];

    for (const line of lines) {
      const parts = line.split(":");
      if (parts.length !== 2) continue;

      const name = parts[0].trim();
      const phonesStr = parts[1].trim();

      if (!name || !phonesStr) continue;

      const phones = phonesStr
        .split(",")
        .map(p => p.trim().replace(/\D/g, ""))
        .filter(p => p.length >= 10);

      if (phones.length > 0) {
        groups.push({ name, phones });
      }
    }

    return groups;
  };

  const parseCSV = (text: string): GroupToCreate[] => {
    const lines = text.split("\n").filter(line => line.trim());
    const groups: GroupToCreate[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(",").map(p => p.trim().replace(/^"|"$/g, ""));

      if (parts.length < 2) continue;

      const name = parts[0];
      const phones = parts.slice(1)
        .map(p => p.replace(/\D/g, ""))
        .filter(p => p.length >= 10);

      if (name && phones.length > 0) {
        groups.push({ name, phones });
      }
    }

    return groups;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const groups = parseCSV(text);

      if (groups.length === 0) {
        toast({
          title: "Arquivo inválido",
          description: "Não foi possível encontrar grupos válidos no arquivo CSV.",
          variant: "destructive",
        });
        return;
      }

      const previewText = groups
        .map(g => `${g.name}: ${g.phones.join(", ")}`)
        .join("\n");

      setTextInput(previewText);
      toast({
        title: "Arquivo carregado",
        description: `${groups.length} grupo(s) encontrado(s).`,
      });
    };
    reader.readAsText(file);
  };

  const handleCreateGroups = async () => {
    const groups = parseTextInput(textInput);

    if (groups.length === 0) {
      toast({
        title: "Erro",
        description: "Nenhum grupo válido encontrado. Verifique o formato.",
        variant: "destructive",
      });
      return;
    }

    const confirmCreate = window.confirm(
      `Você está prestes a criar ${groups.length} grupo(s). Deseja continuar?`
    );

    if (!confirmCreate) return;

    setIsCreating(true);
    setProgress(0);
    setResults([]);

    const creationResults: CreationResult[] = [];

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];

      try {
        await new Promise<void>((resolve, reject) => {
          createGroup.mutate(
            { groupName: group.name, phones: group.phones },
            {
              onSuccess: () => {
                creationResults.push({
                  name: group.name,
                  status: "success",
                });
                resolve();
              },
              onError: (error: Error) => {
                creationResults.push({
                  name: group.name,
                  status: "error",
                  message: error.message,
                });
                resolve();
              },
            }
          );
        });

        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        creationResults.push({
          name: group.name,
          status: "error",
          message: "Erro desconhecido",
        });
      }

      setProgress(Math.round(((i + 1) / groups.length) * 100));
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
      setTextInput("");
      setResults([]);
      setProgress(0);
      onOpenChange(false);
    }
  };

  const exampleText = `Vendas Premium: 5511999999999, 5511888888888
Suporte Clientes: 5511777777777, 5511666666666, 5511555555555
Marketing: 5511444444444, 5511333333333`;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Múltiplos Grupos</DialogTitle>
          <DialogDescription>
            Crie vários grupos de uma vez usando texto ou arquivo CSV.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="text" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text">
              <Type className="h-4 w-4 mr-2" />
              Texto
            </TabsTrigger>
            <TabsTrigger value="csv">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Arquivo CSV
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4">
            <div className="grid gap-2">
              <LabelWithTooltip
                label="Lista de Grupos"
                tooltip="Um grupo por linha no formato: Nome do Grupo: telefone1, telefone2, telefone3"
                required
              />
              <Textarea
                placeholder={exampleText}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={10}
                disabled={isCreating}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Formato: <code className="bg-muted px-1 rounded">Nome do Grupo: telefone1, telefone2, telefone3</code>
              </p>
            </div>
          </TabsContent>

          <TabsContent value="csv" className="space-y-4">
            <div className="grid gap-2">
              <Label>Upload de Arquivo CSV</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isCreating}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isCreating}
                className="w-full h-32 border-dashed"
              >
                <Upload className="mr-2 h-5 w-5" />
                Selecionar arquivo CSV
              </Button>
              <Alert>
                <AlertDescription className="text-xs">
                  <strong>Formato do CSV:</strong>
                  <br />
                  Primeira linha: Nome,Telefone1,Telefone2,Telefone3,...
                  <br />
                  Exemplo: Vendas Premium,5511999999999,5511888888888
                </AlertDescription>
              </Alert>
            </div>

            {textInput && (
              <div className="grid gap-2">
                <Label>Preview dos Grupos</Label>
                <Textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  rows={8}
                  disabled={isCreating}
                  className="font-mono text-sm"
                />
              </div>
            )}
          </TabsContent>
        </Tabs>

        {isCreating && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Criando grupos...</span>
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
                  className="flex items-center gap-2 p-2 rounded bg-secondary/20 text-sm"
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

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isCreating}
          >
            {results.length > 0 ? "Fechar" : "Cancelar"}
          </Button>
          <Button
            variant="hero"
            onClick={handleCreateGroups}
            disabled={isCreating || !textInput.trim()}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              "Criar Grupos"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
