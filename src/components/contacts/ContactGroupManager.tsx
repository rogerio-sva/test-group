import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Search, Users, UserMinus, UserPlus, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useZAPIGroups } from "@/hooks/use-zapi";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface ContactGroupInfo {
  groupPhone: string;
  groupName: string;
  isMember: boolean;
}

export function ContactGroupManager() {
  const { toast } = useToast();
  const [searchPhone, setSearchPhone] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [contactGroups, setContactGroups] = useState<ContactGroupInfo[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: allGroups = [], isLoading: isLoadingGroups } = useZAPIGroups();
  const whatsappGroups = allGroups.filter((g) => g.isGroup);

  const formatPhone = (phone: string) => {
    return phone.replace(/\D/g, "");
  };

  const checkContactInGroups = async () => {
    const formattedPhone = formatPhone(searchPhone);

    if (!formattedPhone || formattedPhone.length < 10) {
      toast({
        title: "Erro",
        description: "Digite um número de telefone válido.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const groupsInfo: ContactGroupInfo[] = [];

      for (const group of whatsappGroups) {
        try {
          const { data, error } = await supabase.functions.invoke('zapi-groups', {
            body: { action: 'getParticipants', groupId: group.phone }
          });

          if (error) {
            console.error(`Error fetching participants for ${group.name}:`, error);
            continue;
          }

          const participants = data?.participants || [];
          const isMember = participants.some(
            (p: any) => p.id?.replace('@s.whatsapp.net', '') === formattedPhone
          );

          groupsInfo.push({
            groupPhone: group.phone,
            groupName: group.name || "Grupo sem nome",
            isMember,
          });
        } catch (err) {
          console.error(`Exception checking ${group.name}:`, err);
        }
      }

      setContactGroups(groupsInfo);

      const memberCount = groupsInfo.filter(g => g.isMember).length;
      toast({
        title: "Busca concluída",
        description: `Contato encontrado em ${memberCount} grupo(s).`,
      });
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Erro",
        description: "Erro ao buscar contato nos grupos.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const toggleGroupSelection = (groupPhone: string) => {
    setSelectedGroups((prev) =>
      prev.includes(groupPhone)
        ? prev.filter((p) => p !== groupPhone)
        : [...prev, groupPhone]
    );
  };

  const handleRemoveFromGroups = async () => {
    if (selectedGroups.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um grupo.",
        variant: "destructive",
      });
      return;
    }

    const formattedPhone = formatPhone(searchPhone);
    setIsProcessing(true);

    try {
      let successCount = 0;
      let failCount = 0;

      for (const groupPhone of selectedGroups) {
        try {
          const { error } = await supabase.functions.invoke('zapi-groups', {
            body: {
              action: 'removeParticipant',
              groupId: groupPhone,
              phones: [formattedPhone]
            }
          });

          if (error) {
            failCount++;
            console.error(`Failed to remove from group ${groupPhone}:`, error);
          } else {
            successCount++;
          }
        } catch (err) {
          failCount++;
          console.error(`Exception removing from group ${groupPhone}:`, err);
        }
      }

      toast({
        title: successCount > 0 ? "Sucesso!" : "Erro",
        description: `Removido de ${successCount} grupo(s). ${failCount > 0 ? `Falha em ${failCount} grupo(s).` : ""}`,
        variant: successCount > 0 ? "default" : "destructive",
      });

      if (successCount > 0) {
        checkContactInGroups();
        setSelectedGroups([]);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao remover contato dos grupos.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddToGroups = async () => {
    if (selectedGroups.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um grupo.",
        variant: "destructive",
      });
      return;
    }

    const formattedPhone = formatPhone(searchPhone);
    setIsProcessing(true);

    try {
      let successCount = 0;
      let failCount = 0;

      for (const groupPhone of selectedGroups) {
        try {
          const { error } = await supabase.functions.invoke('zapi-groups', {
            body: {
              action: 'addParticipant',
              groupId: groupPhone,
              phones: [formattedPhone]
            }
          });

          if (error) {
            failCount++;
            console.error(`Failed to add to group ${groupPhone}:`, error);
          } else {
            successCount++;
          }
        } catch (err) {
          failCount++;
          console.error(`Exception adding to group ${groupPhone}:`, err);
        }
      }

      toast({
        title: successCount > 0 ? "Sucesso!" : "Erro",
        description: `Adicionado a ${successCount} grupo(s). ${failCount > 0 ? `Falha em ${failCount} grupo(s).` : ""}`,
        variant: successCount > 0 ? "default" : "destructive",
      });

      if (successCount > 0) {
        checkContactInGroups();
        setSelectedGroups([]);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao adicionar contato aos grupos.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const memberGroups = contactGroups.filter(g => g.isMember);
  const nonMemberGroups = contactGroups.filter(g => !g.isMember);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Buscar Contato em Grupos</CardTitle>
        <CardDescription>
          Digite o número de um contato para ver em quais grupos ele está e gerenciar sua participação.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="searchPhone">Número do Contato</Label>
            <Input
              id="searchPhone"
              placeholder="5511999999999"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  checkContactInGroups();
                }
              }}
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={checkContactInGroups}
              disabled={isSearching || !searchPhone}
            >
              {isSearching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Buscar
            </Button>
          </div>
        </div>

        {isSearching && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {!isSearching && contactGroups.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Contato: {formatPhone(searchPhone)}
                </p>
                <div className="flex gap-2">
                  <Badge variant="default">{memberGroups.length} grupos como membro</Badge>
                  <Badge variant="secondary">{nonMemberGroups.length} grupos disponíveis</Badge>
                </div>
              </div>
            </div>

            <Separator />

            {memberGroups.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Membro destes grupos
                </h3>
                <ScrollArea className="h-[200px] rounded-lg border p-3">
                  <div className="space-y-2">
                    {memberGroups.map((group) => (
                      <div key={group.groupPhone} className="flex items-center space-x-2">
                        <Checkbox
                          id={`member-${group.groupPhone}`}
                          checked={selectedGroups.includes(group.groupPhone)}
                          onCheckedChange={() => toggleGroupSelection(group.groupPhone)}
                        />
                        <Label
                          htmlFor={`member-${group.groupPhone}`}
                          className="cursor-pointer flex-1 text-sm"
                        >
                          {group.groupName}
                        </Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveFromGroups}
                  disabled={selectedGroups.length === 0 || isProcessing}
                  className="mt-2 w-full"
                >
                  {isProcessing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UserMinus className="mr-2 h-4 w-4" />
                  )}
                  Remover dos Grupos Selecionados
                </Button>
              </div>
            )}

            {nonMemberGroups.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Não é membro destes grupos
                </h3>
                <ScrollArea className="h-[200px] rounded-lg border p-3">
                  <div className="space-y-2">
                    {nonMemberGroups.map((group) => (
                      <div key={group.groupPhone} className="flex items-center space-x-2">
                        <Checkbox
                          id={`non-member-${group.groupPhone}`}
                          checked={selectedGroups.includes(group.groupPhone)}
                          onCheckedChange={() => toggleGroupSelection(group.groupPhone)}
                        />
                        <Label
                          htmlFor={`non-member-${group.groupPhone}`}
                          className="cursor-pointer flex-1 text-sm"
                        >
                          {group.groupName}
                        </Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleAddToGroups}
                  disabled={selectedGroups.length === 0 || isProcessing}
                  className="mt-2 w-full"
                >
                  {isProcessing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="mr-2 h-4 w-4" />
                  )}
                  Adicionar aos Grupos Selecionados
                </Button>
              </div>
            )}
          </div>
        )}

        {!isSearching && contactGroups.length === 0 && searchPhone && (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Digite um número e clique em Buscar</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
