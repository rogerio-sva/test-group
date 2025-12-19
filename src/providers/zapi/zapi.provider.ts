// ===========================================
// ZapManager - Z-API Provider Implementation
// ===========================================

import { supabase } from '@/integrations/supabase/client';
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

// ===========================================
// Z-API Groups Provider
// ===========================================

class ZAPIGroupsProvider implements IGroupsProvider {
  async list(): Promise<Group[]> {
    const { data, error } = await supabase.functions.invoke('zapi-groups', {
      body: { action: 'list' },
    });
    if (error) throw error;
    return data;
  }

  async getMetadata(inviteUrl: string): Promise<GroupMetadata> {
    const { data, error } = await supabase.functions.invoke('zapi-groups', {
      body: { action: 'metadata', inviteUrl },
    });
    if (error) throw error;
    return data;
  }

  async create(groupName: string, phones: string[]): Promise<{ phone: string }> {
    const { data, error } = await supabase.functions.invoke('zapi-groups', {
      body: { action: 'create', groupName, phones },
    });
    if (error) throw error;
    return data;
  }

  async updateName(groupId: string, groupName: string): Promise<void> {
    const { error } = await supabase.functions.invoke('zapi-groups', {
      body: { action: 'updateName', groupId, groupName },
    });
    if (error) throw error;
  }

  async updatePhoto(groupId: string, groupPhoto: string): Promise<void> {
    const { error } = await supabase.functions.invoke('zapi-groups', {
      body: { action: 'updatePhoto', groupId, groupPhoto },
    });
    if (error) throw error;
  }

  async updateDescription(groupId: string, groupDescription: string): Promise<void> {
    const { error } = await supabase.functions.invoke('zapi-groups', {
      body: { action: 'updateDescription', groupId, groupDescription },
    });
    if (error) throw error;
  }

  async addParticipant(groupId: string, phones: string[], autoInvite = true): Promise<void> {
    const { error } = await supabase.functions.invoke('zapi-groups', {
      body: { action: 'addParticipant', groupId, phones, autoInvite },
    });
    if (error) throw error;
  }

  async removeParticipant(groupId: string, phones: string[]): Promise<void> {
    const { error } = await supabase.functions.invoke('zapi-groups', {
      body: { action: 'removeParticipant', groupId, phones },
    });
    if (error) throw error;
  }

  async getInviteLink(groupId: string): Promise<string> {
    console.log(`[ZAPIGroupsProvider.getInviteLink] Requesting invite link for group: ${groupId}`);

    const { data, error } = await supabase.functions.invoke('zapi-groups', {
      body: { action: 'getInviteLink', groupId },
    });

    if (error) {
      console.error(`[ZAPIGroupsProvider.getInviteLink] Supabase function error:`, error);
      throw new Error(`Failed to get invite link: ${error.message || 'Unknown error'}`);
    }

    console.log(`[ZAPIGroupsProvider.getInviteLink] Response data:`, data);

    if (data?.error) {
      console.error(`[ZAPIGroupsProvider.getInviteLink] Z-API error in response:`, data.error);
      throw new Error(`Z-API error: ${data.error}`);
    }

    const inviteLink = data?.invitationLink || data?.link;

    if (!inviteLink) {
      console.error(`[ZAPIGroupsProvider.getInviteLink] No invitation link in response:`, data);
      throw new Error('No invitation link returned by Z-API');
    }

    console.log(`[ZAPIGroupsProvider.getInviteLink] Successfully retrieved: ${inviteLink}`);
    return inviteLink;
  }

  async pinMessage(groupId: string, messageId: string): Promise<void> {
    const { error } = await supabase.functions.invoke('zapi-groups', {
      body: { action: 'pinMessage', groupId, messageId },
    });
    if (error) throw error;
  }

  async unpinMessage(groupId: string, messageId: string): Promise<void> {
    const { error } = await supabase.functions.invoke('zapi-groups', {
      body: { action: 'unpinMessage', groupId, messageId },
    });
    if (error) throw error;
  }
}

// ===========================================
// Z-API Messages Provider
// ===========================================

class ZAPIMessagesProvider implements IMessagesProvider {
  async sendText(params: SendTextParams): Promise<MessageResult> {
    const { data, error } = await supabase.functions.invoke('zapi-messages', {
      body: {
        action: 'sendText',
        phone: params.phone,
        message: params.message,
        delayMessage: params.delayMessage,
        mentionsEveryOne: params.mentionsEveryOne,
      },
    });
    if (error) return { success: false, error: error.message };
    return { success: true, messageId: data.zapiMessageId || data.messageId };
  }

  async sendImage(params: SendMediaParams): Promise<MessageResult> {
    const { data, error } = await supabase.functions.invoke('zapi-messages', {
      body: {
        action: 'sendImage',
        phone: params.phone,
        image: params.mediaUrl,
        caption: params.caption,
        mentionsEveryOne: params.mentionsEveryOne,
      },
    });
    if (error) return { success: false, error: error.message };
    return { success: true, messageId: data.zapiMessageId || data.messageId };
  }

  async sendVideo(params: SendMediaParams): Promise<MessageResult> {
    const { data, error } = await supabase.functions.invoke('zapi-messages', {
      body: {
        action: 'sendVideo',
        phone: params.phone,
        video: params.mediaUrl,
        caption: params.caption,
        mentionsEveryOne: params.mentionsEveryOne,
      },
    });
    if (error) return { success: false, error: error.message };
    return { success: true, messageId: data.zapiMessageId || data.messageId };
  }

