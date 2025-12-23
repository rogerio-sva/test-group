import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useCampaignDetails, useUpdateCampaign, useDeleteCampaign } from '@/hooks/use-campaign-details';
import { useCampaignSettings, useUpsertCampaignSettings } from '@/hooks/use-campaign-settings';
import { Save, Archive, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CampaignSettingsTabProps {
  campaignId: string;
}

export function CampaignSettingsTab({ campaignId }: CampaignSettingsTabProps) {
  const navigate = useNavigate();
  const { data: campaign, isLoading: isLoadingCampaign } = useCampaignDetails(campaignId);
  const { data: settings, isLoading: isLoadingSettings } = useCampaignSettings(campaignId);
  const updateCampaignMutation = useUpdateCampaign();
  const upsertSettingsMutation = useUpsertCampaignSettings();
  const deleteCampaignMutation = useDeleteCampaign();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [preferredProvider, setPreferredProvider] = useState<'zapi' | 'evolution' | 'global'>('global');
  const [sendIntervalMin, setSendIntervalMin] = useState(2);
  const [sendIntervalMax, setSendIntervalMax] = useState(5);
  const [retryAttempts, setRetryAttempts] = useState(3);
  const [retryDelay, setRetryDelay] = useState(30);
  const [allowedHoursStart, setAllowedHoursStart] = useState(8);
  const [allowedHoursEnd, setAllowedHoursEnd] = useState(22);
  const [autoMentionAll, setAutoMentionAll] = useState(false);

  useEffect(() => {
    if (campaign) {
      setName(campaign.name);
      setDescription(campaign.description || '');
      setIsActive(campaign.is_active);
    }
  }, [campaign]);

  useEffect(() => {
    if (settings) {
      setPreferredProvider(settings.preferred_provider || 'global');
      setSendIntervalMin(settings.send_interval_min);
      setSendIntervalMax(settings.send_interval_max);
      setRetryAttempts(settings.retry_attempts);
      setRetryDelay(settings.retry_delay);
      setAllowedHoursStart(settings.allowed_hours_start);
      setAllowedHoursEnd(settings.allowed_hours_end);
      setAutoMentionAll(settings.auto_mention_all);
    }
  }, [settings]);

  const handleSaveBasicInfo = () => {
    updateCampaignMutation.mutate({
      id: campaignId,
      data: {
        name,
        description,
        is_active: isActive,
      },
    });
  };

  const handleSaveSettings = () => {
    upsertSettingsMutation.mutate({
      campaignId,
      settings: {
        preferred_provider: preferredProvider === 'global' ? null : preferredProvider,
        send_interval_min: sendIntervalMin,
        send_interval_max: sendIntervalMax,
        retry_attempts: retryAttempts,
        retry_delay: retryDelay,
        allowed_hours_start: allowedHoursStart,
        allowed_hours_end: allowedHoursEnd,
        auto_mention_all: autoMentionAll,
        is_active: isActive,
      },
    });
  };

  const handleDeleteCampaign = () => {
    deleteCampaignMutation.mutate(campaignId, {
      onSuccess: () => {
        navigate('/campaigns');
      },
    });
  };

  if (isLoadingCampaign || isLoadingSettings) {
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
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
          <CardDescription>Atualize o nome e descrição da campanha</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-base font-semibold text-foreground">Nome da Campanha</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite o nome da campanha"
              className="font-medium"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-base font-semibold text-foreground">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Digite a descrição da campanha"
              rows={3}
              className="font-medium"
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-card rounded-lg border-2">
            <div className="space-y-1">
              <Label htmlFor="is-active" className="font-semibold text-foreground">Status da Campanha</Label>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Desative para pausar todas as atividades da campanha
              </p>
            </div>
            <Switch id="is-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <Button onClick={handleSaveBasicInfo} disabled={updateCampaignMutation.isPending} size="lg" className="w-full">
            <Save className="mr-2 h-4 w-4" />
            Salvar Informações Básicas
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuração de Envio</CardTitle>
          <CardDescription>Configure o comportamento de envio de mensagens para esta campanha</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider" className="text-base font-semibold text-foreground">Provedor Preferido</Label>
            <Select value={preferredProvider} onValueChange={(v: any) => setPreferredProvider(v)}>
              <SelectTrigger id="provider" className="font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Usar Padrão Global</SelectItem>
                <SelectItem value="zapi">Z-API</SelectItem>
                <SelectItem value="evolution">Evolution API</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interval-min" className="text-base font-semibold text-foreground">Intervalo Mínimo (segundos)</Label>
              <Input
                id="interval-min"
                type="number"
                min={1}
                value={sendIntervalMin}
                onChange={(e) => setSendIntervalMin(parseInt(e.target.value))}
                className="font-medium"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interval-max" className="text-base font-semibold text-foreground">Intervalo Máximo (segundos)</Label>
              <Input
                id="interval-max"
                type="number"
                min={1}
                value={sendIntervalMax}
                onChange={(e) => setSendIntervalMax(parseInt(e.target.value))}
                className="font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="retry-attempts" className="text-base font-semibold text-foreground">Tentativas de Reenvio</Label>
              <Input
                id="retry-attempts"
                type="number"
                min={0}
                max={10}
                value={retryAttempts}
                onChange={(e) => setRetryAttempts(parseInt(e.target.value))}
                className="font-medium"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retry-delay" className="text-base font-semibold text-foreground">Atraso entre Tentativas (segundos)</Label>
              <Input
                id="retry-delay"
                type="number"
                min={1}
                value={retryDelay}
                onChange={(e) => setRetryDelay(parseInt(e.target.value))}
                className="font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hours-start" className="text-base font-semibold text-foreground">Horário Permitido Início</Label>
              <Input
                id="hours-start"
                type="number"
                min={0}
                max={23}
                value={allowedHoursStart}
                onChange={(e) => setAllowedHoursStart(parseInt(e.target.value))}
                className="font-medium"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours-end" className="text-base font-semibold text-foreground">Horário Permitido Fim</Label>
              <Input
                id="hours-end"
                type="number"
                min={0}
                max={23}
                value={allowedHoursEnd}
                onChange={(e) => setAllowedHoursEnd(parseInt(e.target.value))}
                className="font-medium"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-card rounded-lg border-2">
            <div className="space-y-1">
              <Label htmlFor="mention-all" className="font-semibold text-foreground">Mencionar Todos Automaticamente</Label>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Menciona automaticamente @everyone nas mensagens de grupo
              </p>
            </div>
            <Switch
              id="mention-all"
              checked={autoMentionAll}
              onCheckedChange={setAutoMentionAll}
            />
          </div>

          <Button onClick={handleSaveSettings} disabled={upsertSettingsMutation.isPending} size="lg" className="w-full">
            <Save className="mr-2 h-4 w-4" />
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
          <CardDescription>Ações irreversíveis para esta campanha</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir Campanha
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Campanha?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso excluirá permanentemente a campanha, todos os grupos associados, contatos, links
                  e histórico de mensagens. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteCampaign} className="bg-destructive">
                  Excluir Permanentemente
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
