import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useActiveBroadcasts, useBroadcastProgress } from "@/hooks/use-background-broadcast";

interface BroadcastProgressProps {
  messageHistoryId: string;
}

function BroadcastProgressItem({ messageHistoryId }: BroadcastProgressProps) {
  const progress = useBroadcastProgress(messageHistoryId);

  if (!progress) return null;

  const total = (progress.target_groups as Array<unknown>)?.length || 0;
  const sent = progress.successful_sends + progress.failed_sends;
  const percentage = total > 0 ? Math.round((sent / total) * 100) : 0;

  const statusConfig = {
    pending: { label: "Aguardando", icon: Clock, color: "bg-yellow-500" },
    processing: { label: "Enviando", icon: Loader2, color: "bg-blue-500" },
    sent: { label: "Concluído", icon: CheckCircle2, color: "bg-green-500" },
    failed: { label: "Falhou", icon: XCircle, color: "bg-red-500" },
  };

  const status = statusConfig[progress.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <Card className="mb-3">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{progress.title}</CardTitle>
          <Badge variant="outline" className="gap-1">
            <StatusIcon className={`h-3 w-3 ${progress.status === 'processing' ? 'animate-spin' : ''}`} />
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="py-2 px-4">
        <Progress value={percentage} className="h-2 mb-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{sent} de {total} grupos</span>
          <span className="flex gap-2">
            <span className="text-green-600">{progress.successful_sends} ✓</span>
            {progress.failed_sends > 0 && (
              <span className="text-red-600">{progress.failed_sends} ✗</span>
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function ActiveBroadcastsPanel() {
  const { data: activeBroadcasts = [], isLoading } = useActiveBroadcasts();

  if (isLoading || activeBroadcasts.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Disparos em andamento ({activeBroadcasts.length})
      </h3>
      {activeBroadcasts.map((broadcast) => (
        <BroadcastProgressItem key={broadcast.id} messageHistoryId={broadcast.id} />
      ))}
    </div>
  );
}
