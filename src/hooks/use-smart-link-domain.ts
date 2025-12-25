import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DomainSettings {
  custom_domain: string | null;
  domain_verified: boolean;
  domain_verified_at: string | null;
}

interface VerifyDomainResult {
  success: boolean;
  verified: boolean;
  domain: string;
  statusCode: number | null;
  error: string | null;
  message: string;
}

export function useSmartLinkDomain() {
  return useQuery({
    queryKey: ['smart-link-domain'],
    queryFn: async (): Promise<DomainSettings> => {
      const { data, error } = await supabase
        .from('api_settings')
        .select('custom_domain, domain_verified, domain_verified_at')
        .eq('id', 'zapi_credentials')
        .maybeSingle();

      if (error) throw error;

      return {
        custom_domain: data?.custom_domain || null,
        domain_verified: data?.domain_verified || false,
        domain_verified_at: data?.domain_verified_at || null,
      };
    },
  });
}

export function useUpdateDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (domain: string) => {
      const { data, error } = await supabase
        .from('api_settings')
        .update({
          custom_domain: domain || null,
          domain_verified: false,
          domain_verified_at: null,
        })
        .eq('id', 'zapi_credentials')
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-link-domain'] });
      toast.success('Domínio atualizado', {
        description: 'Clique em "Verificar Domínio" para confirmar a configuração DNS',
      });
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar domínio', { description: error.message });
    },
  });
}

export function useVerifyDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (domain: string): Promise<VerifyDomainResult> => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-custom-domain`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to verify domain');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['smart-link-domain'] });

      if (data.verified) {
        toast.success('Domínio verificado', {
          description: 'Seu domínio customizado está configurado corretamente',
        });
      } else {
        toast.error('Verificação falhou', {
          description: data.error || 'Verifique a configuração DNS do seu domínio',
        });
      }
    },
    onError: (error: Error) => {
      toast.error('Erro ao verificar domínio', { description: error.message });
    },
  });
}

export function getSmartLinkUrl(slug: string, customDomain?: string | null, verified?: boolean): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/l/${slug}`;
  }

  return `/l/${slug}`;
}

export function generateShortSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let slug = '';
  for (let i = 0; i < 8; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}
