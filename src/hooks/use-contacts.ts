import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zapiProvider } from "@/providers/zapi/zapi.provider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";
import type { Contact, ValidationResult } from "@/providers/types";

export function useContacts() {
  return useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      return await zapiProvider.contacts.list();
    },
    staleTime: 30000,
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
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ phone, name }: { phone: string; name?: string }) => {
      return await zapiProvider.contacts.add(phone, name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contacts-db"] });
      toast({
        title: "Contato adicionado",
        description: "O contato foi adicionado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao adicionar contato",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useBlockContact() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (phone: string) => {
      return await zapiProvider.contacts.block(phone);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contacts-db"] });
      toast({
        title: "Contato bloqueado",
        description: "O contato foi bloqueado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao bloquear contato",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUnblockContact() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (phone: string) => {
      return await zapiProvider.contacts.unblock(phone);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contacts-db"] });
      toast({
        title: "Contato desbloqueado",
        description: "O contato foi desbloqueado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao desbloquear contato",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useReportContact() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (phone: string) => {
      return await zapiProvider.contacts.report(phone);
    },
    onSuccess: () => {
      toast({
        title: "Contato reportado",
        description: "O contato foi reportado como spam.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao reportar contato",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useValidateNumbers() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (phones: string[]) => {
      return await zapiProvider.contacts.validateNumbers(phones);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao validar números",
        description: error.message,
        variant: "destructive",
      });
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
