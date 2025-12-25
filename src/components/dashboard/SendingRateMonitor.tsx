import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, TrendingUp, CheckCircle2 } from "lucide-react";
import { useSendingMetrics } from "@/hooks/use-sending-metrics";
import { Skeleton } from "@/components/ui/skeleton";

export function SendingRateMonitor() {
  const { data: metrics, isLoading: metricsLoading } = useSendingMetrics("hour", 12);

  if (metricsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monitor de Envio de Mensagens</CardTitle>
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
              Monitor de Envio de Mensagens
            </CardTitle>
            <CardDescription>Últimas 12 horas de atividade</CardDescription>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Ativo
          </div>
        </div>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
