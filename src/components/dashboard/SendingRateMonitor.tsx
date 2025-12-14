import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Activity, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useCheckRateLimitStatus, useSendingMetrics } from "@/hooks/use-sending-metrics";
import { Skeleton } from "@/components/ui/skeleton";

export function SendingRateMonitor() {
  const { data: metrics, isLoading: metricsLoading } = useSendingMetrics("hour", 12);
  const rateLimitStatus = useCheckRateLimitStatus();

  if (metricsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monitor de Taxa de Envio</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const totalSent = metrics?.reduce((sum, m) => sum + m.messages_sent, 0) || 0;
  const totalFailed = metrics?.reduce((sum, m) => sum + m.messages_failed, 0) || 0;
  const successRate = totalSent > 0 ? ((totalSent / (totalSent + totalFailed)) * 100).toFixed(1) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Monitor de Taxa de Envio
            </CardTitle>
            <CardDescription>Últimas 12 horas de atividade</CardDescription>
          </div>
          {rateLimitStatus.isAtLimit ? (
            <Badge variant="destructive">Limite Atingido</Badge>
          ) : rateLimitStatus.isNearLimit ? (
            <Badge variant="secondary" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Próximo ao Limite
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Normal
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {rateLimitStatus.isAtLimit && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Você atingiu o limite de envio. Aguarde alguns minutos antes de enviar mais
              mensagens.
            </AlertDescription>
          </Alert>
        )}

        {rateLimitStatus.isNearLimit && !rateLimitStatus.isAtLimit && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Você está próximo ao limite de envio. Reduza a velocidade dos envios.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Mensagens Enviadas</p>
            <p className="text-2xl font-bold">{totalSent}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Mensagens Falhadas</p>
            <p className="text-2xl font-bold text-destructive">{totalFailed}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
            <p className="text-2xl font-bold flex items-center gap-1">
              {successRate}%
              <TrendingUp className="h-4 w-4 text-green-500" />
            </p>
          </div>
        </div>

        {rateLimitStatus.limits && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Limites de Taxa</p>
            {rateLimitStatus.limits.map((limit) => {
              const percentage = rateLimitStatus.percentages[limit.limit_type] || 0;
              const current =
                limit.limit_type === "per_minute"
                  ? rateLimitStatus.currentRate?.perMinute || 0
                  : limit.limit_type === "per_hour"
                  ? rateLimitStatus.currentRate?.perHour || 0
                  : limit.current_count;

              const label =
                limit.limit_type === "per_minute"
                  ? "Por Minuto"
                  : limit.limit_type === "per_hour"
                  ? "Por Hora"
                  : "Por Dia";

              return (
                <div key={limit.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">
                      {current} / {limit.limit_value}
                    </span>
                  </div>
                  <Progress
                    value={percentage}
                    className={percentage >= 80 ? "bg-destructive/20" : ""}
                  />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
