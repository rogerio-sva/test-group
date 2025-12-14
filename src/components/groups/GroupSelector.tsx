import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, RefreshCw } from "lucide-react";

interface Group {
  id: string;
  name: string;
  phone: string;
}

interface GroupSelectorProps {
  groups: Group[];
  selectedGroups: string[];
  onSelectionChange: (selected: string[]) => void;
  isLoading?: boolean;
  onRefresh?: () => void;
  maxHeight?: string;
  showPriority?: boolean;
}

export function GroupSelector({
  groups,
  selectedGroups,
  onSelectionChange,
  isLoading = false,
  onRefresh,
  maxHeight = "300px",
  showPriority = false,
}: GroupSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const query = searchQuery.toLowerCase();
    return groups.filter((group) =>
      group.name.toLowerCase().includes(query)
    );
  }, [groups, searchQuery]);

  const toggleGroup = (groupId: string) => {
    if (selectedGroups.includes(groupId)) {
      onSelectionChange(selectedGroups.filter((id) => id !== groupId));
    } else {
      onSelectionChange([...selectedGroups, groupId]);
    }
  };

  const selectAll = () => {
    // Seleciona apenas os grupos filtrados
    const filteredIds = filteredGroups.map((g) => g.id);
    const newSelection = [...new Set([...selectedGroups, ...filteredIds])];
    onSelectionChange(newSelection);
  };

  const deselectAll = () => {
    // Remove apenas os grupos filtrados
    const filteredIds = new Set(filteredGroups.map((g) => g.id));
    onSelectionChange(selectedGroups.filter((id) => !filteredIds.has(id)));
  };

  const allFilteredSelected = filteredGroups.length > 0 && 
    filteredGroups.every((g) => selectedGroups.includes(g.id));

  return (
    <div className="grid gap-3">
      {/* Header com busca e ações */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar grupo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>

      {/* Ações de seleção */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {selectedGroups.length} de {groups.length} selecionados
          {searchQuery && ` (${filteredGroups.length} filtrados)`}
        </span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={allFilteredSelected ? deselectAll : selectAll}
            disabled={filteredGroups.length === 0}
          >
            {allFilteredSelected ? "Desmarcar" : "Selecionar"} {searchQuery ? "filtrados" : "todos"}
          </Button>
        </div>
      </div>

      {/* Lista de grupos */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground bg-secondary/50 rounded-lg">
          Nenhum grupo encontrado. Verifique a conexão Z-API.
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground bg-secondary/50 rounded-lg">
          Nenhum grupo corresponde à busca "{searchQuery}"
        </div>
      ) : (
        <div 
          className="space-y-2 overflow-y-auto pr-1" 
          style={{ maxHeight }}
        >
          {filteredGroups.map((group) => {
            const isSelected = selectedGroups.includes(group.id);
            const priority = showPriority && isSelected 
              ? selectedGroups.indexOf(group.id) + 1 
              : null;

            return (
              <div
                key={group.id}
                className={`flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer ${
                  isSelected 
                    ? "bg-primary/10 border border-primary/20" 
                    : "bg-secondary/50 hover:bg-secondary"
                }`}
                onClick={() => toggleGroup(group.id)}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={`group-${group.id}`}
                    checked={isSelected}
                    onCheckedChange={() => toggleGroup(group.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Label
                    htmlFor={`group-${group.id}`}
                    className="cursor-pointer text-sm"
                  >
                    {group.name}
                  </Label>
                </div>
                {priority && (
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                    #{priority}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Contador */}
      {selectedGroups.length > 0 && (
        <div className="rounded-lg bg-accent/50 p-3">
          <p className="text-sm text-accent-foreground">
            <strong>{selectedGroups.length}</strong> grupo(s) selecionado(s)
          </p>
        </div>
      )}
    </div>
  );
}
