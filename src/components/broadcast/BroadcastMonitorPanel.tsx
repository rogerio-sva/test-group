import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useBroadcastMonitor } from "@/hooks/use-broadcast-monitor";
import { Loader2, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Queue:</span>
              <Badge variant="secondary">{queueStats.pending} pending</Badge>
            </div>
            {queueStats.processing > 0 && (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <Badge variant="default">{queueStats.processing} processing</Badge>
              </div>
            )}
            {queueStats.retriable > 0 && (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <Badge variant="outline">{queueStats.retriable} to retry</Badge>
              </div>
            )}
          </div>
        </Card>
      )}

      {activeBatches.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Active Broadcasts</h3>
          <div className="space-y-4">
            {activeBatches.map((batch) => {
              const progress = getBatchProgress(batch);
              return (
                <div key={batch.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {batch.status === "processing" ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">{batch.batch_name}</span>
                      <Badge variant={batch.status === "processing" ? "default" : "secondary"}>
                        {batch.status}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {progress.completed} / {progress.total}
                    </span>
                  </div>
                  <Progress value={progress.percentage} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {batch.sent_count} sent, {batch.failed_count} failed
                    </span>
                    {batch.started_at && (
                      <span>
                        Started {formatDistanceToNow(new Date(batch.started_at), { addSuffix: true })}
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
          <h3 className="text-lg font-semibold mb-4">Recent Broadcasts</h3>
          <div className="space-y-3">
            {recentBatches.map((batch) => (
              <div key={batch.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {batch.status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm font-medium">{batch.batch_name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {batch.sent_count} sent, {batch.failed_count} failed
                  </span>
                  {batch.completed_at && (
                    <span>
                      {formatDistanceToNow(new Date(batch.completed_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
