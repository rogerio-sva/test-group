import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Rocket,
  Smartphone,
  Wifi,
  WifiOff,
  Loader2,
  ExternalLink,
  Settings,
  Users,
  Link2,
  Send,
  Sparkles,
  Eye,
  EyeOff,
  Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useZAPIInstanceStatus } from "@/hooks/use-zapi";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const ONBOARDING_COMPLETE_KEY = "gestor_grupos_onboarding_complete";

interface StepProps {
  isActive: boolean;
  isCompleted: boolean;
  stepNumber: number;
  title: string;
}

function StepIndicator({ isActive, isCompleted, stepNumber, title }: StepProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
          isCompleted && "border-primary bg-primary text-primary-foreground",
          isActive && !isCompleted && "border-primary bg-primary/10 text-primary",
          !isActive && !isCompleted && "border-muted-foreground/30 text-muted-foreground"
        )}
      >
        {isCompleted ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : (
          <span className="text-sm font-semibold">{stepNumber}</span>
        )}
      </div>
      <span
        className={cn(
          "text-sm font-medium hidden sm:block",
          isActive || isCompleted ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {title}
      </span>
    </div>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [showToken, setShowToken] = useState(false);
  const [showClientToken, setShowClientToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [credentialsSaved, setCredentialsSaved] = useState(false);

  const [zapiCredentials, setZapiCredentials] = useState({
    instance_id: "",
    token: "",
    client_token: "",
  });

  const { data: instanceStatus, isLoading: isCheckingStatus, refetch } = useZAPIInstanceStatus();
  const isConnected = instanceStatus?.connected || false;

  const totalSteps = 4;

  const steps = [
    { number: 1, title: "Bem-vindo" },
    { number: 2, title: "Z-API" },
    { number: 3, title: "Testar" },
    { number: 4, title: "Concluir" },
  ];

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveCredentials = async () => {
    if (!zapiCredentials.instance_id || !zapiCredentials.token || !zapiCredentials.client_token) {
      toast({
        title: "Campos obrigatorios",
        description: "Preencha todos os campos de credenciais.",
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

      setCredentialsSaved(true);
      toast({
        title: "Credenciais salvas!",
        description: "Suas credenciais Z-API foram configuradas com sucesso.",
      });

      setTimeout(() => refetch(), 1000);
      handleNext();
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

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
    toast({
      title: "Configuracao concluida!",
      description: "Voce esta pronto para usar o Gestor de Grupos.",
    });
    navigate("/");
  };

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary shadow-glow">
            <MessageSquare className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold text-foreground">Gestor de Grupos</span>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8 overflow-x-auto pb-2">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <StepIndicator
                isActive={currentStep === step.number}
                isCompleted={currentStep > step.number}
                stepNumber={step.number}
                title={step.title}
              />
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "w-8 sm:w-16 h-0.5 mx-2",
                    currentStep > step.number ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <Card className="shadow-elevated">
          <CardContent className="p-6 sm:p-8">
            {currentStep === 1 && (
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                      <Rocket className="h-12 w-12 text-primary" />
                    </div>
                    <Sparkles className="h-6 w-6 text-primary absolute -top-1 -right-1 animate-pulse" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
                    Bem-vindo ao Gestor de Grupos!
                  </h2>
                  <p className="text-muted-foreground text-lg max-w-lg mx-auto">
                    Seu sistema completo para gerenciamento de grupos WhatsApp em larga escala.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 max-w-xl mx-auto text-left">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-accent/50">
                    <Users className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Gerenciamento de Grupos</p>
                      <p className="text-sm text-muted-foreground">Crie e gerencie grupos WhatsApp</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-accent/50">
                    <Link2 className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Links Inteligentes</p>
                      <p className="text-sm text-muted-foreground">Rotacao automatica de grupos</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-accent/50">
                    <Send className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Broadcast em Massa</p>
                      <p className="text-sm text-muted-foreground">Envie para multiplos grupos</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-accent/50">
                    <Settings className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Agendamento</p>
                      <p className="text-sm text-muted-foreground">Programe envios futuros</p>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  Vamos configurar seu sistema em poucos passos. Leva cerca de 2 minutos.
                </p>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Smartphone className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Configurar Z-API
                  </h2>
                  <p className="text-muted-foreground">
                    Conecte sua conta Z-API para gerenciar grupos do WhatsApp.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Ainda nao tem Z-API?</strong> Crie sua conta em{" "}
                      <a
                        href="https://z-api.io"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-medium"
                      >
                        z-api.io
                      </a>
                      {" "}e crie uma instancia. Depois, copie as credenciais abaixo.
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
                        Encontre em: Z-API Dashboard - Sua Instancia - Instance ID
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
                        Encontre em: Z-API Dashboard - Sua Instancia - Token
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
                        Encontre em: Z-API Dashboard - Configuracoes - Client Token
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="hero"
                    className="w-full"
                    onClick={handleSaveCredentials}
                    disabled={isSaving || !zapiCredentials.instance_id || !zapiCredentials.token || !zapiCredentials.client_token}
                  >
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Salvar e Continuar
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className={cn(
                    "h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4",
                    isConnected ? "bg-green-500/10" : "bg-yellow-500/10"
                  )}>
                    {isConnected ? (
                      <Wifi className="h-8 w-8 text-green-500" />
                    ) : (
                      <WifiOff className="h-8 w-8 text-yellow-500" />
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Testar Conexao
                  </h2>
                  <p className="text-muted-foreground">
                    Vamos verificar se tudo esta configurado corretamente.
                  </p>
                </div>

                <div className="p-6 rounded-lg bg-card border">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-medium text-foreground">Status da Conexao</span>
                    {isCheckingStatus ? (
                      <Badge variant="secondary" className="gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Verificando...
                      </Badge>
                    ) : isConnected ? (
                      <Badge className="bg-green-500 gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Conectado
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1 bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
                        <WifiOff className="h-3 w-3" />
                        Aguardando
                      </Badge>
                    )}
                  </div>

                  {isConnected ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="text-sm">WhatsApp conectado com sucesso!</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Sua instancia esta pronta para uso. Voce pode comecar a gerenciar seus grupos.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Ainda nao conectado. Verifique se:
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                        <li>- As credenciais Z-API estao corretas</li>
                        <li>- A instancia do Z-API esta ativa</li>
                        <li>- O WhatsApp esta conectado na instancia (QR Code)</li>
                      </ul>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isCheckingStatus}
                      >
                        {isCheckingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Verificar Novamente
                      </Button>
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-lg bg-accent/50 border border-accent">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">Dica:</strong> Se a conexao nao funcionar agora,
                    voce pode pular e configurar depois em Configuracoes.
                  </p>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="h-24 w-24 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-12 w-12 text-green-500" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
                    Tudo Pronto!
                  </h2>
                  <p className="text-muted-foreground text-lg max-w-lg mx-auto">
                    Seu Gestor de Grupos esta configurado e pronto para uso.
                  </p>
                </div>

                <div className="max-w-md mx-auto text-left space-y-3">
                  <h3 className="font-semibold text-foreground">Proximos passos:</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                      <Users className="h-5 w-5 text-primary" />
                      <span className="text-sm text-foreground">Acesse "Grupos" para ver seus grupos do WhatsApp</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                      <Link2 className="h-5 w-5 text-primary" />
                      <span className="text-sm text-foreground">Crie seu primeiro "Link Inteligente"</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                      <Send className="h-5 w-5 text-primary" />
                      <span className="text-sm text-foreground">Envie uma mensagem de teste em "Mensagens"</span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  Precisa de ajuda? Acesse a pagina de Ajuda no menu ou passe o mouse sobre os icones (?) para mais informacoes.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between mt-8 pt-6 border-t">
              <div>
                {currentStep > 1 ? (
                  <Button variant="ghost" onClick={handleBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                  </Button>
                ) : (
                  <Button variant="ghost" onClick={handleSkip}>
                    Pular configuracao
                  </Button>
                )}
              </div>
              <div>
                {currentStep === 2 ? null : currentStep < totalSteps ? (
                  <Button variant="hero" onClick={handleNext}>
                    Proximo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button variant="hero" onClick={handleComplete}>
                    Comecar a usar
                    <Rocket className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function useOnboarding() {
  const isComplete = localStorage.getItem(ONBOARDING_COMPLETE_KEY) === "true";

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_COMPLETE_KEY);
  };

  return { isComplete, resetOnboarding };
}
