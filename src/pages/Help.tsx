import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  HelpCircle,
  BookOpen,
  Users,
  Link2,
  Send,
  Settings,
  Rocket,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Smartphone,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useOnboarding } from "./Onboarding";

const quickLinks = [
  {
    icon: Users,
    title: "Gerenciar Grupos",
    description: "Veja e gerencie seus grupos do WhatsApp",
    href: "/groups",
  },
  {
    icon: Link2,
    title: "Links Inteligentes",
    description: "Crie links que rotacionam automaticamente",
    href: "/smart-links",
  },
  {
    icon: Send,
    title: "Enviar Mensagens",
    description: "Envie mensagens para multiplos grupos",
    href: "/messages",
  },
  {
    icon: Settings,
    title: "Configuracoes",
    description: "Configure o sistema e conexoes",
    href: "/settings",
  },
];

const faqItems = [
  {
    question: "O que e o Gestor de Grupos?",
    answer: "O Gestor de Grupos e um sistema de gerenciamento de grupos WhatsApp que permite enviar mensagens em massa, criar links inteligentes que rotacionam entre grupos, e agendar mensagens para envio futuro. Ele se conecta ao WhatsApp atraves da API do Z-API.",
  },
  {
    question: "Como conectar meu WhatsApp?",
    answer: "Va em Configuracoes e preencha suas credenciais Z-API (Instance ID, Token e Client Token). Voce encontra essas informacoes no painel do Z-API em z-api.io apos criar sua instancia.",
  },
  {
    question: "O que sao Links Inteligentes?",
    answer: "Links Inteligentes sao URLs personalizadas que direcionam automaticamente para grupos do WhatsApp. Quando um grupo atinge o limite de membros, o link passa a direcionar para o proximo grupo disponivel. Eles tambem detectam o dispositivo (iOS/Android) para abrir diretamente no app correto.",
  },
  {
    question: "Como funciona o envio de mensagens em massa?",
    answer: "Voce pode enviar mensagens de texto, imagens, videos, audios e documentos para multiplos grupos de uma vez. O sistema envia com um intervalo de 5 segundos entre cada mensagem para evitar bloqueios. Voce pode acompanhar o progresso em tempo real.",
  },
  {
    question: "Posso agendar mensagens?",
    answer: "Sim! Ao criar uma nova mensagem, ative a opcao 'Agendar para depois' e selecione a data e hora desejada. O sistema enviara automaticamente no horario programado.",
  },
  {
    question: "O que e @mention todos?",
    answer: "A opcao 'Mencionar todos' envia a mensagem com uma notificacao para todos os membros do grupo, similar ao @all. Use com moderacao pois pode ser considerado spam se usado em excesso.",
  },
  {
    question: "Como criar uma Campanha?",
    answer: "Campanhas agrupam varios grupos do WhatsApp para usar com Links Inteligentes. Va em 'Campanhas' e crie uma nova. Depois, adicione grupos a campanha e crie um Link Inteligente vinculado a ela.",
  },
  {
    question: "O que e o Supabase?",
    answer: "Supabase e a plataforma de banco de dados que armazena todas as informacoes do sistema (grupos, mensagens, campanhas, etc). O sistema ja vem conectado ao Supabase automaticamente.",
  },
  {
    question: "Minhas mensagens nao estao sendo enviadas. O que fazer?",
    answer: "Verifique: 1) Se a conexao com Z-API esta ativa em Configuracoes; 2) Se as credenciais estao corretas; 3) Se a instancia do Z-API esta conectada ao WhatsApp (escaneie o QR Code); 4) Se voce nao foi bloqueado por enviar muitas mensagens rapidamente.",
  },
  {
    question: "Qual o limite de membros dos grupos?",
    answer: "O WhatsApp permite ate 256 membros por grupo na versao regular e ate 1024 em grupos de Comunidades. O Gestor de Grupos usa 256 como limite padrao, mas voce pode ajustar em Configuracoes.",
  },
];

const troubleshootingItems = [
  {
    icon: AlertTriangle,
    title: "Conexao Desconectada",
    description: "Verifique se sua instancia Z-API esta ativa e o WhatsApp conectado. Va em Configuracoes e clique em 'Verificar Status'.",
  },
  {
    icon: AlertTriangle,
    title: "Mensagens Falhando",
    description: "Pode ser rate limit do WhatsApp. Aguarde alguns minutos e tente novamente. Evite enviar para muitos grupos em sequencia.",
  },
  {
    icon: AlertTriangle,
    title: "Grupos Nao Aparecem",
    description: "Clique em 'Atualizar' na pagina de Grupos. Se persistir, verifique a conexao da instancia.",
  },
  {
    icon: AlertTriangle,
    title: "Link Inteligente Nao Redireciona",
    description: "Verifique se ha grupos ativos na campanha com links de convite configurados. Edite a campanha e configure os links de cada grupo.",
  },
];

export default function Help() {
  const navigate = useNavigate();
  const { resetOnboarding } = useOnboarding();

  const handleRestartOnboarding = () => {
    resetOnboarding();
    navigate("/onboarding");
  };

  return (
    <MainLayout
      title="Central de Ajuda"
      subtitle="Encontre respostas e aprenda a usar o Gestor de Grupos"
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-primary" />
                Primeiros Passos
              </CardTitle>
              <CardDescription>
                Novo por aqui? Comece pelo assistente de configuracao.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 rounded-lg bg-accent/50">
                <div>
                  <p className="font-medium text-foreground">Assistente de Configuracao</p>
                  <p className="text-sm text-muted-foreground">
                    Siga o passo a passo para configurar o sistema corretamente.
                  </p>
                </div>
                <Button variant="hero" onClick={handleRestartOnboarding}>
                  Iniciar Tutorial
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                Perguntas Frequentes
              </CardTitle>
              <CardDescription>
                Respostas para as duvidas mais comuns.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqItems.map((item, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left text-foreground hover:text-foreground">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Resolucao de Problemas
              </CardTitle>
              <CardDescription>
                Solucoes para problemas comuns.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {troubleshootingItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 rounded-lg bg-accent/50 border border-accent"
                >
                  <item.icon className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Acesso Rapido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => navigate(link.href)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors text-left"
                >
                  <link.icon className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground text-sm">{link.title}</p>
                    <p className="text-xs text-muted-foreground">{link.description}</p>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                Status do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                <span className="text-sm text-foreground">Z-API</span>
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm">Configurado</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                <span className="text-sm text-foreground">Supabase</span>
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm">Conectado</span>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/settings")}
              >
                Ver Configuracoes
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-primary" />
                Links Uteis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <a
                href="https://z-api.io"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Painel Z-API
              </a>
              <a
                href="https://supabase.com/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Documentacao Supabase
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
