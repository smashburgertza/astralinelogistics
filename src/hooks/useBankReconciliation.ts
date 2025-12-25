import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BankTransaction {
  id: string;
  bank_account_id: string;
  transaction_date: string;
  description: string | null;
  reference: string | null;
  debit_amount: number;
  credit_amount: number;
  balance: number | null;
  is_reconciled: boolean;
  reconciled_at: string | null;
  journal_entry_id: string | null;
  created_at: string;
}

export interface ReconciliationSummary {
  bankBalance: number;
  bookBalance: number;
  unreconciledDeposits: number;
  unreconciledPayments: number;
  difference: number;
  matchedCount: number;
  unmatchedCount: number;
}

// Fetch bank transactions for reconciliation
export function useBankTransactions(bankAccountId: string, filters?: { 
  startDate?: string; 
  endDate?: string; 
  reconciled?: boolean;
}) {
  return useQuery({
    queryKey: ['bank-transactions', bankAccountId, filters],
    queryFn: async () => {
      let query = supabase
        .from('bank_transactions')
        .select('*')
        .eq('bank_account_id', bankAccountId)
        .order('transaction_date', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('transaction_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('transaction_date', filters.endDate);
      }
      if (filters?.reconciled !== undefined) {
        query = query.eq('is_reconciled', filters.reconciled);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BankTransaction[];
    },
    enabled: !!bankAccountId,
  });
}

// Fetch unreconciled journal entries for matching
export function useUnreconciledJournalEntries(bankAccountId: string, chartAccountId: string | null) {
  return useQuery({
    queryKey: ['unreconciled-journal-entries', bankAccountId, chartAccountId],
    queryFn: async () => {
      if (!chartAccountId) return [];

      // Get journal lines for the bank's chart account that aren't linked to any bank transaction
      const { data: lines, error } = await supabase
        .from('journal_lines')
        .select(`
          *,
          journal_entry:journal_entries!inner(*)
        `)
        .eq('account_id', chartAccountId)
        .eq('journal_entry.status', 'posted');

      if (error) throw error;

      // Filter out lines that are already reconciled
      const { data: reconciledEntryIds } = await supabase
        .from('bank_transactions')
        .select('journal_entry_id')
        .eq('bank_account_id', bankAccountId)
        .not('journal_entry_id', 'is', null);

      const reconciledIds = new Set(reconciledEntryIds?.map(t => t.journal_entry_id) || []);
      
      return (lines || []).filter(line => 
        !reconciledIds.has(line.journal_entry_id)
      );
    },
    enabled: !!bankAccountId && !!chartAccountId,
  });
}

// Create bank transaction (manual entry or import)
export function useCreateBankTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transaction: Omit<BankTransaction, 'id' | 'created_at' | 'reconciled_at'>) => {
      const { data, error } = await supabase
        .from('bank_transactions')
        .insert(transaction)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions', variables.bank_account_id] });
      toast.success('Bank transaction added');
    },
    onError: (error) => {
      toast.error(`Failed to add transaction: ${error.message}`);
    },
  });
}

// Bulk create bank transactions (for import)
export function useBulkCreateBankTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactions: Omit<BankTransaction, 'id' | 'created_at' | 'reconciled_at'>[]) => {
      const { data, error } = await supabase
        .from('bank_transactions')
        .insert(transactions)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      if (variables.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['bank-transactions', variables[0].bank_account_id] });
      }
      toast.success(`${variables.length} transactions imported`);
    },
    onError: (error) => {
      toast.error(`Failed to import transactions: ${error.message}`);
    },
  });
}

// Reconcile a bank transaction with a journal entry
export function useReconcileTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      transactionId, 
      journalEntryId,
      bankAccountId 
    }: { 
      transactionId: string; 
      journalEntryId: string;
      bankAccountId: string;
    }) => {
      const { data, error } = await supabase
        .from('bank_transactions')
        .update({
          journal_entry_id: journalEntryId,
          is_reconciled: true,
          reconciled_at: new Date().toISOString(),
        })
        .eq('id', transactionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions', variables.bankAccountId] });
      queryClient.invalidateQueries({ queryKey: ['unreconciled-journal-entries'] });
      toast.success('Transaction reconciled');
    },
    onError: (error) => {
      toast.error(`Failed to reconcile: ${error.message}`);
    },
  });
}

// Unreconcile a transaction
export function useUnreconcileTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      transactionId,
      bankAccountId 
    }: { 
      transactionId: string;
      bankAccountId: string;
    }) => {
      const { data, error } = await supabase
        .from('bank_transactions')
        .update({
          journal_entry_id: null,
          is_reconciled: false,
          reconciled_at: null,
        })
        .eq('id', transactionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions', variables.bankAccountId] });
      queryClient.invalidateQueries({ queryKey: ['unreconciled-journal-entries'] });
      toast.success('Transaction unreconciled');
    },
    onError: (error) => {
      toast.error(`Failed to unreconcile: ${error.message}`);
    },
  });
}

// Mark transaction as reconciled without journal entry (for adjustments)
export function useMarkReconciled() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      transactionId,
      bankAccountId 
    }: { 
      transactionId: string;
      bankAccountId: string;
    }) => {
      const { data, error } = await supabase
        .from('bank_transactions')
        .update({
          is_reconciled: true,
          reconciled_at: new Date().toISOString(),
        })
        .eq('id', transactionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions', variables.bankAccountId] });
      toast.success('Transaction marked as reconciled');
    },
    onError: (error) => {
      toast.error(`Failed to mark reconciled: ${error.message}`);
    },
  });
}

// Calculate reconciliation summary
export function useReconciliationSummary(bankAccountId: string, asOfDate?: string) {
  return useQuery({
    queryKey: ['reconciliation-summary', bankAccountId, asOfDate],
    queryFn: async () => {
      // Get bank account
      const { data: account, error: accountError } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('id', bankAccountId)
        .single();

      if (accountError) throw accountError;

      // Get all transactions
      let txQuery = supabase
        .from('bank_transactions')
        .select('*')
        .eq('bank_account_id', bankAccountId);

      if (asOfDate) {
        txQuery = txQuery.lte('transaction_date', asOfDate);
      }

      const { data: transactions, error: txError } = await txQuery;
      if (txError) throw txError;

      const reconciled = transactions?.filter(t => t.is_reconciled) || [];
      const unreconciled = transactions?.filter(t => !t.is_reconciled) || [];

      const unreconciledDeposits = unreconciled
        .filter(t => (t.credit_amount || 0) > 0)
        .reduce((sum, t) => sum + (t.credit_amount || 0), 0);

      const unreconciledPayments = unreconciled
        .filter(t => (t.debit_amount || 0) > 0)
        .reduce((sum, t) => sum + (t.debit_amount || 0), 0);

      // Calculate bank balance from transactions
      const bankBalance = (account.opening_balance || 0) + 
        (transactions || []).reduce((sum, t) => 
          sum + (t.credit_amount || 0) - (t.debit_amount || 0), 0);

      // Book balance would be the chart account balance
      const bookBalance = account.current_balance || 0;

      return {
        bankBalance,
        bookBalance,
        unreconciledDeposits,
        unreconciledPayments,
        difference: bankBalance - bookBalance,
        matchedCount: reconciled.length,
        unmatchedCount: unreconciled.length,
      } as ReconciliationSummary;
    },
    enabled: !!bankAccountId,
  });
}
