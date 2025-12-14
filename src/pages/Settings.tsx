import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Bell,
  Smartphone,
  Globe,
  Save,
  Wifi,
  WifiOff,
  RefreshCw,
  Loader2,
  HelpCircle,
  Eye,
  EyeOff,
  Key,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InfoTooltip, LabelWithTooltip } from "@/components/ui/info-tooltip";
import { useNavigate } from "react-router-dom";
import { useZAPIInstanceStatus } from "@/hooks/use-zapi";
import { instance } from "@/providers";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ApiSettings {
  instance_id: string;
  token: string;
  client_token: string;
}

export default function Settings() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: instanceStatus, isLoading, refetch } = useZAPIInstanceStatus();
  const [isRestarting, setIsRestarting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [showToken, setShowToken] = useState(false);
  const [showClientToken, setShowClientToken] = useState(false);

  const [zapiCredentials, setZapiCredentials] = useState<ApiSettings>({
    instance_id: "",
    token: "",
    client_token: "",
  });

  const [hasExistingCredentials, setHasExistingCredentials] = useState(false);

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      const { data, error } = await supabase
        .from("api_settings")
        .select("*")
        .eq("id", "zapi_credentials")
        .maybeSingle();

      if (data && !error) {
        setZapiCredentials({
          instance_id: data.instance_id || "",
          token: data.token || "",
          client_token: data.client_token || "",
        });
        setHasExistingCredentials(true);
      }
    } catch (error) {
      console.error("Error loading credentials:", error);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!zapiCredentials.instance_id || !zapiCredentials.token || !zapiCredentials.client_token) {
      toast({
        title: "Campos obrigatorios",
        description: "Preencha todos os campos de credenciais Z-API.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("api_settings")
        .upsert({
          id: "zapi_credentials",
          provider: "zapi",
          instance_id: zapiCredentials.instance_id,
          token: zapiCredentials.token,
          client_token: zapiCredentials.client_token,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });

      if (error) throw error;

      setHasExistingCredentials(true);
      toast({
        title: "Credenciais salvas!",
        description: "Suas credenciais Z-API foram atualizadas com sucesso.",
      });

      setTimeout(() => refetch(), 1000);
    } catch (error) {
      console.error("Error saving credentials:", error);
      toast({
        title: "Erro ao salvar",
        description: "Nao foi possivel salvar as credenciais. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestartInstance = async () => {
    setIsRestarting(true);
    try {
      await instance.restart();
      toast({
        title: "Instancia reiniciada",
        description: "A instancia Z-API foi reiniciada com sucesso.",
      });
      setTimeout(() => refetch(), 5000);
    } catch (error) {
      toast({
        title: "Erro ao reiniciar",
        description: "Nao foi possivel reiniciar a instancia.",
        variant: "destructive",
      });
    } finally {
      setIsRestarting(false);
    }
  };

  const isConnected = instanceStatus?.connected || false;

  return (
    <MainLayout
      title="Configuracoes"
      subtitle="Gerencie suas credenciais e preferencias do sistema"
    >
      <div className="max-w-3xl space-y-6">
        {/* Z-API Credentials */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Key className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle>Credenciais Z-API</CardTitle>
                  {hasExistingCredentials ? (
                    <Badge className="bg-green-500 gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Configurado
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1 bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
                      <AlertCircle className="h-3 w-3" />
                      Pendente
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  Configure suas credenciais do Z-API para conectar ao WhatsApp
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingSettings ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Onde encontrar?</strong> Acesse{" "}
                    <a
                      href="https://z-api.io"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-medium"
                    >
                      z-api.io
                    </a>
                    {" "}e copie as credenciais da sua instancia.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="instance_id">Instance ID</Label>
                    <Input
                      id="instance_id"
                      placeholder="Ex: 3C8A2B7F..."
                      value={zapiCredentials.instance_id}
                      onChange={(e) =>
                        setZapiCredentials({ ...zapiCredentials, instance_id: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Z-API Dashboard - Sua Instancia - Instance ID
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="token">Token</Label>
                    <div className="relative">
                      <Input
                        id="token"
                        type={showToken ? "text" : "password"}
                        placeholder="Ex: 7D8E9F0A..."
                        value={zapiCredentials.token}
                        onChange={(e) =>
                          setZapiCredentials({ ...zapiCredentials, token: e.target.value })
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => setShowToken(!showToken)}
                      >
                        {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Z-API Dashboard - Sua Instancia - Token
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="client_token">Client Token</Label>
                    <div className="relative">
                      <Input
                        id="client_token"
                        type={showClientToken ? "text" : "password"}
                        placeholder="Ex: A1B2C3D4..."
                        value={zapiCredentials.client_token}
                        onChange={(e) =>
                          setZapiCredentials({ ...zapiCredentials, client_token: e.target.value })
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => setShowClientToken(!showClientToken)}
                      >
                        {showClientToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Z-API Dashboard - Configuracoes - Client Token
                    </p>
                  </div>
                </div>

                <Button
                  variant="hero"
                  className="w-full"
                  onClick={handleSaveCredentials}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Salvar Credenciais
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Z-API Connection Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isConnected ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                {isConnected ? (
                  <Wifi className="h-5 w-5 text-green-500" />
                ) : (
                  <WifiOff className="h-5 w-5 text-yellow-500" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle>Status da Conexao</CardTitle>
                  {isLoading ? (
                    <Badge variant="secondary">Verificando...</Badge>
                  ) : isConnected ? (
                    <Badge className="bg-green-500">Conectado</Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">Desconectado</Badge>
                  )}
                </div>
                <CardDescription>
                  Status da conexao com o WhatsApp via Z-API
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">Conectado</p>
                <p className="text-lg font-bold">
                  {isLoading ? "-" : instanceStatus?.connected ? "Sim" : "Nao"}
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">Sessao</p>
                <p className="text-lg font-bold">
                  {isLoading ? "-" : instanceStatus?.session ? "Ativa" : "Inativa"}
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">Smartphone</p>
                <p className="text-lg font-bold">
                  {isLoading ? "-" : instanceStatus?.smartphoneConnected ? "Online" : "Offline"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Verificar Status
              </Button>
              <Button
                variant="outline"
                onClick={handleRestartInstance}
                disabled={isRestarting}
              >
                {isRestarting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Reiniciar Instancia
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Notificacoes</CardTitle>
                <CardDescription>
                  Controle como voce recebe alertas
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Grupos lotados</p>
                <p className="text-sm text-muted-foreground">
                  Alerta quando um grupo atinge o limite
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Erros de envio</p>
                <p className="text-sm text-muted-foreground">
                  Notificar quando mensagens falharem
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Config */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>WhatsApp</CardTitle>
                <CardDescription>
                  Configuracoes de integracao
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <LabelWithTooltip
                htmlFor="defaultLimit"
                label="Limite padrao de membros"
                tooltip="Numero maximo de participantes por grupo. O WhatsApp permite 256 em grupos normais e 1024 em comunidades."
              />
              <Input
                id="defaultLimit"
                type="number"
                defaultValue="256"
              />
              <p className="text-xs text-muted-foreground">
                Limite usado ao criar novos grupos
              </p>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div>
                  <p className="font-medium">Auto-rotacao de links</p>
                  <p className="text-sm text-muted-foreground">
                    Alterna automaticamente quando grupo lota
                  </p>
                </div>
                <InfoTooltip content="Quando ativado, os links inteligentes direcionam automaticamente para o proximo grupo disponivel assim que o atual atinge o limite." />
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Links Config */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Links Inteligentes</CardTitle>
                <CardDescription>
                  Configuracoes de redirecionamento
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div>
                  <p className="font-medium">Detectar dispositivo</p>
                  <p className="text-sm text-muted-foreground">
                    Redireciona para app correto (iOS/Android)
                  </p>
                </div>
                <InfoTooltip content="Identifica se o usuario esta em iPhone ou Android e abre diretamente o app do WhatsApp correspondente." />
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div>
                  <p className="font-medium">Rastrear cliques</p>
                  <p className="text-sm text-muted-foreground">
                    Contabiliza acessos aos links
                  </p>
                </div>
                <InfoTooltip content="Registra cada acesso ao link incluindo data, hora, dispositivo e localizacao aproximada para analises." />
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Help & Tutorial */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <HelpCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Ajuda e Suporte</CardTitle>
                <CardDescription>
                  Acesse a documentacao e tutoriais
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  localStorage.removeItem("gestor_grupos_onboarding_complete");
                  navigate("/onboarding");
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Ver Tutorial Novamente
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/help")}
              >
                <HelpCircle className="mr-2 h-4 w-4" />
                Central de Ajuda
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
