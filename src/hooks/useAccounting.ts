import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types for simplified finance
export interface BankAccount {
  id: string;
  account_name: string;
  bank_name: string;
  account_number: string | null;
  currency: string;
  chart_account_id: string | null;
  opening_balance: number;
  current_balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Keep ChartAccount type for compatibility with existing code
export interface ChartAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  account_subtype: string | null;
  parent_id: string | null;
  description: string | null;
  is_active: boolean;
  normal_balance: 'debit' | 'credit';
  currency: string;
  created_at: string;
  updated_at: string;
}

// Simplified Bank Accounts Hook - reads current_balance directly
export function useBankAccounts() {
  return useQuery({
    queryKey: ['bank-accounts'],
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data: bankAccounts, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('account_name', { ascending: true });

      if (error) throw error;
      return bankAccounts as BankAccount[];
    },
  });
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (account: Omit<BankAccount, 'id' | 'created_at' | 'updated_at' | 'current_balance'>) => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .insert({ ...account, current_balance: account.opening_balance })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      toast.success('Bank account created');
    },
    onError: (error) => {
      toast.error(`Failed to create bank account: ${error.message}`);
    },
  });
}

export function useUpdateBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BankAccount> & { id: string }) => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      toast.success('Bank account updated');
    },
    onError: (error) => {
      toast.error(`Failed to update bank account: ${error.message}`);
    },
  });
}

export function useDeleteBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      toast.success('Bank account deleted');
    },
    onError: (error) => {
      toast.error(`Failed to delete bank account: ${error.message}`);
    },
  });
}

// Helper function for updating bank balance directly
export async function updateBankBalance(bankAccountId: string, amount: number, isCredit: boolean) {
  const { data: account, error: fetchError } = await supabase
    .from('bank_accounts')
    .select('current_balance')
    .eq('id', bankAccountId)
    .single();

  if (fetchError) throw fetchError;

  const newBalance = isCredit
    ? (account.current_balance || 0) + amount  // Money in (payment received)
    : (account.current_balance || 0) - amount; // Money out (expense paid)

  const { error: updateError } = await supabase
    .from('bank_accounts')
    .update({ current_balance: newBalance })
    .eq('id', bankAccountId);

  if (updateError) throw updateError;

  return newBalance;
}

// Keep these exports for backwards compatibility with existing imports
// They are no-ops or minimal implementations
export function useChartOfAccounts() {
  return useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .order('account_code', { ascending: true });

      if (error) throw error;
      return data as ChartAccount[];
    },
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (account: Omit<ChartAccount, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .insert(account)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast.success('Account created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create account: ${error.message}`);
    },
  });
}
