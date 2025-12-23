import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zapiProvider } from "@/providers/zapi/zapi.provider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Contact, ValidationResult } from "@/providers/types";

export function useContacts() {
  return useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      return await zapiProvider.contacts.list();
    },
    staleTime: 60000,
  });
}

export function useContactsFromDB() {
  return useQuery({
    queryKey: ["contacts-db"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Contact[];
    },
  });
}

export function useAddContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ phone, name }: { phone: string; name?: string }) => {
      return await zapiProvider.contacts.add(phone, name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contacts-db"] });
      toast.success("Contato adicionado com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao adicionar contato: " + error.message);
    },
  });
}

export function useBlockContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (phone: string) => {
      return await zapiProvider.contacts.block(phone);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contacts-db"] });
      toast.success("Contato bloqueado com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao bloquear contato: " + error.message);
    },
  });
}

export function useUnblockContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (phone: string) => {
      return await zapiProvider.contacts.unblock(phone);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contacts-db"] });
      toast.success("Contato desbloqueado com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao desbloquear contato: " + error.message);
    },
  });
}

export function useReportContact() {
  return useMutation({
    mutationFn: async (phone: string) => {
      return await zapiProvider.contacts.report(phone);
    },
    onSuccess: () => {
      toast.success("Contato reportado como spam");
    },
    onError: (error: Error) => {
      toast.error("Erro ao reportar contato: " + error.message);
    },
  });
}

export function useValidateNumbers() {
  return useMutation({
    mutationFn: async (phones: string[]) => {
      return await zapiProvider.contacts.validateNumbers(phones);
    },
    onError: (error: Error) => {
      toast.error("Erro ao validar números: " + error.message);
    },
  });
}

export function useValidationHistory() {
  return useQuery({
    queryKey: ["validation-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_validation_results")
        .select("*")
        .order("validated_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as ValidationResult[];
    },
  });
}
