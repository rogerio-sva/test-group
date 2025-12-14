import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { MessageCard } from "@/components/messages/MessageCard";
import { MessageFormDialog } from "@/components/messages/MessageFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
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
import { Search, Calendar as CalendarIcon, Filter, Plus } from "lucide-react";
import { useMessageHistoryList } from "@/hooks/use-background-broadcast";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function Schedules() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "scheduled" | "sent" | "failed">("all");
  const [dateFilter, setDateFilter] = useState<Date>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: messageHistory = [], isLoading } = useMessageHistoryList();

  const scheduledMessages = messageHistory.filter(msg => msg.scheduled_at !== null);

  const filteredMessages = scheduledMessages.filter((msg) => {
    const matchesSearch = msg.title.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesStatus = true;
    if (statusFilter !== "all") {
      matchesStatus = msg.status === statusFilter;
    }

    let matchesDate = true;
    if (dateFilter) {
      const msgDate = new Date(msg.scheduled_at!);
      matchesDate =
        msgDate.getDate() === dateFilter.getDate() &&
        msgDate.getMonth() === dateFilter.getMonth() &&
        msgDate.getFullYear() === dateFilter.getFullYear();
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const messages = filteredMessages.map((msg) => ({
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

  const upcomingCount = messages.filter(m => m.status === "scheduled").length;
  const sentCount = messages.filter(m => m.status === "sent").length;
  const failedCount = messages.filter(m => m.status === "failed").length;

  return (
    <MainLayout
      title="Agendamentos"
      subtitle="Gerencie suas mensagens agendadas"
      action={
        <Button onClick={() => setIsDialogOpen(true)} variant="hero">
          <Plus className="mr-2 h-4 w-4" />
          Agendar Mensagem
        </Button>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl bg-card p-4 shadow-card border">
          <p className="text-sm text-muted-foreground">Agendadas</p>
          <p className="text-2xl font-bold text-primary mt-1">
            {isLoading ? <Skeleton className="h-8 w-12" /> : upcomingCount}
          </p>
        </div>
        <div className="rounded-xl bg-card p-4 shadow-card border">
          <p className="text-sm text-muted-foreground">Enviadas</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {isLoading ? <Skeleton className="h-8 w-12" /> : sentCount}
          </p>
        </div>
        <div className="rounded-xl bg-card p-4 shadow-card border">
          <p className="text-sm text-muted-foreground">Falhas</p>
          <p className="text-2xl font-bold text-destructive mt-1">
            {isLoading ? <Skeleton className="h-8 w-12" /> : failedCount}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar mensagens agendadas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="scheduled">Agendadas</SelectItem>
            <SelectItem value="sent">Enviadas</SelectItem>
            <SelectItem value="failed">Falharam</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full sm:w-[240px] justify-start text-left font-normal",
                !dateFilter && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFilter ? format(dateFilter, "dd/MM/yyyy", { locale: ptBR }) : "Filtrar por data"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={dateFilter}
              onSelect={setDateFilter}
              initialFocus
            />
            {dateFilter && (
              <div className="p-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateFilter(undefined)}
                  className="w-full"
                >
                  Limpar filtro
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Messages List */}
      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl bg-card p-6 shadow-card border">
              <Skeleton className="h-6 w-3/4 mb-4" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-4 w-full mb-4" />
            </div>
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-12 rounded-xl bg-card shadow-card border">
          <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {scheduledMessages.length === 0
              ? "Nenhuma mensagem agendada ainda."
              : "Nenhuma mensagem corresponde aos filtros."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {messages.map((msg) => (
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
      )}

      <MessageFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        defaultScheduled={true}
        title="Agendar Mensagem"
        description="Programe o envio da sua mensagem para uma data e hora específicas."
      />
    </MainLayout>
  );
}
