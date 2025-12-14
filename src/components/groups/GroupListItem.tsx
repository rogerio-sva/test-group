import { Users, Link2, Copy, ExternalLink, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface GroupListItemProps {
  id: string;
  name: string;
  members: number;
  maxMembers: number;
  inviteLink: string;
  status: "active" | "full" | "inactive";
  photoUrl?: string;
  onEdit?: () => void;
}

export function GroupListItem({
  id,
  name,
  members,
  maxMembers,
  inviteLink,
  status,
  photoUrl,
  onEdit,
}: GroupListItemProps) {
  const { toast } = useToast();
  const percentage = (members / maxMembers) * 100;

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast({
      title: "Link copiado!",
      description: "O link foi copiado para a área de transferência.",
    });
  };

  return (
    <div className="rounded-lg bg-card p-3 shadow-sm transition-all duration-200 hover:shadow-md border">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent overflow-hidden flex-shrink-0">
          {photoUrl ? (
            <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <Users className="h-5 w-5 text-primary" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm text-card-foreground truncate">{name}</h3>
            <Badge
              variant={status === "active" ? "default" : status === "full" ? "destructive" : "secondary"}
              className="text-xs"
            >
              {status === "active" && "Ativo"}
              {status === "full" && "Lotado"}
              {status === "inactive" && "Inativo"}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-muted-foreground">
              {members} / {maxMembers} membros
            </span>
            <div className="flex-1 max-w-[200px] bg-secondary rounded-full h-1.5">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  percentage >= 90 ? "bg-destructive" : "bg-primary"
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={copyLink}>
            <Copy className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <>
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar grupo
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={copyLink}>
                <Copy className="mr-2 h-4 w-4" />
                Copiar link
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ExternalLink className="mr-2 h-4 w-4" />
                Abrir grupo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
