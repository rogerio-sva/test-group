import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Download, FileSpreadsheet, Loader2, Users } from "lucide-react";
import type { Group } from "@/core/types";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ExportContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: Group[];
}

export function ExportContactsDialog({
  open,
  onOpenChange,
  groups,
}: ExportContactsDialogProps) {
  const { toast } = useToast();
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx">("csv");
  const [isExporting, setIsExporting] = useState(false);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedGroups(groups.map((g) => g.phone));
    } else {
      setSelectedGroups([]);
    }
  };

  const toggleGroup = (groupPhone: string) => {
    setSelectedGroups((prev) =>
      prev.includes(groupPhone)
        ? prev.filter((p) => p !== groupPhone)
        : [...prev, groupPhone]
    );
  };

  const fetchGroupParticipants = async (groupPhone: string): Promise<Array<{phone: string; name: string}>> => {
    try {
      const { data, error } = await supabase.functions.invoke('zapi-groups', {
        body: { action: 'getParticipants', groupId: groupPhone }
      });

      if (error || !data?.participants) {
        console.warn(`Failed to fetch participants for ${groupPhone}`);
        return [];
      }

      return data.participants.map((p: any) => ({
        phone: p.id?.replace('@s.whatsapp.net', ''),
        name: p.notify || p.name || p.id?.split('@')[0] || 'Sem nome'
      }));
    } catch (err) {
      console.error(`Error fetching participants for ${groupPhone}:`, err);
      return [];
    }
  };

  const exportToCSV = (contacts: Array<{name: string; phone: string; group: string}>) => {
    const headers = ["Nome", "Telefone", "Grupo"];
    const csvContent = [
      headers.join(","),
      ...contacts.map((c) =>
        [c.name, c.phone, c.group].map((field) => `"${field}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `contatos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToXLSX = (contacts: Array<{name: string; phone: string; group: string}>) => {
    const headers = ["Nome", "Telefone", "Grupo"];
    const rows = contacts.map((c) => [c.name, c.phone, c.group]);

    let xlsx = "Nome\tTelefone\tGrupo\n";
    rows.forEach((row) => {
      xlsx += row.join("\t") + "\n";
    });

    const blob = new Blob(["\ufeff" + xlsx], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `contatos_${new Date().toISOString().split('T')[0]}.xls`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = async () => {
    if (selectedGroups.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um grupo para exportar.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const allContacts: Array<{name: string; phone: string; group: string}> = [];
      const uniquePhones = new Set<string>();

      for (const groupPhone of selectedGroups) {
        const group = groups.find((g) => g.phone === groupPhone);
        const groupName = group?.name || "Grupo sem nome";

        toast({
          title: "Processando",
          description: `Extraindo contatos de ${groupName}...`,
        });

        const participants = await fetchGroupParticipants(groupPhone);

        participants.forEach((participant) => {
          const key = `${participant.phone}-${groupName}`;
          if (!uniquePhones.has(key)) {
            uniquePhones.add(key);
            allContacts.push({
              name: participant.name,
              phone: participant.phone,
              group: groupName,
            });
          }
        });
      }

      if (allContacts.length === 0) {
        toast({
          title: "Aviso",
          description: "Nenhum contato encontrado nos grupos selecionados.",
          variant: "destructive",
        });
        return;
      }

      if (exportFormat === "csv") {
        exportToCSV(allContacts);
      } else {
        exportToXLSX(allContacts);
      }

      toast({
        title: "Exportação concluída!",
        description: `${allContacts.length} contatos exportados com sucesso.`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Erro",
        description: "Erro ao exportar contatos. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Exportar Contatos</DialogTitle>
          <DialogDescription>
            Selecione os grupos dos quais deseja extrair e exportar os contatos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Card className="border-2">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="selectAll"
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label htmlFor="selectAll" className="cursor-pointer font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Selecionar todos os grupos
                  </Label>
                </div>
                <Badge variant="secondary" className="font-semibold">
                  {selectedGroups.length}/{groups.length}
                </Badge>
              </div>

              <ScrollArea className="h-[300px] rounded-lg border-2 p-4">
                <div className="space-y-2">
                  {groups.length === 0 ? (
                    <p className="text-sm text-foreground/70 text-center py-8 font-medium">
                      Nenhum grupo disponível
                    </p>
                  ) : (
                    groups.map((group, index) => (
                      <div
                        key={group.phone}
                        className={`flex items-center space-x-3 p-2 rounded-md hover:bg-accent/50 transition-colors ${
                          index % 2 === 0 ? 'bg-muted/30' : ''
                        }`}
                      >
                        <Checkbox
                          id={group.phone}
                          checked={selectedGroups.includes(group.phone)}
                          onCheckedChange={() => toggleGroup(group.phone)}
                        />
                        <Label
                          htmlFor={group.phone}
                          className="cursor-pointer flex-1 text-sm font-medium"
                        >
                          {group.name || "Grupo sem nome"}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardContent className="pt-4 space-y-3">
              <Label className="text-base font-semibold">Formato de Exportação</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={exportFormat === "csv" ? "default" : "outline"}
                  size="lg"
                  onClick={() => setExportFormat("csv")}
                  className={`h-16 ${exportFormat === "csv" ? "ring-2 ring-ring ring-offset-2" : ""}`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <Download className="h-5 w-5" />
                    <span className="font-semibold">CSV</span>
                  </div>
                </Button>
                <Button
                  variant={exportFormat === "xlsx" ? "default" : "outline"}
                  size="lg"
                  onClick={() => setExportFormat("xlsx")}
                  className={`h-16 ${exportFormat === "xlsx" ? "ring-2 ring-ring ring-offset-2" : ""}`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <FileSpreadsheet className="h-5 w-5" />
                    <span className="font-semibold">Excel</span>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="hero"
            onClick={handleExport}
            disabled={isExporting || selectedGroups.length === 0}
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isExporting ? "Exportando..." : "Exportar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
