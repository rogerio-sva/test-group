import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMessageHistory } from '@/hooks/use-message-history';
import { MessageSquare, Plus, Clock, CheckCircle, XCircle, Send } from 'lucide-react';
import { format } from 'date-fns';

interface CampaignMessagesTabProps {
  campaignId: string;
  onSendMessage: () => void;
}

export function CampaignMessagesTab({ campaignId, onSendMessage }: CampaignMessagesTabProps) {
  const { data: messages, isLoading } = useMessageHistory();

  const campaignMessages = messages?.filter((msg) => msg.campaign_id === campaignId);
  const scheduledMessages = campaignMessages?.filter(
    (msg) => msg.status === 'pending' && msg.scheduled_at
  );
  const sentMessages = campaignMessages?.filter(
    (msg) => msg.status === 'sent' || msg.status === 'partial'
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Enviado
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pendente
          </Badge>
        );
      case 'sending':
        return (
          <Badge variant="secondary" className="gap-1">
            <Send className="h-3 w-3" />
            Enviando
          </Badge>
        );
      case 'partial':
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Parcial
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Falhou
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-foreground">Mensagens da Campanha</h3>
          <p className="text-sm text-muted-foreground">
            Visualize mensagens agendadas e enviadas para esta campanha
          </p>
        </div>
        <Button onClick={onSendMessage}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Mensagem
        </Button>
      </div>

      {scheduledMessages && scheduledMessages.length > 0 && (
        <div className="space-y-4">
          <div>
            <h4 className="text-md font-medium text-foreground mb-3">Mensagens Agendadas</h4>
            <div className="space-y-3">
              {scheduledMessages.map((message) => (
                <Card key={message.id} className="border-primary/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-foreground">{message.title}</h4>
                          {getStatusBadge(message.status)}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {message.content}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Agendado para{' '}
                            {message.scheduled_at
                              ? format(new Date(message.scheduled_at), 'PPp')
                              : 'N/A'}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {message.message_type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {sentMessages && sentMessages.length > 0 ? (
        <div className="space-y-4">
          <h4 className="text-md font-medium text-foreground">Histórico de Mensagens</h4>
          <div className="space-y-3">
            {sentMessages.map((message) => {
              const successRate =
                message.successful_sends + message.failed_sends > 0
                  ? (message.successful_sends /
                      (message.successful_sends + message.failed_sends)) *
                    100
                  : 0;

              return (
                <Card key={message.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-foreground">{message.title}</h4>
                          {getStatusBadge(message.status)}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {message.content}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-muted-foreground">
                            Enviado {message.sent_at ? format(new Date(message.sent_at), 'PPp') : 'N/A'}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {message.message_type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-green-600">
                            ✓ {message.successful_sends} enviados
                          </span>
                          {message.failed_sends > 0 && (
                            <span className="text-red-600">✗ {message.failed_sends} falharam</span>
                          )}
                          <span className="text-muted-foreground">
                            {successRate.toFixed(0)}% taxa de sucesso
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        !scheduledMessages?.length && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma Mensagem Ainda</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Comece a enviar mensagens para contatos e grupos nesta campanha.
              </p>
              <Button onClick={onSendMessage}>
                <Plus className="mr-2 h-4 w-4" />
                Enviar Sua Primeira Mensagem
              </Button>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
