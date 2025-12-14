import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { ContactCard } from "@/components/contacts/ContactCard";
import { BatchPhoneValidator } from "@/components/contacts/BatchPhoneValidator";
import { ContactGroupManager } from "@/components/contacts/ContactGroupManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Users, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useContactsFromDB,
  useAddContact,
  useBlockContact,
  useUnblockContact,
  useReportContact,
} from "@/hooks/use-contacts";

export default function Contacts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "blocked" | "business" | "groups">("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newContact, setNewContact] = useState({ phone: "", name: "" });

  const { data: contacts = [], isLoading, refetch } = useContactsFromDB();
  const addContact = useAddContact();
  const blockContact = useBlockContact();
  const unblockContact = useUnblockContact();
  const reportContact = useReportContact();

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone.includes(searchQuery);

    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "blocked" && contact.is_blocked) ||
      (filterStatus === "business" && contact.is_business) ||
      (filterStatus === "groups" && contact.is_group);

    return matchesSearch && matchesFilter;
  });

  const handleAddContact = async () => {
    if (!newContact.phone) return;

    await addContact.mutateAsync(newContact);
    setNewContact({ phone: "", name: "" });
    setIsAddDialogOpen(false);
  };

  const stats = {
    total: contacts.length,
    blocked: contacts.filter((c) => c.is_blocked).length,
    business: contacts.filter((c) => c.is_business).length,
    groups: contacts.filter((c) => c.is_group).length,
  };

  return (
    <MainLayout
      title="Contatos"
      subtitle="Gerencie seus contatos do WhatsApp"
    >
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl bg-card p-4 shadow-card border">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Total</span>
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="rounded-xl bg-card p-4 shadow-card border">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Bloqueados</span>
          </div>
          <p className="text-2xl font-bold">{stats.blocked}</p>
        </div>
        <div className="rounded-xl bg-card p-4 shadow-card border">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Business</span>
          </div>
          <p className="text-2xl font-bold">{stats.business}</p>
        </div>
        <div className="rounded-xl bg-card p-4 shadow-card border">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Grupos</span>
          </div>
          <p className="text-2xl font-bold">{stats.groups}</p>
        </div>
      </div>

      <Tabs defaultValue="all" className="mb-6">
        <TabsList>
          <TabsTrigger value="all">Todos os Contatos</TabsTrigger>
          <TabsTrigger value="groupSearch">Buscar em Grupos</TabsTrigger>
          <TabsTrigger value="validation">Validação em Lote</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou número..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="blocked">Bloqueados</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="groups">Grupos</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="hero">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Contato
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Contato</DialogTitle>
                  <DialogDescription>
                    Adicione um novo contato ao WhatsApp.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="phone" className="font-medium">Número do Telefone *</Label>
                    <Input
                      id="phone"
                      placeholder="5511999999999"
                      value={newContact.phone}
                      onChange={(e) =>
                        setNewContact({ ...newContact, phone: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Formato: código do país + DDD + número (ex: 5511999999999)
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="name" className="font-medium">Nome <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                    <Input
                      id="name"
                      placeholder="Nome do contato"
                      value={newContact.name}
                      onChange={(e) =>
                        setNewContact({ ...newContact, name: e.target.value })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="secondary" onClick={() => setIsAddDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    variant="hero"
                    onClick={handleAddContact}
                    disabled={!newContact.phone || addContact.isPending}
                  >
                    {addContact.isPending ? "Adicionando..." : "Adicionar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-12 rounded-xl bg-card shadow-card">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery
                  ? "Nenhum contato encontrado com esse filtro."
                  : "Nenhum contato cadastrado ainda."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredContacts.map((contact) => (
                <ContactCard
                  key={contact.id}
                  {...contact}
                  onBlock={() => blockContact.mutate(contact.phone)}
                  onUnblock={() => unblockContact.mutate(contact.phone)}
                  onReport={() => reportContact.mutate(contact.phone)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="groupSearch" className="mt-4">
          <ContactGroupManager />
        </TabsContent>

        <TabsContent value="validation" className="mt-4">
          <BatchPhoneValidator />
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
