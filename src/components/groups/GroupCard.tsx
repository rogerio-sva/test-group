import { Users, Link2, MoreVertical, Copy, ExternalLink, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface GroupCardProps {
  id: string;
  name: string;
  members: number;
  maxMembers: number;
  inviteLink: string;
  status: "active" | "full" | "inactive";
  photoUrl?: string;
  onEdit?: () => void;
}

export function GroupCard({
  id,
  name,
  members,
  maxMembers,
  inviteLink,
  status,
  photoUrl,
  onEdit,
}: GroupCardProps) {
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
    <div className="rounded-lg bg-card p-4 shadow-card transition-all duration-200 hover:shadow-elevated border">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent overflow-hidden">
            {photoUrl ? (
              <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
            ) : (
              <Users className="h-5 w-5 text-primary" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-sm text-card-foreground line-clamp-1">{name}</h3>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium mt-0.5",
                status === "active" && "bg-primary/10 text-primary",
                status === "full" && "bg-destructive/10 text-destructive",
                status === "inactive" && "bg-muted text-muted-foreground"
              )}
            >
              {status === "active" && "Ativo"}
              {status === "full" && "Lotado"}
              {status === "inactive" && "Inativo"}
            </span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8 border-border hover:bg-accent">
              <MoreVertical className="h-4 w-4" />
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

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Membros</span>
          <span className="font-medium text-card-foreground">
            {members} / {maxMembers}
          </span>
        </div>
        <Progress value={percentage} className="h-1.5" />
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={copyLink}
        className="w-full mt-3 h-8 text-xs"
      >
        <Copy className="h-3 w-3 mr-1.5" />
        Copiar Link
      </Button>
    </div>
  );
}
