import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types for accounting
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

export interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  reference_type: string | null;
  reference_id: string | null;
  status: 'draft' | 'posted' | 'voided';
  posted_at: string | null;
  posted_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  notes: string | null;
  lines?: JournalLine[];
}

export interface JournalLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  description: string | null;
  debit_amount: number;
  credit_amount: number;
  currency: string;
  exchange_rate: number;
  amount_in_tzs: number | null;
  created_at: string;
  account?: ChartAccount;
}

export interface FiscalPeriod {
  id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  fiscal_year: number;
  period_number: number;
  period_type: 'month' | 'quarter' | 'year';
  status: 'open' | 'closed' | 'locked';
  closed_at: string | null;
  closed_by: string | null;
  created_at: string;
}

export interface TaxRate {
  id: string;
  tax_name: string;
  tax_code: string;
  rate: number;
  tax_type: 'vat' | 'withholding' | 'excise' | 'other';
  account_id: string | null;
  is_active: boolean;
  created_at: string;
}

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

// Chart of Accounts Hooks
export function useChartOfAccounts(filters?: { type?: string; active?: boolean }) {
  return useQuery({
    queryKey: ['chart-of-accounts', filters],
    queryFn: async () => {
      let query = supabase
        .from('chart_of_accounts')
        .select('*')
        .order('account_code', { ascending: true });

      if (filters?.type && filters.type !== 'all') {
        query = query.eq('account_type', filters.type);
      }
      if (filters?.active !== undefined) {
        query = query.eq('is_active', filters.active);
      }

      const { data, error } = await query;
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

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ChartAccount> & { id: string }) => {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast.success('Account updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update account: ${error.message}`);
    },
  });
}

// Journal Entries Hooks
export function useJournalEntries(filters?: { status?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['journal-entries', filters],
    queryFn: async () => {
      let query = supabase
        .from('journal_entries')
        .select('*')
        .order('entry_date', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.startDate) {
        query = query.gte('entry_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('entry_date', filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as JournalEntry[];
    },
  });
}

export function useJournalEntry(id: string) {
  return useQuery({
    queryKey: ['journal-entry', id],
    queryFn: async () => {
      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('id', id)
        .single();

      if (entryError) throw entryError;

      const { data: lines, error: linesError } = await supabase
        .from('journal_lines')
        .select('*, account:chart_of_accounts(*)')
        .eq('journal_entry_id', id);

      if (linesError) throw linesError;

      return { ...entry, lines } as JournalEntry;
    },
    enabled: !!id,
  });
}

export function useCreateJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entry,
      lines,
    }: {
      entry: Omit<JournalEntry, 'id' | 'entry_number' | 'created_at' | 'updated_at' | 'lines'>;
      lines: Omit<JournalLine, 'id' | 'journal_entry_id' | 'created_at' | 'account'>[];
    }) => {
      // Generate entry number
      const { data: entryNumber } = await supabase.rpc('generate_journal_number');

      // Create journal entry
      const { data: journalEntry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({ ...entry, entry_number: entryNumber })
        .select()
        .single();

      if (entryError) throw entryError;

      // Create journal lines
      const linesWithEntryId = lines.map((line) => ({
        ...line,
        journal_entry_id: journalEntry.id,
      }));

      const { error: linesError } = await supabase
        .from('journal_lines')
        .insert(linesWithEntryId);

      if (linesError) throw linesError;

      return journalEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['trial-balance'] });
      queryClient.invalidateQueries({ queryKey: ['income-statement'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-summary'] });
      toast.success('Journal entry created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create journal entry: ${error.message}`);
    },
  });
}

export function usePostJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('journal_entries')
        .update({
          status: 'posted',
          posted_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['trial-balance'] });
      queryClient.invalidateQueries({ queryKey: ['income-statement'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-summary'] });
      toast.success('Journal entry posted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to post journal entry: ${error.message}`);
    },
  });
}

export function useVoidJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('journal_entries')
        .update({ status: 'voided' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['trial-balance'] });
      queryClient.invalidateQueries({ queryKey: ['income-statement'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-summary'] });
      toast.success('Journal entry voided');
    },
    onError: (error) => {
      toast.error(`Failed to void journal entry: ${error.message}`);
    },
  });
}

