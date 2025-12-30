import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { createInvoicePaymentJournalEntry, createInvoiceJournalEntry, createAgentPaymentJournalEntry } from '@/lib/journalEntryUtils';

export type InvoiceType = 'shipping' | 'purchase_shipping';

export type Invoice = Tables<'invoices'> & {
  customers?: Pick<Tables<'customers'>, 'name' | 'email' | 'company_name' | 'address' | 'phone'> | null;
  shipments?: Pick<Tables<'shipments'>, 'tracking_number' | 'origin_region' | 'customer_name' | 'total_weight_kg' | 'description'> | null;
  amount_paid?: number;
};

export const INVOICE_TYPES = {
  shipping: { label: 'Shipping', description: 'Freight and handling charges only' },
  purchase_shipping: { label: 'Purchase + Shipping', description: 'Product purchase plus freight charges' },
} as const;

export function useInvoices(filters?: {
  status?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select('*, customers(name, email, company_name), shipments(tracking_number, origin_region, customer_name, total_weight_kg)')
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.search) {
        query = query.or(`invoice_number.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Invoice[];
    },
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, customers(name, email, company_name, address, phone), shipments(tracking_number, origin_region, total_weight_kg, description, customer_name)')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as Invoice | null;
    },
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoice: TablesInsert<'invoices'>) => {
      const { data, error } = await supabase
        .from('invoices')
        .insert(invoice)
        .select('*, customers(name)')
        .single();
      if (error) throw error;

      // Auto-create journal entry for the invoice (AR debit, Revenue credit)
      try {
        await createInvoiceJournalEntry({
          invoiceId: data.id,
          invoiceNumber: data.invoice_number,
          amount: Number(data.amount),
          currency: data.currency || 'USD',
          exchangeRate: data.amount_in_tzs ? Number(data.amount_in_tzs) / Number(data.amount) : 1,
          customerName: (data as any).customers?.name,
        });
      } catch (journalError) {
        console.error('Failed to create journal entry for invoice:', journalError);
        // Don't fail the invoice creation if journal entry fails
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['trial-balance'] });
      queryClient.invalidateQueries({ queryKey: ['income-statement'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      toast.success('Invoice created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create invoice: ${error.message}`);
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'invoices'> & { id: string }) => {
      const { data, error } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update invoice: ${error.message}`);
    },
  });
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: TablesUpdate<'invoices'> = { status };
      
      if (status === 'paid') {
        updates.paid_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice status updated');
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
}

export interface PaymentSplit {
  accountId: string;
  amount: number;
}

export interface RecordPaymentParams {
  invoiceId: string;
  amount: number;
  paymentMethod: string;
  depositAccountId?: string;
  paymentCurrency: string;
  paymentDate: string;
  reference?: string;
  notes?: string;
  /** For split payments across multiple accounts */
  splits?: PaymentSplit[];
}

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: RecordPaymentParams) => {
      // First get the current invoice to check amount_paid and direction
      const { data: currentInvoice, error: fetchError } = await supabase
        .from('invoices')
        .select('amount, amount_paid, invoice_number, currency, invoice_direction, agent_id')
        .eq('id', params.invoiceId)
        .single();
      
      if (fetchError) throw fetchError;

      const totalAmount = Number(currentInvoice.amount || 0);
      const currentPaid = Number(currentInvoice.amount_paid || 0);
      const newTotalPaid = currentPaid + params.amount;
      const isFullyPaid = newTotalPaid >= totalAmount;
      const isB2BAgentPayment = currentInvoice.invoice_direction === 'from_agent' && currentInvoice.agent_id;

      // Update invoice with new amount_paid and status
      const updates: TablesUpdate<'invoices'> = {
        amount_paid: newTotalPaid,
        payment_method: params.paymentMethod,
        payment_currency: params.paymentCurrency,
      };

      // Only mark as paid if fully paid
      if (isFullyPaid) {
        updates.status = 'paid';
        updates.paid_at = params.paymentDate;
      } else if (newTotalPaid > 0) {
        // Optionally update status to reflect partial payment
        // For now, keep existing status unless cancelled
      }

      const { data, error } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', params.invoiceId)
        .select()
        .single();
      
      if (error) throw error;

      // Get exchange rate for invoice currency if paying in different currency
      let invoiceCurrencyRate = 1;
      if (currentInvoice.currency && currentInvoice.currency !== 'TZS') {
        const { data: rateData } = await supabase
          .from('currency_exchange_rates')
          .select('rate_to_tzs')
          .eq('currency_code', currentInvoice.currency)
          .maybeSingle();
        invoiceCurrencyRate = rateData?.rate_to_tzs || 1;
      }

      // Handle split payments or single payment
      const isSplitPayment = params.splits && params.splits.length > 0;

      // Pre-fetch bank accounts with chart_account_ids for all splits
      let bankAccountChartMap: Record<string, string> = {};
      const allAccountIds = isSplitPayment 
        ? params.splits!.map(s => s.accountId) 
        : (params.depositAccountId ? [params.depositAccountId] : []);
      
      if (allAccountIds.length > 0) {
        const { data: bankAccountsForMapping } = await supabase
          .from('bank_accounts')
          .select('id, chart_account_id')
          .in('id', allAccountIds);
        
        if (bankAccountsForMapping) {
          bankAccountsForMapping.forEach(ba => {
            if (ba.chart_account_id) {
              bankAccountChartMap[ba.id] = ba.chart_account_id;
            }
          });
        }
      }

      if (isSplitPayment) {
        console.log('Processing split payment with splits:', params.splits);
        console.log('Bank account chart map:', bankAccountChartMap);
        
        // Process each split as a separate journal entry
        for (const split of params.splits!) {
          const splitAmountInTzs = params.paymentCurrency === 'TZS' && currentInvoice.currency !== 'TZS'
            ? split.amount  // Already in TZS
            : split.amount * invoiceCurrencyRate;

          // Get the chart_account_id for this bank account
          const chartAccountId = bankAccountChartMap[split.accountId] || split.accountId;
          console.log(`Split: accountId=${split.accountId}, chartAccountId=${chartAccountId}, amount=${split.amount}`);

          try {
            if (isB2BAgentPayment) {
              await createAgentPaymentJournalEntry({
                invoiceId: data.id,
                invoiceNumber: currentInvoice.invoice_number,
                amount: split.amount,
                currency: params.paymentCurrency || currentInvoice.currency || 'USD',
                exchangeRate: invoiceCurrencyRate,
                paymentCurrency: params.paymentCurrency,
                sourceAccountId: chartAccountId,
                amountInTzs: splitAmountInTzs,
              });
            } else {
              await createInvoicePaymentJournalEntry({
                invoiceId: data.id,
                invoiceNumber: currentInvoice.invoice_number,
                amount: split.amount,
                currency: params.paymentCurrency || currentInvoice.currency || 'USD',
                exchangeRate: invoiceCurrencyRate,
                paymentCurrency: params.paymentCurrency,
                depositAccountId: chartAccountId,
              });
            }
          } catch (journalError) {
            console.error('Failed to create split payment journal entry:', journalError);
          }
        }

        // Record split payment in payments table with reference to all accounts
        const splitAccountNames = params.splits!.map(s => s.accountId).join(',');
        await supabase.from('payments').insert({
          invoice_id: params.invoiceId,
          amount: params.splits!.reduce((sum, s) => sum + s.amount, 0),
          currency: params.paymentCurrency,
          payment_method: params.paymentMethod,
          paid_at: params.paymentDate,
          stripe_payment_id: params.reference ? `${params.reference} (Split: ${params.splits!.length} accounts)` : `Split payment: ${params.splits!.length} accounts`,
          verification_status: 'verified',
          status: 'completed',
          verified_at: new Date().toISOString(),
        });
      } else {
        // Single account payment (original flow)
        const paymentAmountInTzs = params.paymentCurrency === 'TZS' && currentInvoice.currency !== 'TZS'
          ? params.amount * invoiceCurrencyRate
          : params.amount;

        // Get the chart_account_id for this bank account
        const chartAccountId = params.depositAccountId ? bankAccountChartMap[params.depositAccountId] || params.depositAccountId : undefined;

        try {
          if (isB2BAgentPayment) {
            await createAgentPaymentJournalEntry({
              invoiceId: data.id,
              invoiceNumber: currentInvoice.invoice_number,
              amount: paymentAmountInTzs,
              currency: params.paymentCurrency || currentInvoice.currency || 'USD',
              exchangeRate: invoiceCurrencyRate,
              paymentCurrency: params.paymentCurrency,
              sourceAccountId: chartAccountId,
              amountInTzs: paymentAmountInTzs,
            });
          } else {
            await createInvoicePaymentJournalEntry({
              invoiceId: data.id,
              invoiceNumber: currentInvoice.invoice_number,
              amount: paymentAmountInTzs,
              currency: params.paymentCurrency || currentInvoice.currency || 'USD',
              exchangeRate: invoiceCurrencyRate,
              paymentCurrency: params.paymentCurrency,
              depositAccountId: chartAccountId,
            });
          }
        } catch (journalError) {
          console.error('Failed to create payment journal entry:', journalError);
        }

        await supabase.from('payments').insert({
          invoice_id: params.invoiceId,
          amount: params.amount,
          currency: params.paymentCurrency,
          payment_method: params.paymentMethod,
          paid_at: params.paymentDate,
          stripe_payment_id: params.reference || null,
          verification_status: 'verified',
          status: 'completed',
          verified_at: new Date().toISOString(),
        });
      }

      // Update bank account balances by recalculating from journal lines
      // Reuse allAccountIds from earlier  
      if (allAccountIds.length > 0) {
        // Get chart account IDs for the bank accounts
        const { data: bankAccounts } = await supabase
          .from('bank_accounts')
          .select('id, chart_account_id, opening_balance')
          .in('id', allAccountIds);

        if (bankAccounts) {
          for (const ba of bankAccounts) {
            if (ba.chart_account_id) {
              // Calculate new balance from journal lines
              const { data: totals } = await supabase
                .from('journal_lines')
                .select('debit_amount, credit_amount')
                .eq('account_id', ba.chart_account_id);
              
              const totalDebits = totals?.reduce((sum, l) => sum + (Number(l.debit_amount) || 0), 0) || 0;
              const totalCredits = totals?.reduce((sum, l) => sum + (Number(l.credit_amount) || 0), 0) || 0;
              const newBalance = (Number(ba.opening_balance) || 0) + totalDebits - totalCredits;

              await supabase
                .from('bank_accounts')
                .update({ current_balance: newBalance })
                .eq('id', ba.id);
            }
          }
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['b2b-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-payments'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-summary'] });
      queryClient.invalidateQueries({ queryKey: ['agent-balance'] });
      queryClient.invalidateQueries({ queryKey: ['all-agent-balances'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['trial-balance'] });
      queryClient.invalidateQueries({ queryKey: ['income-statement'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      toast.success('Payment recorded successfully');
    },
    onError: (error) => {
      toast.error(`Failed to record payment: ${error.message}`);
    },
  });
}

export const INVOICE_STATUSES = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800' },
  paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-800' },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
} as const;
