import type {
  IWhatsAppProvider,
  IGroupsProvider,
  IMessagesProvider,
  IInstanceProvider,
  IContactsProvider,
  Contact,
  ValidationResult,
} from '../types';
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
  SendPollParams,
} from '@/core/types';
import { getEvolutionConfig } from '@/config/evolution.config';

class EvolutionAPIClient {
  private baseUrl: string;
  private apiKey: string;
  private instanceName: string;

  constructor() {
    const config = getEvolutionConfig();
    if (!config) {
      throw new Error('Evolution API not configured. Please set VITE_EVOLUTION_API_URL, VITE_EVOLUTION_API_KEY, and VITE_EVOLUTION_INSTANCE_NAME');
    }
    this.baseUrl = config.apiUrl;
    this.apiKey = config.apiKey;
    this.instanceName = config.instanceName;
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'apikey': this.apiKey,
    };
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Evolution API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }
}

class EvolutionGroupsProvider implements IGroupsProvider {
  private client: EvolutionAPIClient;

  constructor(client: EvolutionAPIClient) {
    this.client = client;
  }

  async list(): Promise<Group[]> {
    const config = getEvolutionConfig();
    if (!config) throw new Error('Evolution API not configured');

    const response = await this.client.request<any>(
      `/group/fetchAllGroups/${config.instanceName}`
    );

    return response.map((g: any) => ({
      isGroup: true,
      name: g.subject || g.name || 'Sem Nome',
      phone: g.id.split('@')[0],
      unread: '0',
      lastMessageTime: g.lastMessageTimestamp ? String(g.lastMessageTimestamp) : '',
      isMuted: g.mute ? 'true' : 'false',
      isMarkedSpam: 'false',
      archived: g.archived ? 'true' : 'false',
      pinned: g.pinned ? 'true' : 'false',
      muteEndTime: g.muteEndTime || null,
    }));
  }

  async getMetadata(inviteUrl: string): Promise<GroupMetadata> {
    const config = getEvolutionConfig();
    if (!config) throw new Error('Evolution API not configured');

    const response = await this.client.request<any>(
      `/group/inviteInfo/${config.instanceName}`,
      {
        method: 'POST',
        body: JSON.stringify({ inviteCode: inviteUrl }),
      }
    );

    return {
      phone: response.id?.split('@')[0] || '',
      owner: response.owner || '',
      subject: response.subject || 'Sem Nome',
      description: response.desc || response.description || '',
      creation: response.creation || Date.now(),
      invitationLink: inviteUrl,
      contactsCount: response.size || 0,
      participantsCount: response.size || 0,
      participants: (response.participants || []).map((p: any) => ({
        phone: p.id?.split('@')[0] || p.phone || '',
        isAdmin: p.isAdmin || false,
        isSuperAdmin: p.isSuperAdmin || false,
      })),
    };
  }

  async create(groupName: string, phones: string[]): Promise<{ phone: string }> {
    const config = getEvolutionConfig();
    if (!config) throw new Error('Evolution API not configured');

    const response = await this.client.request<any>(
      `/group/create/${config.instanceName}`,
      {
        method: 'POST',
        body: JSON.stringify({
          subject: groupName,
          participants: phones,
        }),
      }
    );

    return { phone: response.id };
  }

