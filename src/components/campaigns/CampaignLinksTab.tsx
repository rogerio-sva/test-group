import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SmartLinkCard } from '@/components/smart-links/SmartLinkCard';
import { useSmartLinkAnalytics } from '@/hooks/use-smart-link-analytics';
import { Link2, Plus, Copy, ExternalLink, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface CampaignLinksTabProps {
  campaignId: string;
  onCreateLink: () => void;
}

export function CampaignLinksTab({ campaignId, onCreateLink }: CampaignLinksTabProps) {
  const { data: links, isLoading } = useSmartLinkAnalytics();

  const campaignLinks = links?.filter((link) => link.campaign_id === campaignId);

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}/link/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado para a área de transferência');
  };

  const handleOpenLink = (slug: string) => {
    window.open(`/link/${slug}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-foreground">Links Inteligentes</h3>
          <p className="text-sm text-muted-foreground">
            Rastreie e analise links inteligentes para esta campanha
          </p>
        </div>
        <Button onClick={onCreateLink}>
          <Plus className="mr-2 h-4 w-4" />
          Criar Link
        </Button>
      </div>

      {campaignLinks && campaignLinks.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaignLinks.map((link) => {
            const totalClicks = link.total_clicks || 0;
            const clicksToday = link.clicks_today || 0;

            return (
              <Card key={link.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-foreground">{link.name}</h4>
                      {link.is_active ? (
                        <Badge variant="default">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </div>
                    {link.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {link.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total de Cliques</span>
                    <span className="font-bold text-lg text-foreground">{totalClicks}</span>
                  </div>

                  {clicksToday > 0 && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <TrendingUp className="h-3 w-3" />
                      {clicksToday} cliques hoje
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Link2 className="h-3 w-3" />
                      <code className="flex-1 truncate">/link/{link.slug}</code>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleCopyLink(link.slug)}
                      >
                        <Copy className="mr-1 h-3 w-3" />
                        Copiar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleOpenLink(link.slug)}
                      >
                        <ExternalLink className="mr-1 h-3 w-3" />
                        Abrir
                      </Button>
                    </div>
                  </div>

                  {link.device_stats && (
                    <div className="pt-2 border-t space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Dispositivos</p>
                      <div className="flex gap-2 text-xs">
                        {link.device_stats.ios > 0 && (
                          <Badge variant="outline">iOS: {link.device_stats.ios}</Badge>
                        )}
                        {link.device_stats.android > 0 && (
                          <Badge variant="outline">Android: {link.device_stats.android}</Badge>
                        )}
                        {link.device_stats.desktop > 0 && (
                          <Badge variant="outline">Desktop: {link.device_stats.desktop}</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Link2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhum Link Inteligente Ainda</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Crie links inteligentes para rastrear cliques e rotacionar automaticamente convites de grupos.
            </p>
            <Button onClick={onCreateLink}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Seu Primeiro Link
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
