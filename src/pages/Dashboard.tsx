import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { GroupCard } from "@/components/groups/GroupCard";
import { MessageCard } from "@/components/messages/MessageCard";
import { SendingRateMonitor } from "@/components/dashboard/SendingRateMonitor";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Link2, Send, Calendar, Plus, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useZAPIGroups } from "@/hooks/use-zapi";
import { useSmartLinks, useAllCampaignGroups } from "@/hooks/use-campaigns";
import { useMessageHistory } from "@/hooks/use-message-history";

export default function Dashboard() {
  const { data: zapiGroups = [], isLoading: isLoadingGroups } = useZAPIGroups();
  const { data: smartLinks = [], isLoading: isLoadingLinks } = useSmartLinks();
  const { data: allCampaignGroups = [] } = useAllCampaignGroups();
  const { data: messageHistory = [], isLoading: isLoadingMessages } = useMessageHistory();

  const whatsappGroups = zapiGroups.filter((g) => g.isGroup);
  const activeLinks = smartLinks.filter((l) => l.is_active);
  const totalMessagesSent = messageHistory.filter((m) => m.status === 'completed' || m.status === 'sent').reduce((acc, m) => acc + m.successful_sends, 0);
  const scheduledMessages = messageHistory.filter((m) => m.status === 'scheduled');

  const isLoading = isLoadingGroups || isLoadingLinks || isLoadingMessages;

  const stats = [
    {
      title: "Total de Grupos",
      value: whatsappGroups.length,
      change: `${allCampaignGroups.length} em campanhas`,
      changeType: "neutral" as const,
      icon: Users,
      tooltip: "Quantidade de grupos do WhatsApp sincronizados com o sistema. Inclui todos os grupos que voce participa.",
    },
    {
      title: "Links Ativos",
      value: activeLinks.length,
      change: `${smartLinks.length} total`,
      changeType: "neutral" as const,
      icon: Link2,
      tooltip: "Links inteligentes que estao ativos e redirecionando para grupos. Quando um grupo lota, o link direciona para o proximo.",
    },
    {
      title: "Mensagens Enviadas",
      value: totalMessagesSent.toLocaleString(),
      change: `${messageHistory.length} disparos`,
      changeType: "neutral" as const,
      icon: Send,
      tooltip: "Total de mensagens enviadas com sucesso para os grupos. Cada disparo pode enviar para multiplos grupos.",
    },
    {
      title: "Agendamentos",
      value: scheduledMessages.length,
      change: scheduledMessages.length > 0 ? "Pendentes" : "Nenhum",
      changeType: "neutral" as const,
      icon: Calendar,
      tooltip: "Mensagens programadas para envio futuro. O sistema envia automaticamente no horario agendado.",
    },
  ];

  // Get recent groups (max 3)
  const recentGroups = whatsappGroups.slice(0, 3).map((group) => ({
    id: group.phone,
    name: group.name || "Grupo sem nome",
    members: 0,
    maxMembers: 256,
    inviteLink: "",
    status: "active" as const,
  }));

  // Get recent messages (max 2)
  const recentMessages = messageHistory.slice(0, 2).map((msg) => ({
    id: msg.id,
    title: msg.title,
    message: msg.content,
    scheduledAt: msg.scheduled_at ? new Date(msg.scheduled_at) : undefined,
    sentAt: msg.sent_at ? new Date(msg.sent_at) : undefined,
    targetGroups: Array.isArray(msg.target_groups) ? msg.target_groups.length : 0,
    status: (msg.status === 'completed' ? 'sent' : msg.status) as 'scheduled' | 'sent' | 'failed',
  }));

  return (
    <MainLayout
      title="Dashboard"
      subtitle="Visão geral do seu sistema de WhatsApp"
    >
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </>
        ) : (
          stats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 flex flex-wrap gap-3">
        <Button variant="hero" size="lg" asChild>
          <Link to="/groups">
            <Plus className="mr-2 h-5 w-5" />
            Novo Grupo
          </Link>
        </Button>
        <Button variant="outline" size="lg" asChild>
          <Link to="/smart-links">
            <Link2 className="mr-2 h-5 w-5" />
            Criar Link Inteligente
          </Link>
        </Button>
        <Button variant="outline" size="lg" asChild>
          <Link to="/messages">
            <Send className="mr-2 h-5 w-5" />
            Novo Disparo
          </Link>
        </Button>
      </div>

      {/* Sending Rate Monitor */}
      <section className="mt-8">
        <SendingRateMonitor />
      </section>

      {/* Recent Groups */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Grupos Recentes
          </h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/groups">
              Ver todos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        {isLoadingGroups ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-xl" />
            ))}
          </div>
        ) : recentGroups.length === 0 ? (
          <div className="rounded-xl bg-card p-8 text-center shadow-card">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum grupo encontrado.</p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link to="/groups">Ver grupos</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentGroups.map((group) => (
              <GroupCard key={group.id} {...group} />
            ))}
          </div>
        )}
      </section>

      {/* Recent Messages */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Mensagens Recentes
          </h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/broadcast">
              Ver todas
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        {isLoadingMessages ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : recentMessages.length === 0 ? (
          <div className="rounded-xl bg-card p-8 text-center shadow-card">
            <Send className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma mensagem enviada ainda.</p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link to="/broadcast">Enviar mensagem</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {recentMessages.map((message) => (
              <MessageCard key={message.id} {...message} />
            ))}
          </div>
        )}
      </section>
    </MainLayout>
  );
}