  async updateName(groupId: string, groupName: string): Promise<void> {
    const config = getEvolutionConfig();
    if (!config) throw new Error('Evolution API not configured');

    await this.client.request(
      `/group/updateGroupSubject/${config.instanceName}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          groupJid: groupId,
          subject: groupName,
        }),
      }
    );
  }

  async updatePhoto(groupId: string, groupPhoto: string): Promise<void> {
    const config = getEvolutionConfig();
    if (!config) throw new Error('Evolution API not configured');

    await this.client.request(
      `/group/updateGroupPicture/${config.instanceName}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          groupJid: groupId,
          image: groupPhoto,
        }),
      }
    );
  }

  async updateDescription(groupId: string, groupDescription: string): Promise<void> {
    const config = getEvolutionConfig();
    if (!config) throw new Error('Evolution API not configured');

    await this.client.request(
      `/group/updateGroupDescription/${config.instanceName}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          groupJid: groupId,
          description: groupDescription,
        }),
      }
    );
  }

  async addParticipant(groupId: string, phones: string[], autoInvite?: boolean): Promise<void> {
    const config = getEvolutionConfig();
    if (!config) throw new Error('Evolution API not configured');

    await this.client.request(
      `/group/updateGroupParticipant/${config.instanceName}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          groupJid: groupId,
          action: 'add',
          participants: phones,
        }),
      }
    );
  }

  async removeParticipant(groupId: string, phones: string[]): Promise<void> {
    const config = getEvolutionConfig();
    if (!config) throw new Error('Evolution API not configured');

    await this.client.request(
      `/group/updateGroupParticipant/${config.instanceName}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          groupJid: groupId,
          action: 'remove',
          participants: phones,
        }),
      }
    );
  }

  async getInviteLink(groupId: string): Promise<string> {
    const config = getEvolutionConfig();
    if (!config) throw new Error('Evolution API not configured');

    const response = await this.client.request<any>(
      `/group/inviteCode/${config.instanceName}`,
      {
        method: 'POST',
        body: JSON.stringify({ groupJid: groupId }),
      }
    );

    return response.inviteCode || response.code;
  }

  async pinMessage(groupId: string, messageId: string): Promise<void> {
    const config = getEvolutionConfig();
    if (!config) throw new Error('Evolution API not configured');

    await this.client.request(
      `/chat/updateMessage/${config.instanceName}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          remoteJid: groupId,
          messageId: messageId,
          action: 'pin',
        }),
      }
    );
  }

  async unpinMessage(groupId: string, messageId: string): Promise<void> {
    const config = getEvolutionConfig();
    if (!config) throw new Error('Evolution API not configured');

    await this.client.request(
      `/chat/updateMessage/${config.instanceName}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          remoteJid: groupId,
          messageId: messageId,
          action: 'unpin',
        }),
      }
    );
  }
}

class EvolutionMessagesProvider implements IMessagesProvider {
  private client: EvolutionAPIClient;

  constructor(client: EvolutionAPIClient) {
    this.client = client;
  }

  async sendText(params: SendTextParams): Promise<MessageResult> {
    const config = getEvolutionConfig();
    if (!config) throw new Error('Evolution API not configured');

    const response = await this.client.request<any>(
      `/message/sendText/${config.instanceName}`,
      {
        method: 'POST',
        body: JSON.stringify({
          number: params.phone,
          text: params.message,
          delay: params.delayMessage || 0,
        }),
      }
    );

    return {
      success: true,
      messageId: response.key?.id || response.messageId,
    };
  }

  async sendImage(params: SendMediaParams): Promise<MessageResult> {
    const config = getEvolutionConfig();
    if (!config) throw new Error('Evolution API not configured');

    const response = await this.client.request<any>(
      `/message/sendMedia/${config.instanceName}`,
      {
        method: 'POST',
        body: JSON.stringify({
          number: params.phone,
          mediatype: 'image',
          media: params.mediaUrl,
          caption: params.caption || '',
        }),
      }
    );

    return {
      success: true,
      messageId: response.key?.id || response.messageId,
    };
  }

  async sendVideo(params: SendMediaParams): Promise<MessageResult> {
    const config = getEvolutionConfig();
    if (!config) throw new Error('Evolution API not configured');

    const response = await this.client.request<any>(
      `/message/sendMedia/${config.instanceName}`,
      {
        method: 'POST',
        body: JSON.stringify({
          number: params.phone,
          mediatype: 'video',
          media: params.mediaUrl,
          caption: params.caption || '',
        }),
      }
    );

    return {
      success: true,
      messageId: response.key?.id || response.messageId,
    };
  }

  async sendAudio(params: Omit<SendMediaParams, 'caption'>): Promise<MessageResult> {
    const config = getEvolutionConfig();
    if (!config) throw new Error('Evolution API not configured');

    const response = await this.client.request<any>(
      `/message/sendWhatsAppAudio/${config.instanceName}`,
      {
        method: 'POST',
        body: JSON.stringify({
          number: params.phone,
          audio: params.mediaUrl,
        }),
      }
    );

    return {
      success: true,
      messageId: response.key?.id || response.messageId,
    };
  }

  async sendDocument(params: SendDocumentParams): Promise<MessageResult> {
    const config = getEvolutionConfig();
    if (!config) throw new Error('Evolution API not configured');

    const response = await this.client.request<any>(
      `/message/sendMedia/${config.instanceName}`,
      {
        method: 'POST',
        body: JSON.stringify({
          number: params.phone,
          mediatype: 'document',
          media: params.documentUrl,
          fileName: params.fileName,
        }),
      }
    );

    return {
      success: true,
      messageId: response.key?.id || response.messageId,
    };
  }

  async sendLink(params: SendLinkParams): Promise<MessageResult> {
    const config = getEvolutionConfig();
    if (!config) throw new Error('Evolution API not configured');

    const messageText = params.linkDescription
      ? `${params.message}\n\n${params.linkUrl}`
      : params.linkUrl;

    const response = await this.client.request<any>(
      `/message/sendText/${config.instanceName}`,
      {
        method: 'POST',
        body: JSON.stringify({
          number: params.phone,
          text: messageText,
        }),
      }
    );

    return {
      success: true,
      messageId: response.key?.id || response.messageId,
    };
  }

  async sendPoll(params: SendPollParams): Promise<MessageResult> {
    const config = getEvolutionConfig();
    if (!config) throw new Error('Evolution API not configured');

    const response = await this.client.request<any>(
      `/message/sendPoll/${config.instanceName}`,
      {
        method: 'POST',
        body: JSON.stringify({
          number: params.phone,
          name: params.pollName,
          selectableCount: params.multipleAnswers ? params.pollOptions.length : 1,
          values: params.pollOptions,
        }),
      }
    );

    return {
      success: true,
      messageId: response.key?.id || response.messageId,
    };
  }

  async deleteMessage(phone: string, messageId: string): Promise<void> {
    const config = getEvolutionConfig();
    if (!config) throw new Error('Evolution API not configured');

    await this.client.request(
      `/message/delete/${config.instanceName}`,
      {
        method: 'DELETE',
        body: JSON.stringify({
          remoteJid: phone,
          id: messageId,
        }),
      }
    );
  }
}

class EvolutionContactsProvider implements IContactsProvider {
  private client: EvolutionAPIClient;

  constructor(client: EvolutionAPIClient) {
    this.client = client;
  }

  async list(): Promise<Contact[]> {
    const config = getEvolutionConfig();
    if (!config) throw new Error('Evolution API not configured');

    const response = await this.client.request<any>(
      `/chat/findContacts/${config.instanceName}`
    );

    return (response || []).map((c: any) => ({
      id: c.id || c.phone,
      phone: c.id?.split('@')[0] || c.phone,
      name: c.name || c.pushName || '',
      profile_pic_url: c.profilePicUrl || undefined,
      is_business: c.isBusiness || false,
      is_blocked: false,
      is_group: false,
      status: c.status || undefined,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  }

  async add(phone: string, name?: string): Promise<Contact> {
    const config = getEvolutionConfig();
    if (!config) throw new Error('Evolution API not configured');

    const now = new Date().toISOString();
    return {
      id: phone,
      phone: phone,
      name: name || '',
      is_business: false,
      is_blocked: false,
      is_group: false,
      created_at: now,
      updated_at: now,
    };
  }

  async block(phone: string): Promise<void> {
    const config = getEvolutionConfig();
    if (!config) throw new Error('Evolution API not configured');

    await this.client.request(
      `/chat/updatePresence/${config.instanceName}`,
      {
        method: 'POST',
        body: JSON.stringify({
          number: phone,
          action: 'block',
        }),
      }
    );
  }

  async unblock(phone: string): Promise<void> {
    const config = getEvolutionConfig();
    if (!config) throw new Error('Evolution API not configured');

    await this.client.request(
      `/chat/updatePresence/${config.instanceName}`,
      {
        method: 'POST',
        body: JSON.stringify({
          number: phone,
          action: 'unblock',
        }),
      }
    );
  }

  async report(phone: string): Promise<void> {
    throw new Error('Report contact not supported in Evolution API');
  }

  async validateNumbers(phones: string[]): Promise<ValidationResult[]> {
    const config = getEvolutionConfig();
    if (!config) throw new Error('Evolution API not configured');

    return Promise.all(
      phones.map(async (phone) => {
        try {
          const response = await this.client.request<any>(
            `/chat/whatsappNumbers/${config.instanceName}`,
            {
              method: 'POST',
              body: JSON.stringify({ numbers: [phone] }),
            }
          );

          const result = response?.[0] || {};
          return {
            phone,
            is_valid: result.exists || false,
            is_business: result.isBusiness || false,
          };
        } catch (error) {
          return {
            phone,
            is_valid: false,
            is_business: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );
  }
}

class EvolutionInstanceProvider implements IInstanceProvider {
  private client: EvolutionAPIClient;

  constructor(client: EvolutionAPIClient) {
    this.client = client;
  }

  async getStatus(): Promise<InstanceStatus> {
    const config = getEvolutionConfig();
    if (!config) throw new Error('Evolution API not configured');

    const response = await this.client.request<any>(
      `/instance/connectionState/${config.instanceName}`
    );

    const state = response.state || response.status;
    const isConnected = state === 'open' || state === 'connected';

    return {
      connected: isConnected,
      session: isConnected,
      smartphoneConnected: isConnected,
    };
  }

  async getQRCode(): Promise<QRCode> {
    const config = getEvolutionConfig();
    if (!config) throw new Error('Evolution API not configured');

    const response = await this.client.request<any>(
      `/instance/connect/${config.instanceName}`
    );

    return {
      value: response.qrcode?.base64 || response.base64 || response.qrcode || '',
    };
  }

  async disconnect(): Promise<void> {
    const config = getEvolutionConfig();
    if (!config) throw new Error('Evolution API not configured');

    await this.client.request(
      `/instance/logout/${config.instanceName}`,
      {
        method: 'DELETE',
      }
    );
  }

  async restart(): Promise<void> {
    const config = getEvolutionConfig();
    if (!config) throw new Error('Evolution API not configured');

    await this.client.request(
      `/instance/restart/${config.instanceName}`,
      {
        method: 'PUT',
      }
    );
  }
}

export class EvolutionProvider implements IWhatsAppProvider {
  readonly name = 'Evolution API';
  readonly groups: IGroupsProvider;
  readonly messages: IMessagesProvider;
  readonly instance: IInstanceProvider;
  readonly contacts: IContactsProvider;
  private client: EvolutionAPIClient;

  constructor() {
    try {
      this.client = new EvolutionAPIClient();
      this.groups = new EvolutionGroupsProvider(this.client);
      this.messages = new EvolutionMessagesProvider(this.client);
      this.instance = new EvolutionInstanceProvider(this.client);
      this.contacts = new EvolutionContactsProvider(this.client);
    } catch (error) {
      console.warn('Evolution API not configured:', error);
      throw error;
    }
  }
}

export const createEvolutionProvider = (): EvolutionProvider | null => {
  try {
    return new EvolutionProvider();
  } catch {
    return null;
  }
};

export const evolutionProvider = createEvolutionProvider();
