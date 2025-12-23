import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ContactCard } from '@/components/contacts/ContactCard';
import { useCampaignContacts, useRemoveContactFromCampaign, useUpdateCampaignContact } from '@/hooks/use-campaign-contacts';
import { Users, Plus, Search, Filter, UserX } from 'lucide-react';
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
} from '@/components/ui/alert-dialog';

interface CampaignContactsTabProps {
  campaignId: string;
  onAddContacts: () => void;
}

export function CampaignContactsTab({ campaignId, onAddContacts }: CampaignContactsTabProps) {
  const [statusFilter, setStatusFilter] = useState<'active' | 'paused' | 'removed' | undefined>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [contactToRemove, setContactToRemove] = useState<{ campaignId: string; contactId: string } | null>(null);

  const { data: campaignContacts, isLoading } = useCampaignContacts(campaignId, statusFilter);
  const removeContactMutation = useRemoveContactFromCampaign();
  const updateContactMutation = useUpdateCampaignContact();

  const filteredContacts = campaignContacts?.filter((cc) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      cc.contact?.name.toLowerCase().includes(query) ||
      cc.contact?.phone.toLowerCase().includes(query) ||
      cc.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  const handleRemoveContact = (contactId: string) => {
    setContactToRemove({ campaignId, contactId });
  };

  const confirmRemoveContact = () => {
    if (contactToRemove) {
      removeContactMutation.mutate(contactToRemove);
      setContactToRemove(null);
    }
  };

  const handleStatusChange = (contactId: string, newStatus: 'active' | 'paused' | 'removed') => {
    const contact = campaignContacts?.find((cc) => cc.contact_id === contactId);
    if (contact) {
      updateContactMutation.mutate({
        id: contact.id,
        data: { status: newStatus },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-foreground">Contatos da Campanha</h3>
            <p className="text-sm text-muted-foreground">
              Gerencie contatos atribuídos a esta campanha
            </p>
          </div>
          <Button onClick={onAddContacts}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Contatos
          </Button>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar contatos por nome, telefone ou tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as 'active' | 'paused' | 'removed' | undefined)}
          >
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="paused">Pausado</SelectItem>
              <SelectItem value="removed">Removido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredContacts && filteredContacts.length > 0 ? (
          <div className="space-y-3">
            {filteredContacts.map((campaignContact) => {
              if (!campaignContact.contact) return null;

              const contact = campaignContact.contact;

              return (
                <Card key={campaignContact.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-foreground">{contact.name}</h4>
                            {contact.is_business && (
                              <Badge variant="outline" className="text-xs">
                                Negócio
                              </Badge>
                            )}
                            <Badge
                              variant={
                                campaignContact.status === 'active'
                                  ? 'default'
                                  : campaignContact.status === 'paused'
                                  ? 'secondary'
                                  : 'destructive'
                              }
                              className="text-xs"
                            >
                              {campaignContact.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{contact.phone}</p>
                          {campaignContact.tags.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {campaignContact.tags.map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {campaignContact.notes && (
                            <p className="text-sm text-muted-foreground italic">
                              {campaignContact.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Select
                          value={campaignContact.status}
                          onValueChange={(value) =>
                            handleStatusChange(contact.id, value as 'active' | 'paused' | 'removed')
                          }
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Ativo</SelectItem>
                            <SelectItem value="paused">Pausado</SelectItem>
                            <SelectItem value="removed">Removido</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleRemoveContact(contact.id)}
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhum Contato Ainda</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                {searchQuery
                  ? 'Nenhum contato corresponde aos seus critérios de busca.'
                  : 'Adicione contatos a esta campanha para começar a enviar mensagens direcionadas.'}
              </p>
              {!searchQuery && (
                <Button onClick={onAddContacts}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Seu Primeiro Contato
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={!!contactToRemove} onOpenChange={() => setContactToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Contato da Campanha?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the contact from this campaign. The contact will still exist in your
              contacts list. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveContact}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
