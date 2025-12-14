// ===========================================
// ZapManager - Provider Factory
// ===========================================
// This module exports the appropriate provider based on configuration

import type { IWhatsAppProvider, ProviderConfig } from './types';
import { ZAPIProvider, zapiProvider } from './zapi/zapi.provider';
import { EvolutionProvider, evolutionProvider } from './evolution/evolution.provider';

// Re-export types
export type { IWhatsAppProvider, IGroupsProvider, IMessagesProvider, IInstanceProvider, ProviderConfig } from './types';

// Re-export providers
export { ZAPIProvider, zapiProvider } from './zapi/zapi.provider';
export { EvolutionProvider, evolutionProvider } from './evolution/evolution.provider';

// ===========================================
// Provider Factory
// ===========================================

/**
 * Get the current provider type from environment
 */
export function getProviderType(): 'zapi' | 'evolution' {
  // In a browser environment, we check VITE env vars
  // In Deno/Edge Functions, we use Deno.env
  const providerEnv = typeof window !== 'undefined'
    ? (import.meta as unknown as { env?: { VITE_PROVIDER?: string } }).env?.VITE_PROVIDER
    : undefined;
  
  return (providerEnv as 'zapi' | 'evolution') || 'zapi';
}

/**
 * Get the appropriate provider instance based on configuration
 */
export function getProvider(config?: ProviderConfig): IWhatsAppProvider {
  const type = config?.type || getProviderType();

  switch (type) {
    case 'evolution':
      if (!evolutionProvider) {
        console.warn('Evolution API not configured, falling back to Z-API');
        return zapiProvider;
      }
      return evolutionProvider;
    case 'zapi':
    default:
      return zapiProvider;
  }
}

/**
 * Create a new provider instance with custom configuration
 */
export function createProvider(config: ProviderConfig): IWhatsAppProvider {
  switch (config.type) {
    case 'evolution':
      // In the future, we could pass config to the constructor
      return new EvolutionProvider();
    case 'zapi':
    default:
      return new ZAPIProvider();
  }
}

// ===========================================
// Default Export
// ===========================================

// Default provider based on environment
export const provider = getProvider();

// Convenience exports for backward compatibility
export const groups = provider.groups;
export const messages = provider.messages;
export const instance = provider.instance;
export const contacts = provider.contacts;
