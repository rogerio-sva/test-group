import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { GroupCard } from '@/components/groups/GroupCard';
import { useCampaignGroups, useRemoveGroupFromCampaign, useUpdateCampaignGroup } from '@/hooks/use-campaign-groups';
import { Users, Plus, Copy, Send, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
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

interface CampaignGroupsTabProps {
  campaignId: string;
  onAddGroup: () => void;
  onSendToGroup: (groupPhone: string) => void;
}

export function CampaignGroupsTab({ campaignId, onAddGroup, onSendToGroup }: CampaignGroupsTabProps) {
  const { data: groups, isLoading } = useCampaignGroups(campaignId);
  const removeGroupMutation = useRemoveGroupFromCampaign();
  const updateGroupMutation = useUpdateCampaignGroup();

  const [groupToRemove, setGroupToRemove] = useState<string | null>(null);

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success('Invite link copied to clipboard');
  };

  const handleToggleActive = (groupId: string, currentStatus: boolean) => {
    updateGroupMutation.mutate({
      id: groupId,
      data: { is_active: !currentStatus },
    });
  };

  const handleRemoveGroup = (groupId: string) => {
    setGroupToRemove(groupId);
  };

  const confirmRemoveGroup = () => {
    if (groupToRemove) {
      removeGroupMutation.mutate({
        campaignId,
        groupId: groupToRemove,
      });
      setGroupToRemove(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Campaign Groups</h3>
            <p className="text-sm text-muted-foreground">
              Manage WhatsApp groups linked to this campaign
            </p>
          </div>
          <Button onClick={onAddGroup}>
            <Plus className="mr-2 h-4 w-4" />
            Add Group
          </Button>
        </div>

        {groups && groups.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => {
              const isFull = group.current_members >= group.member_limit;
              const fillPercentage = (group.current_members / group.member_limit) * 100;

              return (
                <Card key={group.id} className={!group.is_active ? 'opacity-60' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base">{group.group_name}</CardTitle>
                        <CardDescription className="text-xs">
                          Priority: {group.priority}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {!group.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        {isFull && (
                          <Badge variant="destructive">Full</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Members</span>
                        <span className="font-medium">
                          {group.current_members} / {group.member_limit}
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            isFull ? 'bg-destructive' : 'bg-primary'
                          }`}
                          style={{ width: `${Math.min(fillPercentage, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {group.invite_link && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => handleCopyLink(group.invite_link!)}
                        >
                          <Copy className="mr-2 h-3 w-3" />
                          Copy Invite Link
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => onSendToGroup(group.group_phone)}
                      >
                        <Send className="mr-2 h-3 w-3" />
                        Send Message
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleToggleActive(group.id, group.is_active)}
                        >
                          {group.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleRemoveGroup(group.id)}
                        >
                          Remove
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
              <h3 className="text-lg font-medium mb-2">No Groups Yet</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Add WhatsApp groups to this campaign to start sending messages and tracking engagement.
              </p>
              <Button onClick={onAddGroup}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Group
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={!!groupToRemove} onOpenChange={() => setGroupToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Group from Campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the group from this campaign. The group itself will not be deleted
              from WhatsApp. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveGroup}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