// Fiscal Periods Hooks
export function useFiscalPeriods() {
  return useQuery({
    queryKey: ['fiscal-periods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fiscal_periods')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data as FiscalPeriod[];
    },
  });
}

export function useCreateFiscalPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (period: Omit<FiscalPeriod, 'id' | 'created_at' | 'closed_at' | 'closed_by'>) => {
      const { data, error } = await supabase
        .from('fiscal_periods')
        .insert(period)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-periods'] });
      toast.success('Fiscal period created');
    },
    onError: (error) => {
      toast.error(`Failed to create fiscal period: ${error.message}`);
    },
  });
}

export function useCloseFiscalPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('fiscal_periods')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-periods'] });
      toast.success('Fiscal period closed');
    },
    onError: (error) => {
      toast.error(`Failed to close fiscal period: ${error.message}`);
    },
  });
}

// Tax Rates Hooks
export function useTaxRates() {
  return useQuery({
    queryKey: ['tax-rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tax_rates')
        .select('*')
        .order('tax_name', { ascending: true });

      if (error) throw error;
      return data as TaxRate[];
    },
  });
}

export function useCreateTaxRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taxRate: Omit<TaxRate, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('tax_rates')
        .insert(taxRate)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rates'] });
      toast.success('Tax rate created');
    },
    onError: (error) => {
      toast.error(`Failed to create tax rate: ${error.message}`);
    },
  });
}

export function useUpdateTaxRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TaxRate> & { id: string }) => {
      const { data, error } = await supabase
        .from('tax_rates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rates'] });
      toast.success('Tax rate updated');
    },
    onError: (error) => {
      toast.error(`Failed to update tax rate: ${error.message}`);
    },
  });
}

// Bank Accounts Hooks
export function useBankAccounts() {
  return useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      // First get all bank accounts
      const { data: bankAccounts, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('account_name', { ascending: true });

      if (error) throw error;

      // Get all chart account IDs that are linked to bank accounts
      const chartAccountIds = bankAccounts
        .filter(ba => ba.chart_account_id)
        .map(ba => ba.chart_account_id);

      if (chartAccountIds.length === 0) {
        return bankAccounts as BankAccount[];
      }

      // Get all posted journal lines for these accounts including currency info
      const { data: journalLines, error: linesError } = await supabase
        .from('journal_lines')
        .select(`
          account_id,
          debit_amount,
          credit_amount,
          currency,
          amount_in_tzs,
          journal_entry:journal_entries!inner(status)
        `)
        .in('account_id', chartAccountIds);

      if (linesError) throw linesError;

      // Filter to only posted entries and calculate totals per account
      const postedLines = (journalLines || []).filter(
        (line: any) => line.journal_entry?.status === 'posted'
      );

      // Build a map of chart_account_id to bank account currency
      const accountCurrencyMap: Record<string, string> = {};
      bankAccounts.forEach(acc => {
        if (acc.chart_account_id) {
          accountCurrencyMap[acc.chart_account_id] = acc.currency || 'TZS';
        }
      });

      const accountTotals: Record<string, { debits: number; credits: number }> = {};
      for (const line of postedLines) {
        if (!accountTotals[line.account_id]) {
          accountTotals[line.account_id] = { debits: 0, credits: 0 };
        }
        
        const bankCurrency = accountCurrencyMap[line.account_id] || 'TZS';
        const lineCurrency = line.currency || 'TZS';
        
        // If bank account is TZS but journal line is in foreign currency, use amount_in_tzs
        // Otherwise use the direct debit/credit amounts
        if (bankCurrency === 'TZS' && lineCurrency !== 'TZS' && line.amount_in_tzs) {
          // For TZS accounts with foreign currency entries, use amount_in_tzs
          if (Number(line.debit_amount) > 0) {
            accountTotals[line.account_id].debits += Number(line.amount_in_tzs) || 0;
          }
          if (Number(line.credit_amount) > 0) {
            accountTotals[line.account_id].credits += Number(line.amount_in_tzs) || 0;
          }
        } else {
          // Same currency or non-TZS bank account - use direct amounts
          accountTotals[line.account_id].debits += Number(line.debit_amount) || 0;
          accountTotals[line.account_id].credits += Number(line.credit_amount) || 0;
        }
      }

      // Calculate current balance for each bank account
      // For asset accounts: balance = opening + debits - credits
      return bankAccounts.map(account => {
        if (!account.chart_account_id || !accountTotals[account.chart_account_id]) {
          return {
            ...account,
            current_balance: account.opening_balance || 0,
          } as BankAccount;
        }

        const totals = accountTotals[account.chart_account_id];
        const calculatedBalance = (account.opening_balance || 0) + totals.debits - totals.credits;

        return {
          ...account,
          current_balance: calculatedBalance,
        } as BankAccount;
      });
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

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('chart_of_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast.success('Account deleted');
    },
    onError: (error) => {
      toast.error(`Failed to delete account: ${error.message}`);
    },
  });
}

