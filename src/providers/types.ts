// ===========================================
// ZapManager - Provider Interface
// ===========================================
// This interface defines the contract that all
// WhatsApp providers (Z-API, Evolution, etc.) must implement

import type {
  Group,
  GroupMetadata,
  InstanceStatus,
  QRCode,
  MessageResult,
  SendTextParams,
  SendMediaParams,
  SendDocumentParams,
  SendLinkParams,
} from '@/core/types';

// ===========================================
// Groups Provider Interface
// ===========================================

export interface IGroupsProvider {
  /**
   * List all groups from the WhatsApp instance
   */
  list(): Promise<Group[]>;

  /**
   * Get group metadata from an invite URL
   */
  getMetadata(inviteUrl: string): Promise<GroupMetadata>;

  /**
   * Create a new group
   */
  create(groupName: string, phones: string[]): Promise<{ phone: string }>;

  /**
   * Update group name
   */
  updateName(groupId: string, groupName: string): Promise<void>;

  /**
   * Update group photo
   */
  updatePhoto(groupId: string, groupPhoto: string): Promise<void>;

  /**
   * Update group description
   */
  updateDescription(groupId: string, groupDescription: string): Promise<void>;

  /**
   * Add participants to a group
   */
  addParticipant(groupId: string, phones: string[], autoInvite?: boolean): Promise<void>;

  /**
   * Remove participants from a group
   */
  removeParticipant(groupId: string, phones: string[]): Promise<void>;

  /**
   * Get group invite link
   */
  getInviteLink(groupId: string): Promise<string>;

  /**
   * Pin a message in a group
   */
  pinMessage(groupId: string, messageId: string): Promise<void>;

  /**
   * Unpin a message from a group
   */
  unpinMessage(groupId: string, messageId: string): Promise<void>;
}

// ===========================================
// Messages Provider Interface
// ===========================================

export interface IMessagesProvider {
  /**
   * Send a text message
   */
  sendText(params: SendTextParams): Promise<MessageResult>;

  /**
   * Send an image
   */
  sendImage(params: SendMediaParams): Promise<MessageResult>;

  /**
   * Send a video
   */
  sendVideo(params: SendMediaParams): Promise<MessageResult>;

  /**
   * Send an audio
   */
  sendAudio(params: Omit<SendMediaParams, 'caption'>): Promise<MessageResult>;

  /**
   * Send a document
   */
  sendDocument(params: SendDocumentParams): Promise<MessageResult>;

  /**
   * Send a link with preview
   */
  sendLink(params: SendLinkParams): Promise<MessageResult>;

  /**
   * Send a poll/enquete
   */
  sendPoll(params: SendPollParams): Promise<MessageResult>;

  /**
   * Delete a message
   */
  deleteMessage(phone: string, messageId: string): Promise<void>;
}

// ===========================================
// Instance Provider Interface
// ===========================================

export interface IInstanceProvider {
  /**
   * Get instance connection status
   */
  getStatus(): Promise<InstanceStatus>;

  /**
   * Get QR code for connection
   */
  getQRCode(): Promise<QRCode>;

  /**
   * Disconnect the instance
   */
  disconnect(): Promise<void>;

  /**
   * Restart the instance
   */
  restart(): Promise<void>;
}

// ===========================================
// Contacts Provider Interface
// ===========================================

export interface Contact {
  id: string;
  phone: string;
  name: string;
  profile_pic_url?: string;
  is_business: boolean;
  is_blocked: boolean;
  is_group: boolean;
  status?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ValidationResult {
  phone: string;
  is_valid: boolean;
  is_business: boolean;
  error?: string;
}

export interface IContactsProvider {
  /**
   * List all contacts
   */
  list(): Promise<Contact[]>;

  /**
   * Add a new contact
   */
  add(phone: string, name?: string): Promise<Contact>;

  /**
   * Block a contact
   */
  block(phone: string): Promise<void>;

  /**
   * Unblock a contact
   */
  unblock(phone: string): Promise<void>;

  /**
   * Report a contact as spam
   */
  report(phone: string): Promise<void>;

  /**
   * Validate phone numbers in batch
   */
  validateNumbers(phones: string[]): Promise<ValidationResult[]>;
}

// ===========================================
// Combined Provider Interface
// ===========================================

export interface IWhatsAppProvider {
  readonly name: string;
  readonly groups: IGroupsProvider;
  readonly messages: IMessagesProvider;
  readonly instance: IInstanceProvider;
  readonly contacts: IContactsProvider;
}

// ===========================================
// Provider Configuration
// ===========================================

export interface ProviderConfig {
  type: 'zapi' | 'evolution';
  // Z-API specific
  zapiInstanceId?: string;
  zapiToken?: string;
  zapiClientToken?: string;
  // Evolution specific
  evolutionApiUrl?: string;
  evolutionApiKey?: string;
  evolutionInstanceName?: string;
}
