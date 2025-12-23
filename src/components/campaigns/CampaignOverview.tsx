import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/dashboard/StatCard';
import { useCampaignActivity } from '@/hooks/use-campaign-activity';
import { Users, MessageSquare, Link2, Send, TrendingUp, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { getActivityLabel } from '@/hooks/use-campaign-activity';

interface CampaignOverviewProps {
  campaignId: string;
  stats: {
    total_contacts: number;
    total_groups: number;
    total_smart_links: number;
    messages_sent_week: number;
    total_messages_sent: number;
  };
  onSendMessage: () => void;
  onAddContacts: () => void;
  onCreateLink: () => void;
}

export function CampaignOverview({
  campaignId,
  stats,
  onSendMessage,
  onAddContacts,
  onCreateLink,
}: CampaignOverviewProps) {
  const { data: activities, isLoading: isLoadingActivities } = useCampaignActivity(campaignId, 10);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Contatos"
          value={stats.total_contacts}
          icon={Users}
          description="Contatos ativos na campanha"
        />
        <StatCard
          title="Grupos"
          value={stats.total_groups}
          icon={MessageSquare}
          description="Grupos do WhatsApp vinculados"
        />
        <StatCard
          title="Links Inteligentes"
          value={stats.total_smart_links}
          icon={Link2}
          description="Links de rastreamento criados"
        />
        <StatCard
          title="Mensagens Esta Semana"
          value={stats.messages_sent_week}
          icon={Send}
          description={`${stats.total_messages_sent} enviadas no total`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>Execute tarefas comuns para esta campanha</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Button onClick={onSendMessage} size="lg" className="w-full">
              <Send className="mr-2 h-4 w-4" />
              Enviar Mensagem
            </Button>
            <Button onClick={onAddContacts} variant="outline" size="lg" className="w-full">
              <Users className="mr-2 h-4 w-4" />
              Adicionar Contatos
            </Button>
            <Button onClick={onCreateLink} variant="outline" size="lg" className="w-full">
              <Link2 className="mr-2 h-4 w-4" />
              Criar Link
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Atividade Recente
          </CardTitle>
          <CardDescription>Últimas ações realizadas nesta campanha</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingActivities ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : activities && activities.length > 0 ? (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start justify-between border-b pb-3 last:border-0"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{getActivityLabel(activity.action_type)}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(activity.performed_at), 'PPp')}
                    </p>
                  </div>
                  {activity.action_data?.count && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <TrendingUp className="h-4 w-4" />
                      {activity.action_data.count}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-8">
              Nenhuma atividade recente. Comece adicionando contatos ou enviando mensagens.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