export function useDeleteJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First delete journal lines
      const { error: linesError } = await supabase
        .from('journal_lines')
        .delete()
        .eq('journal_entry_id', id);

      if (linesError) throw linesError;

      // Then delete the entry
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-summary'] });
      toast.success('Journal entry deleted');
    },
    onError: (error) => {
      toast.error(`Failed to delete journal entry: ${error.message}`);
    },
  });
}

export function useUpdateJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      entry,
      lines,
    }: {
      id: string;
      entry: Partial<JournalEntry>;
      lines?: Omit<JournalLine, 'id' | 'journal_entry_id' | 'created_at' | 'account'>[];
    }) => {
      // Update entry
      const { data: journalEntry, error: entryError } = await supabase
        .from('journal_entries')
        .update(entry)
        .eq('id', id)
        .select()
        .single();

      if (entryError) throw entryError;

      // If lines provided, replace them
      if (lines) {
        // Delete existing lines
        const { error: deleteError } = await supabase
          .from('journal_lines')
          .delete()
          .eq('journal_entry_id', id);

        if (deleteError) throw deleteError;

        // Insert new lines
        const linesWithEntryId = lines.map((line) => ({
          ...line,
          journal_entry_id: id,
        }));

        const { error: linesError } = await supabase
          .from('journal_lines')
          .insert(linesWithEntryId);

        if (linesError) throw linesError;
      }

      return journalEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entry'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-summary'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['trial-balance'] });
      queryClient.invalidateQueries({ queryKey: ['income-statement'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      toast.success('Journal entry updated');
    },
    onError: (error) => {
      toast.error(`Failed to update journal entry: ${error.message}`);
    },
  });
}

// Financial Reports
export function useTrialBalance(asOfDate?: string) {
  return useQuery({
    queryKey: ['trial-balance', asOfDate],
    queryFn: async () => {
      const { data: accounts, error: accountsError } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('is_active', true)
        .order('account_code');

      if (accountsError) throw accountsError;

      const { data: lines, error: linesError } = await supabase
        .from('journal_lines')
        .select('*, journal_entry:journal_entries!inner(*)')
        .eq('journal_entry.status', 'posted');

      if (linesError) throw linesError;

      // Calculate balances for each account
      const balances = accounts.map((account) => {
        const accountLines = (lines as any[]).filter((l) => l.account_id === account.id);
        const totalDebits = accountLines.reduce((sum, l) => sum + (Number(l.debit_amount) || 0), 0);
        const totalCredits = accountLines.reduce((sum, l) => sum + (Number(l.credit_amount) || 0), 0);
        const balance = account.normal_balance === 'debit' 
          ? totalDebits - totalCredits 
          : totalCredits - totalDebits;

        return {
          ...account,
          total_debits: totalDebits,
          total_credits: totalCredits,
          balance,
        };
      });

      return balances.filter((b) => b.balance !== 0 || b.total_debits !== 0 || b.total_credits !== 0);
    },
  });
}

