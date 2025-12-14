import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CampaignWithStats } from '@/hooks/use-campaign-details';
import { Users, MessageSquare, Link2, Send, MoreVertical, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CampaignCardProps {
  campaign: CampaignWithStats;
  onManage: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  variant?: 'default' | 'compact' | 'detailed';
}

export function CampaignCard({
  campaign,
  onManage,
  onEdit,
  onDelete,
  variant = 'default',
}: CampaignCardProps) {
  if (variant === 'compact') {
    return (
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onManage}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{campaign.name}</CardTitle>
              {campaign.description && (
                <CardDescription className="line-clamp-1">{campaign.description}</CardDescription>
              )}
            </div>
            <Badge variant={campaign.is_active ? 'default' : 'secondary'}>
              {campaign.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {campaign.stats?.total_contacts || 0}
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              {campaign.stats?.total_groups || 0}
            </div>
            <div className="flex items-center gap-1">
              <Send className="h-4 w-4" />
              {campaign.stats?.messages_sent_week || 0}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle>{campaign.name}</CardTitle>
              <Badge variant={campaign.is_active ? 'default' : 'secondary'}>
                {campaign.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            {campaign.description && (
              <CardDescription className="line-clamp-2">{campaign.description}</CardDescription>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onManage}>
                <Settings className="mr-2 h-4 w-4" />
                Manage Campaign
              </DropdownMenuItem>
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  Edit Details
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="text-destructive">
                    Delete Campaign
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-sm">Contacts</span>
            </div>
            <p className="text-2xl font-bold">{campaign.stats?.total_contacts || 0}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              <span className="text-sm">Groups</span>
            </div>
            <p className="text-2xl font-bold">{campaign.stats?.total_groups || 0}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Link2 className="h-4 w-4" />
              <span className="text-sm">Links</span>
            </div>
            <p className="text-2xl font-bold">{campaign.stats?.total_smart_links || 0}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Send className="h-4 w-4" />
              <span className="text-sm">This Week</span>
            </div>
            <p className="text-2xl font-bold">{campaign.stats?.messages_sent_week || 0}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={onManage} className="flex-1">
            Gerenciar Campanha
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
