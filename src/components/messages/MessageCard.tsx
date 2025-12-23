import { Calendar, Clock, Users, Send, MoreVertical, Edit, Trash2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface MessageCardProps {
  id: string;
  title: string;
  message: string;
  scheduledAt?: Date | string | null;
  sentAt?: Date | string | null;
  targetGroups: number;
  status: "draft" | "scheduled" | "sent" | "failed" | "pending" | "processing";
  successfulSends?: number;
  failedSends?: number;
}

export function MessageCard({
  id,
  title,
  message,
  scheduledAt,
  sentAt,
  targetGroups,
  status,
  successfulSends,
  failedSends,
}: MessageCardProps) {
  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  };

  // Map database statuses to display statuses
  const displayStatus = status === "pending" || status === "processing" ? "scheduled" : status;

  return (
    <div className="rounded-xl bg-card p-5 shadow-card transition-all duration-300 hover:shadow-elevated animate-scale-in">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-card-foreground">{title}</h3>
            <Badge
              variant="secondary"
              className={cn(
                displayStatus === "draft" && "bg-muted text-muted-foreground",
                displayStatus === "scheduled" && "bg-accent text-accent-foreground",
                (status === "pending" || status === "processing") && "bg-yellow-500/10 text-yellow-600",
                displayStatus === "sent" && "bg-primary/10 text-primary",
                displayStatus === "failed" && "bg-destructive/10 text-destructive"
              )}
            >
              {status === "draft" && "Rascunho"}
              {status === "pending" && "Pendente"}
              {status === "processing" && "Enviando..."}
              {status === "scheduled" && "Agendado"}
              {status === "sent" && "Enviado"}
              {status === "failed" && "Falhou"}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
            {message}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="border-border hover:bg-accent">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {status === "draft" && (
              <DropdownMenuItem>
                <Play className="mr-2 h-4 w-4" />
                Enviar agora
              </DropdownMenuItem>
            )}
            <DropdownMenuItem>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4" />
          <span>{targetGroups} grupos</span>
        </div>
        {successfulSends !== undefined && successfulSends > 0 && (
          <div className="flex items-center gap-1.5 text-primary">
            <Send className="h-4 w-4" />
            <span>{successfulSends} enviados</span>
          </div>
        )}
        {failedSends !== undefined && failedSends > 0 && (
          <div className="flex items-center gap-1.5 text-destructive">
            <span>{failedSends} falhas</span>
          </div>
        )}
        {status === "scheduled" && scheduledAt && (
          <div className="flex items-center gap-1.5 text-accent-foreground">
            <Calendar className="h-4 w-4" />
            <span>Agendado para {formatDate(scheduledAt)}</span>
          </div>
        )}
        {status !== "scheduled" && scheduledAt && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(scheduledAt)}</span>
          </div>
        )}
        {sentAt && (
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>Enviado em {formatDate(sentAt)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