  async sendAudio(params: Omit<SendMediaParams, 'caption'>): Promise<MessageResult> {
    const { data, error } = await supabase.functions.invoke('zapi-messages', {
      body: {
        action: 'sendAudio',
        phone: params.phone,
        audio: params.mediaUrl,
        mentionsEveryOne: params.mentionsEveryOne,
      },
    });
    if (error) return { success: false, error: error.message };
    return { success: true, messageId: data.zapiMessageId || data.messageId };
  }

  async sendDocument(params: SendDocumentParams): Promise<MessageResult> {
    const { data, error } = await supabase.functions.invoke('zapi-messages', {
      body: {
        action: 'sendDocument',
        phone: params.phone,
        document: params.documentUrl,
        fileName: params.fileName,
        mentionsEveryOne: params.mentionsEveryOne,
      },
    });
    if (error) return { success: false, error: error.message };
    return { success: true, messageId: data.zapiMessageId || data.messageId };
  }

  async sendLink(params: SendLinkParams): Promise<MessageResult> {
    const { data, error } = await supabase.functions.invoke('zapi-messages', {
      body: {
        action: 'sendLink',
        phone: params.phone,
        message: params.message,
        linkUrl: params.linkUrl,
        title: params.title,
        linkDescription: params.linkDescription,
        image: params.image,
      },
    });
    if (error) return { success: false, error: error.message };
    return { success: true, messageId: data.zapiMessageId || data.messageId };
  }

  async sendPoll(params: SendPollParams): Promise<MessageResult> {
    const { data, error } = await supabase.functions.invoke('zapi-messages', {
      body: {
        action: 'sendPoll',
        phone: params.phone,
        pollName: params.pollName,
        pollOptions: params.pollOptions,
        multipleAnswers: params.multipleAnswers,
      },
    });
    if (error) return { success: false, error: error.message };
    return { success: true, messageId: data.zapiMessageId || data.messageId };
  }

  async deleteMessage(phone: string, messageId: string): Promise<void> {
    const { error } = await supabase.functions.invoke('zapi-messages', {
      body: {
        action: 'deleteMessage',
        phone,
        messageId,
      },
    });
    if (error) throw error;
  }
}

// ===========================================
// Z-API Instance Provider
// ===========================================

class ZAPIInstanceProvider implements IInstanceProvider {
  async getStatus(): Promise<InstanceStatus> {
    const { data, error } = await supabase.functions.invoke('zapi-instance', {
      body: { action: 'status' },
    });
    if (error) throw error;
    return data;
  }

  async getQRCode(): Promise<QRCode> {
    const { data, error } = await supabase.functions.invoke('zapi-instance', {
      body: { action: 'qrcode' },
    });
    if (error) throw error;
    return data;
  }

  async disconnect(): Promise<void> {
    const { error } = await supabase.functions.invoke('zapi-instance', {
      body: { action: 'disconnect' },
    });
    if (error) throw error;
  }

  async restart(): Promise<void> {
    const { error } = await supabase.functions.invoke('zapi-instance', {
      body: { action: 'restart' },
    });
    if (error) throw error;
  }
}

// ===========================================
// Z-API Contacts Provider
// ===========================================

class ZAPIContactsProvider implements IContactsProvider {
  async list(): Promise<Contact[]> {
    const { data, error } = await supabase.functions.invoke('zapi-contacts', {
      body: { action: 'list' },
    });
    if (error) throw error;
    return data.contacts || [];
  }

  async add(phone: string, name?: string): Promise<Contact> {
    const { data, error } = await supabase.functions.invoke('zapi-contacts', {
      body: { action: 'add', phone, name },
    });
    if (error) throw error;
    return data.contact;
  }

  async block(phone: string): Promise<void> {
    const { error } = await supabase.functions.invoke('zapi-contacts', {
      body: { action: 'block', phone },
    });
    if (error) throw error;
  }

  async unblock(phone: string): Promise<void> {
    const { error } = await supabase.functions.invoke('zapi-contacts', {
      body: { action: 'unblock', phone },
    });
    if (error) throw error;
  }

  async report(phone: string): Promise<void> {
    const { error } = await supabase.functions.invoke('zapi-contacts', {
      body: { action: 'report', phone },
    });
    if (error) throw error;
  }

  async validateNumbers(phones: string[]): Promise<ValidationResult[]> {
    const { data, error } = await supabase.functions.invoke('zapi-contacts', {
      body: { action: 'validateNumbers', phones },
    });
    if (error) throw error;
    return data.validationResults || [];
  }
}

// ===========================================
// Z-API Provider
// ===========================================

export class ZAPIProvider implements IWhatsAppProvider {
  readonly name = 'Z-API';
  readonly groups: IGroupsProvider;
  readonly messages: IMessagesProvider;
  readonly instance: IInstanceProvider;
  readonly contacts: IContactsProvider;

  constructor() {
    this.groups = new ZAPIGroupsProvider();
    this.messages = new ZAPIMessagesProvider();
    this.instance = new ZAPIInstanceProvider();
    this.contacts = new ZAPIContactsProvider();
  }
}

// Singleton instance
export const zapiProvider = new ZAPIProvider();
