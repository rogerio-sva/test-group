import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useCampaignWithStats } from '@/hooks/use-campaign-details';
import { CampaignOverview } from '@/components/campaigns/CampaignOverview';
import { CampaignGroupsTab } from '@/components/campaigns/CampaignGroupsTab';
import { CampaignContactsTab } from '@/components/campaigns/CampaignContactsTab';
import { CampaignMessagesTab } from '@/components/campaigns/CampaignMessagesTab';
import { CampaignLinksTab } from '@/components/campaigns/CampaignLinksTab';
import { CampaignSettingsTab } from '@/components/campaigns/CampaignSettingsTab';
import {
  BarChart3,
  Users,
  UserCircle,
  MessageSquare,
  Link2,
  Settings,
  ArrowLeft,
} from 'lucide-react';
import NotFound from './NotFound';

export default function CampaignDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') || 'overview';

  const { data: campaign, isLoading, error } = useCampaignWithStats(id);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const handleSendMessage = () => {
    navigate('/messages', { state: { campaignId: id } });
  };

  const handleAddContacts = () => {
    navigate('/contacts', { state: { campaignId: id } });
  };

  const handleCreateLink = () => {
    navigate('/smart-links', { state: { campaignId: id } });
  };

  const handleAddGroup = () => {
    navigate('/groups', { state: { campaignId: id } });
  };

  const handleSendToGroup = (groupPhone: string) => {
    navigate('/messages', { state: { campaignId: id, selectedGroup: groupPhone } });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-12 w-full" />
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !campaign) {
    return <NotFound />;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/campaigns">Campaigns</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{campaign.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/campaigns')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{campaign.name}</h1>
                <Badge variant={campaign.is_active ? 'default' : 'secondary'}>
                  {campaign.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="groups" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Groups</span>
            </TabsTrigger>
            <TabsTrigger value="contacts" className="gap-2">
              <UserCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Contacts</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Messages</span>
            </TabsTrigger>
            <TabsTrigger value="links" className="gap-2">
              <Link2 className="h-4 w-4" />
              <span className="hidden sm:inline">Links</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <CampaignOverview
              campaignId={id!}
              stats={campaign.stats!}
              onSendMessage={handleSendMessage}
              onAddContacts={handleAddContacts}
              onCreateLink={handleCreateLink}
            />
          </TabsContent>

          <TabsContent value="groups" className="space-y-4">
            <CampaignGroupsTab
              campaignId={id!}
              onAddGroup={handleAddGroup}
              onSendToGroup={handleSendToGroup}
            />
          </TabsContent>

          <TabsContent value="contacts" className="space-y-4">
            <CampaignContactsTab campaignId={id!} onAddContacts={handleAddContacts} />
          </TabsContent>

          <TabsContent value="messages" className="space-y-4">
            <CampaignMessagesTab campaignId={id!} onSendMessage={handleSendMessage} />
          </TabsContent>

          <TabsContent value="links" className="space-y-4">
            <CampaignLinksTab campaignId={id!} onCreateLink={handleCreateLink} />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <CampaignSettingsTab campaignId={id!} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
