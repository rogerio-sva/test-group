import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCampaignClickStats } from '@/hooks/use-campaign-clicks';
import { MousePointerClick, TrendingUp, Calendar, Trophy } from 'lucide-react';

interface CampaignClicksDashboardProps {
  campaignId: string;
}

export function CampaignClicksDashboard({ campaignId }: CampaignClicksDashboardProps) {
  const { data: stats, isLoading } = useCampaignClickStats(campaignId);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6 mb-6">
      <div>
        <h3 className="text-lg font-medium text-foreground mb-1">Performance dos Links</h3>
        <p className="text-sm text-muted-foreground">
          Análise de cliques nos links inteligentes desta campanha
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2 text-xs">
              <MousePointerClick className="h-4 w-4" />
              Total de Cliques
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {stats.total_clicks.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2 text-xs">
              <Calendar className="h-4 w-4" />
              Cliques Hoje
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats.clicks_today.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2 text-xs">
              <TrendingUp className="h-4 w-4" />
              Últimos 7 Dias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {stats.clicks_last_7_days.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {stats.top_groups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Top 5 Grupos Mais Acessados
            </CardTitle>
            <CardDescription>
              Grupos que receberam mais cliques através dos links inteligentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.top_groups.map((group, index) => (
                <div
                  key={group.group_phone}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={index === 0 ? 'default' : 'secondary'} className="w-8 h-8 flex items-center justify-center">
                      {index + 1}
                    </Badge>
                    <div>
                      <p className="font-medium text-foreground">{group.group_name}</p>
                      <p className="text-xs text-muted-foreground">{group.group_phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-foreground">
                      {group.click_count}
                    </p>
                    <p className="text-xs text-muted-foreground">cliques</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
