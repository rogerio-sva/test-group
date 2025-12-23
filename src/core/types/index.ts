// ===========================================
// ZapManager - Core Types
// ===========================================

// ===========================================
// Group Types
// ===========================================

export interface Group {
  isGroup: boolean;
  name: string;
  phone: string;
  unread: string;
  lastMessageTime: string;
  isMuted: string;
  isMarkedSpam: string;
  archived: string;
  pinned: string;
  muteEndTime: string | null;
}

export interface GroupMetadata {
  phone: string;
  owner: string;
  subject: string;
  description: string;
  creation: number;
  invitationLink: string;
  contactsCount: number;
  participantsCount: number;
  participants: GroupParticipant[];
}

export interface GroupParticipant {
  phone: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

// ===========================================
// Message Types
// ===========================================

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document';

export interface MessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SendTextParams {
  phone: string;
  message: string;
  delayMessage?: number;
  mentionsEveryOne?: boolean;
}

export interface SendMediaParams {
  phone: string;
  mediaUrl: string;
  caption?: string;
  mentionsEveryOne?: boolean;
}

export interface SendDocumentParams {
  phone: string;
  documentUrl: string;
  fileName?: string;
  mentionsEveryOne?: boolean;
}

export interface SendLinkParams {
  phone: string;
  message: string;
  linkUrl: string;
  title?: string;
  linkDescription?: string;
  image?: string;
}

export interface SendPollParams {
  phone: string;
  pollName: string;
  pollOptions: string[];
  multipleAnswers?: boolean;
}

// ===========================================
// Instance Types
// ===========================================

export interface InstanceStatus {
  connected: boolean;
  session: boolean;
  smartphoneConnected: boolean;
}

export interface QRCode {
  value: string;
}

// ===========================================
// Campaign Types
// ===========================================

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CampaignGroup {
  id: string;
  campaign_id: string;
  group_name: string;
  group_phone: string;
  invite_link: string | null;
  member_limit: number;
  current_members: number;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CampaignWithStats extends Campaign {
  stats?: {
    total_contacts: number;
    total_groups: number;
    total_smart_links: number;
    messages_sent_week: number;
    total_messages_sent: number;
  };
}

export interface CampaignActivity {
  id: string;
  campaign_id: string;
  action_type: string;
  action_data: Record<string, any>;
  performed_at: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface CampaignContact {
  id: string;
  campaign_id: string;
  phone: string;
  name: string | null;
  status: 'active' | 'inactive';
  tags: string[];
  metadata: Record<string, any>;
  added_at: string;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignSettings {
  id: string;
  campaign_id: string;
  auto_rotation: boolean;
  max_members_per_group: number;
  send_delay_seconds: number;
  welcome_message: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ===========================================
// Smart Link Types
// ===========================================

export interface SmartLink {
  id: string;
  campaign_id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  track_clicks: boolean;
  detect_device: boolean;
  redirect_delay: number;
  total_clicks: number;
  created_at: string;
  updated_at: string;
}

export interface SmartLinkClick {
  id: string;
  smart_link_id: string;
  redirected_to_group: string | null;
  device_type: string | null;
  user_agent: string | null;
  ip_address: string | null;
  referrer: string | null;
  created_at: string;
}

// ===========================================
// Message History Types
// ===========================================

export type MessageStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'scheduled';

export interface MessageHistory {
  id: string;
  title: string;
  content: string;
  message_type: MessageType;
  media_url: string | null;
  target_groups: TargetGroup[];
  status: MessageStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  successful_sends: number;
  failed_sends: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface TargetGroup {
  phone: string;
  name: string;
}

export interface MessageSendDetail {
  id: string;
  message_history_id: string;
  group_phone: string;
  group_name: string | null;
  status: 'pending' | 'sent' | 'failed';
  zapi_message_id: string | null;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
}

// ===========================================
// Broadcast Types
// ===========================================

export interface BroadcastParams {
  messageHistoryId: string;
  delayBetween?: number;
  mentionsEveryOne?: boolean;
}

export interface BroadcastProgress {
  totalGroups: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  status: MessageStatus;
}

// ===========================================
// App Configuration Types
// ===========================================

export type AppMode = 'self' | 'hosted';
export type ProviderType = 'zapi' | 'evolution';

export interface AppConfig {
  mode: AppMode;
  provider: ProviderType;
}
