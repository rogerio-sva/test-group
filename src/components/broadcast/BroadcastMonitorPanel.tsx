import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBroadcastMonitor } from "@/hooks/use-broadcast-monitor";
import { Loader2, CheckCircle2, XCircle, Clock, AlertCircle, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const BroadcastMonitorPanel = () => {
  const { activeBatches, recentBatches, queueStats, isLoading, getBatchProgress } = useBroadcastMonitor();

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (activeBatches.length === 0 && recentBatches.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {queueStats && (queueStats.pending > 0 || queueStats.processing > 0 || queueStats.retriable > 0) && (
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Fila de Envios:</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Badge variant="secondary">{queueStats.pending} aguardando</Badge>
              </div>
              {queueStats.processing > 0 && (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <Badge variant="default">{queueStats.processing} processando</Badge>
                </div>
              )}
              {queueStats.retriable > 0 && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <Badge variant="outline" className="border-yellow-500">{queueStats.retriable} para retentar</Badge>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {activeBatches.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Broadcasts Ativos
          </h3>
          <div className="space-y-4">
            {activeBatches.map((batch) => {
              const progress = getBatchProgress(batch);
              return (
                <div key={batch.id} className="space-y-2 p-4 bg-secondary/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {batch.status === "processing" ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">{batch.batch_name}</span>
                      <Badge variant={batch.status === "processing" ? "default" : "secondary"}>
                        {batch.status === "processing" ? "processando" : batch.status === "pending" ? "aguardando" : batch.status}
                      </Badge>
                    </div>
                    <span className="text-sm font-medium text-primary">
                      {progress.percentage}%
                    </span>
                  </div>
                  <Progress value={progress.percentage} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      <span className="text-green-600 dark:text-green-400 font-medium">{batch.sent_count} enviados</span>
                      {batch.failed_count > 0 && (
                        <>, <span className="text-red-600 dark:text-red-400 font-medium">{batch.failed_count} falhados</span></>
                      )}
                      <> de {batch.total_messages} total</>
                    </span>
                    {batch.started_at && (
                      <span>
                        Iniciado {formatDistanceToNow(new Date(batch.started_at), { addSuffix: true, locale: ptBR })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {recentBatches.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Broadcasts Recentes
          </h3>
          <div className="space-y-3">
            {recentBatches.map((batch) => (
              <div key={batch.id} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  {batch.status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  )}
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-medium truncate">{batch.batch_name}</span>
                    <span className="text-xs text-muted-foreground">
                      <span className="text-green-600 dark:text-green-400">{batch.sent_count} enviados</span>
                      {batch.failed_count > 0 && (
                        <>, <span className="text-red-600 dark:text-red-400">{batch.failed_count} falhados</span></>
                      )}
                    </span>
                  </div>
                </div>
                {batch.completed_at && (
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                    {formatDistanceToNow(new Date(batch.completed_at), { addSuffix: true, locale: ptBR })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