export function useIncomeStatement(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['income-statement', startDate, endDate],
    queryFn: async () => {
      const { data: accounts, error: accountsError } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .in('account_type', ['revenue', 'expense'])
        .eq('is_active', true)
        .order('account_code');

      if (accountsError) throw accountsError;

      const { data: lines, error: linesError } = await supabase
        .from('journal_lines')
        .select('*, journal_entry:journal_entries!inner(*)')
        .eq('journal_entry.status', 'posted')
        .gte('journal_entry.entry_date', startDate)
        .lte('journal_entry.entry_date', endDate);

      if (linesError) throw linesError;

      const revenue: any[] = [];
      const expenses: any[] = [];
      let totalRevenue = 0;
      let totalExpenses = 0;

      accounts.forEach((account) => {
        const accountLines = (lines as any[]).filter((l) => l.account_id === account.id);
        const totalDebits = accountLines.reduce((sum, l) => sum + (Number(l.debit_amount) || 0), 0);
        const totalCredits = accountLines.reduce((sum, l) => sum + (Number(l.credit_amount) || 0), 0);
        const balance = account.account_type === 'revenue' 
          ? totalCredits - totalDebits 
          : totalDebits - totalCredits;

        if (balance !== 0) {
          const item = { ...account, balance };
          if (account.account_type === 'revenue') {
            revenue.push(item);
            totalRevenue += balance;
          } else {
            expenses.push(item);
            totalExpenses += balance;
          }
        }
      });

      return {
        revenue,
        expenses,
        totalRevenue,
        totalExpenses,
        netIncome: totalRevenue - totalExpenses,
        startDate,
        endDate,
      };
    },
    enabled: !!startDate && !!endDate,
  });
}

export function useBalanceSheet(asOfDate: string) {
  return useQuery({
    queryKey: ['balance-sheet', asOfDate],
    queryFn: async () => {
      const { data: accounts, error: accountsError } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .in('account_type', ['asset', 'liability', 'equity'])
        .eq('is_active', true)
        .order('account_code');

      if (accountsError) throw accountsError;

      const { data: lines, error: linesError } = await supabase
        .from('journal_lines')
        .select('*, journal_entry:journal_entries!inner(*)')
        .eq('journal_entry.status', 'posted')
        .lte('journal_entry.entry_date', asOfDate);

      if (linesError) throw linesError;

      const assets: any[] = [];
      const liabilities: any[] = [];
      const equity: any[] = [];
      let totalAssets = 0;
      let totalLiabilities = 0;
      let totalEquity = 0;

      accounts.forEach((account) => {
        const accountLines = (lines as any[]).filter((l) => l.account_id === account.id);
        const totalDebits = accountLines.reduce((sum, l) => sum + (Number(l.debit_amount) || 0), 0);
        const totalCredits = accountLines.reduce((sum, l) => sum + (Number(l.credit_amount) || 0), 0);
        const balance = account.normal_balance === 'debit' 
          ? totalDebits - totalCredits 
          : totalCredits - totalDebits;

        if (balance !== 0) {
          const item = { ...account, balance };
          if (account.account_type === 'asset') {
            assets.push(item);
            totalAssets += balance;
          } else if (account.account_type === 'liability') {
            liabilities.push(item);
            totalLiabilities += balance;
          } else {
            equity.push(item);
            totalEquity += balance;
          }
        }
      });

      return {
        assets,
        liabilities,
        equity,
        totalAssets,
        totalLiabilities,
        totalEquity,
        asOfDate,
      };
    },
    enabled: !!asOfDate,
  });
}

export const ACCOUNT_TYPES = [
  { value: 'asset', label: 'Asset', normalBalance: 'debit' },
  { value: 'liability', label: 'Liability', normalBalance: 'credit' },
  { value: 'equity', label: 'Equity', normalBalance: 'credit' },
  { value: 'revenue', label: 'Revenue', normalBalance: 'credit' },
  { value: 'expense', label: 'Expense', normalBalance: 'debit' },
] as const;

export const JOURNAL_STATUSES = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  posted: { label: 'Posted', color: 'bg-emerald-100 text-emerald-800' },
  voided: { label: 'Voided', color: 'bg-red-100 text-red-800' },
} as const;
