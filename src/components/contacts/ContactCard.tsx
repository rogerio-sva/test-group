import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, MoreVertical, Ban, ShieldCheck, Flag, Building2 } from "lucide-react";
import type { Contact } from "@/providers/types";

interface ContactCardProps extends Contact {
  onBlock?: () => void;
  onUnblock?: () => void;
  onReport?: () => void;
}

export function ContactCard({
  name,
  phone,
  profile_pic_url,
  is_business,
  is_blocked,
  is_group,
  status,
  onBlock,
  onUnblock,
  onReport,
}: ContactCardProps) {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : phone.slice(0, 2);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={profile_pic_url} alt={name} />
            <AvatarFallback>
              <User className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{name || "Sem nome"}</h3>
              {is_business && (
                <Badge variant="secondary" className="gap-1">
                  <Building2 className="h-3 w-3" />
                  Business
                </Badge>
              )}
              {is_group && (
                <Badge variant="outline">Grupo</Badge>
              )}
              {is_blocked && (
                <Badge variant="destructive" className="gap-1">
                  <Ban className="h-3 w-3" />
                  Bloqueado
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">{phone}</p>
            {status && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {status}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!is_blocked ? (
                <DropdownMenuItem onClick={onBlock} className="text-destructive">
                  <Ban className="mr-2 h-4 w-4" />
                  Bloquear contato
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={onUnblock}>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Desbloquear contato
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onReport}>
                <Flag className="mr-2 h-4 w-4" />
                Reportar como spam
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
