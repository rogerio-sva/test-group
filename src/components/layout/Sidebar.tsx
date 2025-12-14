import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Link2,
  Send,
  Settings,
  MessageSquare,
  BarChart3,
  UserCircle,
  CalendarClock,
  Megaphone,
  HelpCircle,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Grupos", href: "/groups", icon: Users },
  { name: "Contatos", href: "/contacts", icon: UserCircle },
  { name: "Campanhas", href: "/campaigns", icon: Megaphone },
  { name: "Links Inteligentes", href: "/smart-links", icon: Link2 },
  { name: "Analytics", href: "/smart-links/analytics", icon: BarChart3 },
  { name: "Mensagens", href: "/messages", icon: Send },
  { name: "Agendamentos", href: "/schedules", icon: CalendarClock },
  { name: "Configuracoes", href: "/settings", icon: Settings },
  { name: "Ajuda", href: "/help", icon: HelpCircle },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-glow">
            <MessageSquare className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">Gestor de Grupos</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-lg bg-accent/50 p-4">
            <p className="text-xs font-medium text-accent-foreground">
              Sistema Interno
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Gerenciamento de WhatsApp
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
