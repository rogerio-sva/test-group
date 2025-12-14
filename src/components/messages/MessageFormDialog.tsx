import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
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
import { GroupSelector } from "@/components/groups/GroupSelector";
import { PollBuilder } from "@/components/messages/PollBuilder";
import { Loader2, Image, Video, Music, FileText, Type, Upload, X, Calendar as CalendarIcon, Clock, ListChecks, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useZAPIGroups } from "@/hooks/use-zapi";
import { useStartBackgroundBroadcast } from "@/hooks/use-background-broadcast";
import { useMediaUpload } from "@/hooks/use-media-upload";
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

interface MessageFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultScheduled?: boolean;
  preSelectedGroups?: string[];
  campaignId?: string;
  title?: string;
  description?: string;
}

export function MessageFormDialog({
  open,
  onOpenChange,
  defaultScheduled = false,
  preSelectedGroups = [],
  campaignId,
  title = "Nova Mensagem",
  description = "Crie uma mensagem para enviar para os grupos selecionados.",
}: MessageFormDialogProps) {
  const { toast } = useToast();
  const [messageType, setMessageType] = useState<MessageType>("text");
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mentionsEveryOne, setMentionsEveryOne] = useState(false);
  const [isScheduled, setIsScheduled] = useState(defaultScheduled);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("12:00");
  const [newMessage, setNewMessage] = useState({
    title: "",
    message: "",
    mediaUrl: "",
    fileName: "",
    selectedGroups: preSelectedGroups,
  });

  const [pollData, setPollData] = useState({
    name: "",
    options: [] as string[],
    multipleAnswers: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: zapiGroups = [], isLoading: isLoadingGroups, refetch } = useZAPIGroups();
  const startBroadcast = useStartBackgroundBroadcast();
  const { uploadFile, isUploading } = useMediaUpload();

  const isSending = startBroadcast.isPending;

  const availableGroups = zapiGroups
    .filter((g) => g.isGroup)
    .map((g) => ({
      id: g.phone,
      name: g.name || "Grupo sem nome",
      phone: g.phone,
    }));

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (messageType === "image" || messageType === "video") {
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setMediaPreview(null);
    }

    setNewMessage((prev) => ({ ...prev, fileName: file.name }));

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
      selectedGroups: preSelectedGroups,
    });
    setMessageType("text");
    setMediaPreview(null);
    setMentionsEveryOne(false);
    setIsScheduled(defaultScheduled);
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
        scheduledAt: scheduledAt.toISOString(),
        campaignId
      }, {
        onSuccess: () => {
          toast({
            title: "Mensagem agendada",
            description: `Será enviada em ${format(scheduledAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.`,
          });
          resetForm();
          onOpenChange(false);
        }
      });
      return;
    }

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
      campaignId
    }, {
      onSuccess: () => {
        toast({
          title: "Mensagem enviada",
          description: "Sua mensagem está sendo processada e será enviada em breve.",
        });
        resetForm();
        onOpenChange(false);
      }
    });
  };

  const TypeIcon = messageTypeConfig[messageType].icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
          <Card className="border-2">
            <CardContent className="pt-4 space-y-4">
              <div className="grid gap-2">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Tipo de Mensagem
                </Label>
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
                <Label htmlFor="title" className="text-base font-semibold">Título da Mensagem</Label>
                <Input
                  id="title"
                  placeholder="Ex: Promoção Especial"
                  value={newMessage.title}
                  onChange={(e) =>
                    setNewMessage({ ...newMessage, title: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {messageType === "text" ? (
            <Card className="border-2">
              <CardContent className="pt-4">
                <div className="grid gap-2">
                  <Label htmlFor="message" className="text-base font-semibold">Mensagem</Label>
                  <Textarea
                    id="message"
                    placeholder="Digite sua mensagem aqui..."
                    rows={4}
                    value={newMessage.message}
                    onChange={(e) =>
                      setNewMessage({ ...newMessage, message: e.target.value })
                    }
                  />
                  <p className="text-xs text-foreground/80 leading-relaxed">
                    💡 Você pode usar emojis e formatação do WhatsApp (*negrito*, _itálico_)
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : messageType === "poll" ? (
            <Card className="border-2">
              <CardContent className="pt-4">
                <PollBuilder
                  onPollChange={(poll) => setPollData(poll)}
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2">
              <CardContent className="pt-4 space-y-4">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload de {messageTypeConfig[messageType].label}
                </Label>
                <div className="grid gap-3">
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
                          className="w-full h-40 object-cover rounded-lg border-2"
                        />
                      ) : (
                        <video
                          src={mediaPreview}
                          controls
                          className="w-full h-40 object-cover rounded-lg border-2"
                        />
                      )}
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7"
                        onClick={clearMedia}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : newMessage.fileName ? (
                    <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg border-2">
                      <TypeIcon className="h-5 w-5" />
                      <span className="flex-1 truncate text-sm font-medium">{newMessage.fileName}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={clearMedia}
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
                      {isUploading ? "Enviando..." : `Fazer upload`}
                    </Button>
                  )}

                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-foreground/70 font-medium">ou informe a URL</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <Input
                    value={newMessage.mediaUrl}
                    onChange={(e) => setNewMessage({ ...newMessage, mediaUrl: e.target.value })}
                    placeholder={`URL do ${messageTypeConfig[messageType].label.toLowerCase()}`}
                  />
                </div>

                {(messageType === "image" || messageType === "video") && (
                  <div className="grid gap-2">
                    <Label htmlFor="caption" className="font-semibold">Legenda (opcional)</Label>
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

                {messageType === "document" && (
                  <div className="grid gap-2">
                    <Label htmlFor="fileName" className="font-semibold">Nome do Arquivo</Label>
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
              </CardContent>
            </Card>
          )}

          {messageType !== "poll" && (
            <Card className="border-2 bg-muted/30">
              <CardContent className="pt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="mentionsEveryOne"
                    checked={mentionsEveryOne}
                    onCheckedChange={(checked) => setMentionsEveryOne(checked === true)}
                  />
                  <Label
                    htmlFor="mentionsEveryOne"
                    className="text-sm cursor-pointer flex-1 font-medium"
                  >
                    Mencionar todos (@all) no grupo
                  </Label>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-2 bg-accent/20">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  <Label htmlFor="schedule" className="cursor-pointer font-semibold text-base">
                    Agendar para depois
                  </Label>
                </div>
                <Switch
                  id="schedule"
                  checked={isScheduled}
                  onCheckedChange={setIsScheduled}
                />
              </div>
            </CardContent>
          </Card>

          {isScheduled && (
            <Card className="border-2 bg-secondary/30">
              <CardContent className="pt-4 space-y-3">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Data e Hora
                </Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="secondary"
                        className={cn(
                          "flex-1 justify-start text-left font-medium",
                          !selectedDate && "text-foreground/60"
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
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
                    <Input
                      type="time"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="pl-10 w-32 font-medium"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-2">
            <CardContent className="pt-4 space-y-3">
              <Label className="text-base font-semibold">Grupos de Destino</Label>
              <GroupSelector
                groups={availableGroups}
                selectedGroups={newMessage.selectedGroups}
                onSelectionChange={(selected) =>
                  setNewMessage({ ...newMessage, selectedGroups: selected })
                }
                isLoading={isLoadingGroups}
                onRefresh={() => refetch()}
                maxHeight="200px"
              />
            </CardContent>
          </Card>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
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
  );
}
