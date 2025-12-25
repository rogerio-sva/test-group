import { useState, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { ActiveBroadcastsPanel } from "@/components/broadcast/ActiveBroadcastsPanel";
import { MessageCard } from "@/components/messages/MessageCard";
import { GroupSelector } from "@/components/groups/GroupSelector";
import { PollBuilder } from "@/components/messages/PollBuilder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Search, Send, Loader2, Image, Video, Music, FileText, Type, Upload, X, Calendar as CalendarIcon, Clock, ListChecks, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InfoTooltip, LabelWithTooltip } from "@/components/ui/info-tooltip";
import { useZAPIGroups } from "@/hooks/use-zapi";
import { useStartBackgroundBroadcast, useMessageHistoryList, useActiveBroadcasts } from "@/hooks/use-background-broadcast";
import { useMediaUpload } from "@/hooks/use-media-upload";
import { useGroupMetadata } from "@/hooks/use-group-metadata";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type MessageType = "text" | "image" | "video" | "audio" | "document" | "poll";

const messageTypeConfig = {
  text: { label: "Texto", icon: Type, accept: "" },
  image: { label: "Imagem", icon: Image, accept: "image/*" },
  video: { label: "Vídeo", icon: Video, accept: "video/*" },
  audio: { label: "Áudio", icon: Music, accept: "audio/*" },
  document: { label: "Documento", icon: FileText, accept: "*" },
  poll: { label: "Enquete", icon: ListChecks, accept: "" },
};

export default function Messages() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [messageType, setMessageType] = useState<MessageType>("text");
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mentionsEveryOne, setMentionsEveryOne] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("12:00");
  const [newMessage, setNewMessage] = useState({
    title: "",
    message: "",
    mediaUrl: "",
    fileName: "",
    selectedGroups: [] as string[],
  });

  const [pollData, setPollData] = useState({
    name: "",
    options: [] as string[],
    multipleAnswers: false,
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: zapiGroups = [], isLoading: isLoadingGroups, refetch } = useZAPIGroups();
  const startBroadcast = useStartBackgroundBroadcast();
  const { data: messageHistory = [] } = useMessageHistoryList();
  const { data: activeBroadcasts = [] } = useActiveBroadcasts();
  const { uploadFile, isUploading } = useMediaUpload();
  const {
    groups: metadataGroups,
    syncGroups,
    isSyncing,
    syncStatus
  } = useGroupMetadata();

  const isSending = startBroadcast.isPending;

  const availableGroups = zapiGroups
    .filter((g) => g.isGroup)
    .map((g) => {
      const metadata = metadataGroups.find((m) => m.group_id === g.phone);
      return {
        id: g.phone,
        name: g.name || "Grupo sem nome",
        phone: g.phone,
        participant_count: metadata?.participant_count,
        is_admin: metadata?.is_admin,
      };
    });

  // Map messageHistory to display format
  const messages = messageHistory.map((msg) => ({
    id: msg.id,
    title: msg.title,
    message: msg.content,
    status: msg.status as "pending" | "processing" | "sent" | "failed" | "scheduled",
    targetGroups: Array.isArray(msg.target_groups) ? msg.target_groups.length : 0,
    sentAt: msg.sent_at,
    scheduledAt: msg.scheduled_at,
    successfulSends: msg.successful_sends,
    failedSends: msg.failed_sends,
  }));

  const filterByStatus = (status: string) => {
    if (status === "all") return messages;
    if (status === "pending") return messages.filter((m) => m.status === "pending" || m.status === "processing");
    if (status === "scheduled") return messages.filter((m) => m.status === "scheduled");
    if (status === "failed") return messages.filter((m) => m.status === "failed");
    return messages.filter((m) => m.status === status);
  };

  const filteredMessages = messages.filter((msg) =>
    msg.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview para imagens e vídeos
    if (messageType === "image" || messageType === "video") {
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setMediaPreview(null);
    }

    // Define o nome do arquivo
    setNewMessage((prev) => ({ ...prev, fileName: file.name }));

    // Upload
    const folder = messageType === "image" ? "images" : 
                   messageType === "video" ? "videos" :
                   messageType === "audio" ? "audios" : "documents";
    
    const result = await uploadFile(file, folder);
    if (result) {
      setNewMessage((prev) => ({ ...prev, mediaUrl: result.url }));
    }
  };

  const clearMedia = () => {
    setMediaPreview(null);
    setNewMessage((prev) => ({ ...prev, mediaUrl: "", fileName: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resetForm = () => {
    setNewMessage({
      title: "",
      message: "",
      mediaUrl: "",
      fileName: "",
      selectedGroups: [],
    });
    setMessageType("text");
    setMediaPreview(null);
    setMentionsEveryOne(false);
    setIsScheduled(false);
    setSelectedDate(undefined);
    setSelectedTime("12:00");
    setPollData({
      name: "",
      options: [],
      multipleAnswers: false,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCreateMessage = async () => {
    if (!newMessage.title || newMessage.selectedGroups.length === 0) {
      toast({
        title: "Erro",
        description: "Preencha o título e selecione pelo menos um grupo.",
        variant: "destructive",
      });
      return;
    }

    const selectedGroupsWithMetadata = availableGroups.filter(g =>
      newMessage.selectedGroups.includes(g.phone)
    );

    const groupsWithFewMembers = selectedGroupsWithMetadata.filter(g =>
      g.participant_count !== undefined && g.participant_count < 5
    );

    if (groupsWithFewMembers.length > 0) {
      const confirmSend = window.confirm(
        `Atenção: ${groupsWithFewMembers.length} grupo(s) tem menos de 5 membros. Deseja continuar mesmo assim?`
      );
      if (!confirmSend) return;
    }

    if (newMessage.selectedGroups.length > 10) {
      const confirmSend = window.confirm(
        `Você está prestes a enviar para ${newMessage.selectedGroups.length} grupos. Deseja continuar?`
      );
      if (!confirmSend) return;
    }

    // Validação específica por tipo
    if (messageType === "text" && !newMessage.message) {
      toast({
        title: "Erro",
        description: "Digite a mensagem de texto.",
        variant: "destructive",
      });
      return;
    }

    if (messageType === "poll") {
      if (!pollData.name || pollData.options.length < 2) {
        toast({
          title: "Erro",
          description: "Preencha a pergunta e pelo menos 2 opções para a enquete.",
          variant: "destructive",
        });
        return;
      }
    }

    if (messageType !== "text" && messageType !== "poll" && !newMessage.mediaUrl) {
      toast({
        title: "Erro",
        description: "Faça upload ou informe a URL do arquivo.",
        variant: "destructive",
      });
      return;
    }

    // Validação de agendamento
    if (isScheduled) {
      if (!selectedDate) {
        toast({
          title: "Erro",
          description: "Selecione a data para o agendamento.",
          variant: "destructive",
        });
        return;
      }

      const [hours, minutes] = selectedTime.split(":").map(Number);
      const scheduledAt = new Date(selectedDate);
      scheduledAt.setHours(hours, minutes, 0, 0);

      if (scheduledAt <= new Date()) {
        toast({
          title: "Erro",
          description: "A data de agendamento deve ser no futuro.",
          variant: "destructive",
        });
        return;
      }

      // Salvar mensagem agendada no banco
      const groups = newMessage.selectedGroups.map(phone => {
        const group = availableGroups.find(g => g.phone === phone);
        return {
          phone,
          name: group?.name || "Grupo"
        };
      });

      startBroadcast.mutate({
        title: newMessage.title,
        content: newMessage.message || newMessage.fileName || "Mídia",
        messageType,
        mediaUrl: messageType !== "text" ? newMessage.mediaUrl : undefined,
        groups,
        delayBetween: 5000,
        mentionsEveryOne,
        scheduledAt: scheduledAt.toISOString()
      }, {
        onSuccess: () => {
          toast({
            title: "Mensagem agendada",
            description: `Será enviada em ${format(scheduledAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.`,
          });
          resetForm();
          setIsDialogOpen(false);
        }
      });
      return;
    }

    // Envio imediato
    const groups = newMessage.selectedGroups.map(phone => {
      const group = availableGroups.find(g => g.phone === phone);
      return {
        phone,
        name: group?.name || "Grupo"
      };
    });

    startBroadcast.mutate({
      title: newMessage.title,
      content: newMessage.message || newMessage.fileName || "Mídia",
      messageType,
      mediaUrl: messageType !== "text" ? newMessage.mediaUrl : undefined,
      groups,
      delayBetween: 5000, // 5 segundos entre mensagens
      mentionsEveryOne
    }, {
      onSuccess: () => {
        resetForm();
        setIsDialogOpen(false);
      }
    });
  };

  const TypeIcon = messageTypeConfig[messageType].icon;

  return (
    <MainLayout
      title="Mensagens"
      subtitle="Envie mensagens para múltiplos grupos via Z-API"
    >
      {/* Active Broadcasts Progress */}
      <ActiveBroadcastsPanel />

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar mensagens..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="hero">
              <Plus className="mr-2 h-4 w-4" />
              Nova Mensagem
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Nova Mensagem</DialogTitle>
              <DialogDescription>
                Crie uma mensagem para enviar para os grupos selecionados.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
              {/* Tipo de mensagem */}
              <div className="grid gap-2">
                <LabelWithTooltip
                  label="Tipo de Mensagem"
                  tooltip="Escolha o formato da mensagem. Texto e simples, enquete cria uma votacao, e os demais permitem enviar arquivos de midia."
                />
                <Select value={messageType} onValueChange={(v) => { setMessageType(v as MessageType); clearMedia(); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(messageTypeConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <config.icon className="h-4 w-4" />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <LabelWithTooltip
                  htmlFor="title"
                  label="Titulo da Mensagem"
                  tooltip="Nome interno para identificar esta mensagem no historico. Nao e enviado para os grupos."
                  required
                />
                <Input
                  id="title"
                  placeholder="Ex: Promocao Especial"
                  value={newMessage.title}
                  onChange={(e) =>
                    setNewMessage({ ...newMessage, title: e.target.value })
                  }
                />
              </div>

              {/* Campos condicionais baseados no tipo */}
              {messageType === "text" ? (
                <div className="grid gap-2">
                  <Label htmlFor="message" className="font-medium">Mensagem</Label>
                  <Textarea
                    id="message"
                    placeholder="Digite sua mensagem aqui..."
                    rows={4}
                    value={newMessage.message}
                    onChange={(e) =>
                      setNewMessage({ ...newMessage, message: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Você pode usar emojis e formatação do WhatsApp (*negrito*, _itálico_)
                  </p>
                </div>
              ) : messageType === "poll" ? (
                <PollBuilder
                  onPollChange={(poll) => setPollData(poll)}
                />
              ) : (
                <>
                  {/* Upload de mídia */}
                  <div className="grid gap-2">
                    <Label className="font-medium">Upload de {messageTypeConfig[messageType].label}</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={messageTypeConfig[messageType].accept}
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    
                    {mediaPreview && (messageType === "image" || messageType === "video") ? (
                      <div className="relative">
                        {messageType === "image" ? (
                          <img 
                            src={mediaPreview} 
                            alt="Preview" 
                            className="w-full h-40 object-cover rounded-lg"
                          />
                        ) : (
                          <video 
                            src={mediaPreview} 
                            controls
                            className="w-full h-40 object-cover rounded-lg"
                          />
                        )}
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6"
                          onClick={clearMedia}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : newMessage.fileName ? (
                      <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg">
                        <TypeIcon className="h-5 w-5 text-muted-foreground" />
                        <span className="flex-1 truncate text-sm">{newMessage.fileName}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={clearMedia}
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
                      >
                        {isUploading ? (
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                          <Upload className="mr-2 h-5 w-5" />
                        )}
                        {isUploading ? "Enviando..." : `Fazer upload`}
                      </Button>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">ou informe a URL:</span>
                    </div>

                    <Input
                      value={newMessage.mediaUrl}
                      onChange={(e) => setNewMessage({ ...newMessage, mediaUrl: e.target.value })}
                      placeholder={`URL do ${messageTypeConfig[messageType].label.toLowerCase()}`}
                    />
                  </div>

                  {/* Caption para imagem/vídeo */}
                  {(messageType === "image" || messageType === "video") && (
                    <div className="grid gap-2">
                      <Label htmlFor="caption" className="font-medium">Legenda <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                      <Textarea
                        id="caption"
                        placeholder="Adicione uma legenda..."
                        rows={2}
                        value={newMessage.message}
                        onChange={(e) =>
                          setNewMessage({ ...newMessage, message: e.target.value })
                        }
                      />
                    </div>
                  )}

                  {/* Nome do arquivo para documento */}
                  {messageType === "document" && (
                    <div className="grid gap-2">
                      <Label htmlFor="fileName" className="font-medium">Nome do Arquivo</Label>
                      <Input
                        id="fileName"
                        placeholder="documento.pdf"
                        value={newMessage.fileName}
                        onChange={(e) =>
                          setNewMessage({ ...newMessage, fileName: e.target.value })
                        }
                      />
                    </div>
                  )}
                </>
              )}

              {/* Mencionar todos (nao disponivel para polls) */}
              {messageType !== "poll" && (
                <div className="flex items-center space-x-2 py-2 px-3 bg-muted/50 rounded-lg">
                  <Checkbox
                    id="mentionsEveryOne"
                    checked={mentionsEveryOne}
                    onCheckedChange={(checked) => setMentionsEveryOne(checked === true)}
                  />
                  <Label
                    htmlFor="mentionsEveryOne"
                    className="text-sm cursor-pointer flex-1"
                  >
                    Mencionar todos (@all) no grupo
                  </Label>
                  <InfoTooltip content="Notifica todos os membros do grupo, similar ao @all. Use com moderacao para evitar ser marcado como spam." />
                </div>
              )}

              {/* Opcao de Agendamento */}
              <div className="flex items-center justify-between py-3 px-3 bg-accent/30 rounded-lg border border-accent/50">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="schedule" className="cursor-pointer">
                    Agendar para depois
                  </Label>
                  <InfoTooltip content="Programa o envio para uma data e hora futura. O sistema envia automaticamente no horario definido." />
                </div>
                <Switch
                  id="schedule"
                  checked={isScheduled}
                  onCheckedChange={setIsScheduled}
                />
              </div>

              {/* Campos de agendamento */}
              {isScheduled && (
                <div className="grid gap-2 p-3 bg-secondary/30 rounded-lg border">
                  <Label className="font-medium">Data e Hora</Label>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="secondary"
                          className={cn(
                            "flex-1 justify-start text-left font-normal",
                            !selectedDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate
                            ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR })
                            : "Selecione a data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="time"
                        value={selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value)}
                        className="pl-10 w-32"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Selecao de grupos */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <LabelWithTooltip
                    label="Grupos de Destino"
                    tooltip="Selecione os grupos que receberao esta mensagem. O envio e feito com intervalo de 5 segundos entre cada grupo."
                    required
                  />
                  {syncStatus && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => syncGroups()}
                      disabled={isSyncing}
                      className="text-xs"
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? "Sincronizando..." : "Atualizar metadados"}
                    </Button>
                  )}
                </div>
                {syncStatus && syncStatus.last_sync_at && (
                  <p className="text-xs text-muted-foreground">
                    Última sincronização: {format(new Date(syncStatus.last_sync_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                )}
                <GroupSelector
                  groups={availableGroups}
                  selectedGroups={newMessage.selectedGroups}
                  onSelectionChange={(selected) =>
                    setNewMessage({ ...newMessage, selectedGroups: selected })
                  }
                  isLoading={isLoadingGroups || isSyncing}
                  onRefresh={() => refetch()}
                  maxHeight="200px"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                variant="hero" 
                onClick={handleCreateMessage}
                disabled={isSending}
              >
                {isSending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isScheduled ? (
                  <CalendarIcon className="mr-2 h-4 w-4" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {isSending ? "Enviando..." : isScheduled ? "Agendar" : "Enviar Agora"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="mb-6">
        <TabsList>
          <TabsTrigger value="all">
            Todas ({messages.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Processando ({filterByStatus("pending").length})
          </TabsTrigger>
          <TabsTrigger value="sent">
            Enviadas ({filterByStatus("sent").length})
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            Agendadas ({filterByStatus("scheduled").length})
          </TabsTrigger>
          <TabsTrigger value="failed">
            Falhas ({filterByStatus("failed").length})
          </TabsTrigger>
        </TabsList>

        {["all", "pending", "sent", "scheduled", "failed"].map((status) => (
          <TabsContent key={status} value={status} className="mt-4">
            <div className="grid gap-4">
              {filterByStatus(status)
                .filter((msg) =>
                  msg.title.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((msg) => (
                  <MessageCard
                    key={msg.id}
                    id={msg.id}
                    title={msg.title}
                    message={msg.message}
                    status={msg.status}
                    targetGroups={msg.targetGroups}
                    sentAt={msg.sentAt}
                    scheduledAt={msg.scheduledAt}
                    successfulSends={msg.successfulSends}
                    failedSends={msg.failedSends}
                  />
                ))}
            </div>
            {filterByStatus(status).length === 0 && (
              <div className="text-center py-12">
                <Send className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">
                  {status === "all"
                    ? "Nenhuma mensagem enviada ainda."
                    : `Nenhuma mensagem ${status === "pending" ? "em processamento" : status === "sent" ? "enviada" : status === "scheduled" ? "agendada" : "com falha"}.`}
                </p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </MainLayout>
  );
}
