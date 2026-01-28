import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { createInvoicePaymentJournalEntry, createInvoiceJournalEntry, createAgentPaymentJournalEntry, createAgentPaymentReceivedJournalEntry, createPurchaseInvoiceJournalEntry } from '@/lib/journalEntryUtils';

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

      // Fire-and-forget: Create journal entry in background (don't block UI)
      const createJournalAsync = async () => {
        try {
          const productCost = Number(data.product_cost || 0);
          const purchaseFee = Number(data.purchase_fee || 0);
          const isPurchaseInvoice = productCost > 0 || purchaseFee > 0;
          
          if (isPurchaseInvoice) {
            // Use purchase invoice journal entry (agency model)
            const shippingAmount = Number(data.amount) - productCost - purchaseFee;
            await createPurchaseInvoiceJournalEntry({
              invoiceId: data.id,
              invoiceNumber: data.invoice_number,
              productCost,
              purchaseFee,
              shippingAmount: Math.max(0, shippingAmount),
              currency: data.currency || 'USD',
              exchangeRate: data.amount_in_tzs ? Number(data.amount_in_tzs) / Number(data.amount) : 1,
              customerName: (data as any).customers?.name,
            });
          } else {
            // Standard shipping invoice journal entry
            await createInvoiceJournalEntry({
              invoiceId: data.id,
              invoiceNumber: data.invoice_number,
              amount: Number(data.amount),
              currency: data.currency || 'USD',
              exchangeRate: data.amount_in_tzs ? Number(data.amount_in_tzs) / Number(data.amount) : 1,
              customerName: (data as any).customers?.name,
            });
          }
        } catch (journalError) {
          console.error('Background journal entry creation failed:', journalError);
        }
      };
      createJournalAsync();

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      // Defer less critical invalidations
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      }, 500);
      toast.success('Invoice created');
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
  /** Amount in invoice currency (for updating invoice amount_paid) */
  amount: number;
  /** Actual amount received in the payment currency (for payment record) */
  amountInPaymentCurrency?: number;
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
      const isSplitPayment = params.splits && params.splits.length > 0;
      
      // Parallel fetch: invoice data, exchange rate, and bank account mappings
      const allAccountIds = isSplitPayment 
        ? params.splits!.map(s => s.accountId) 
        : (params.depositAccountId ? [params.depositAccountId] : []);

      const [invoiceResult, rateResult, bankAccountsResult] = await Promise.all([
        supabase
          .from('invoices')
          .select('amount, amount_paid, invoice_number, currency, invoice_direction, agent_id')
          .eq('id', params.invoiceId)
          .single(),
        supabase
          .from('currency_exchange_rates')
          .select('rate_to_tzs, currency_code')
          .in('currency_code', ['USD', 'GBP', 'EUR']),
        allAccountIds.length > 0 
          ? supabase.from('bank_accounts').select('id, chart_account_id, current_balance, opening_balance').in('id', allAccountIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (invoiceResult.error) throw invoiceResult.error;
      const currentInvoice = invoiceResult.data;

      const totalAmount = Number(currentInvoice.amount || 0);
      const currentPaid = Number(currentInvoice.amount_paid || 0);
      const newTotalPaid = currentPaid + params.amount;
      const isFullyPaid = newTotalPaid >= totalAmount;
      // Determine payment type based on invoice direction
      // from_agent: Agent is billing us (we pay OUT to agent) - use createAgentPaymentJournalEntry
      // to_agent: We are billing agent (agent pays us, we receive IN) - use createAgentPaymentReceivedJournalEntry
      const isB2BPaymentToAgent = currentInvoice.invoice_direction === 'from_agent' && currentInvoice.agent_id;
      const isB2BPaymentFromAgent = currentInvoice.invoice_direction === 'to_agent' && currentInvoice.agent_id;

      // Build bank account chart map
      const bankAccountChartMap: Record<string, string> = {};
      const bankAccountBalanceMap: Record<string, number> = {};
      if (bankAccountsResult.data) {
        bankAccountsResult.data.forEach(ba => {
          if (ba.chart_account_id) {
            bankAccountChartMap[ba.id] = ba.chart_account_id;
            bankAccountBalanceMap[ba.id] = Number(ba.current_balance) || 0;
          }
        });
      }

      // Get exchange rate
      let invoiceCurrencyRate = 1;
      if (currentInvoice.currency && currentInvoice.currency !== 'TZS' && rateResult.data) {
        const rate = rateResult.data.find(r => r.currency_code === currentInvoice.currency);
        invoiceCurrencyRate = rate?.rate_to_tzs || 1;
      }

      // Prepare invoice update
      const updates: TablesUpdate<'invoices'> = {
        amount_paid: newTotalPaid,
        payment_method: params.paymentMethod,
        payment_currency: params.paymentCurrency,
      };
      if (isFullyPaid) {
        updates.status = 'paid';
        updates.paid_at = params.paymentDate;
      }

      // Execute core updates in parallel using async functions to ensure proper Promise types
      const updateInvoice = async () => {
        return supabase
          .from('invoices')
          .update(updates)
          .eq('id', params.invoiceId)
          .select()
          .single();
      };

      const insertPayment = async () => {
        // For split payments, sum the split amounts (which are in payment currency)
        // For single payments, use amountInPaymentCurrency if provided, otherwise fall back to amount
        const paymentAmount = isSplitPayment 
          ? params.splits!.reduce((sum, s) => sum + s.amount, 0) 
          : (params.amountInPaymentCurrency ?? params.amount);
        
        const paymentInsert = {
          invoice_id: params.invoiceId,
          amount: paymentAmount,
          currency: params.paymentCurrency,
          payment_method: params.paymentMethod,
          paid_at: params.paymentDate,
          stripe_payment_id: isSplitPayment 
            ? (params.reference ? `${params.reference} (Split: ${params.splits!.length} accounts)` : `Split payment: ${params.splits!.length} accounts`)
            : (params.reference || null),
          verification_status: 'verified',
          status: 'completed',
          verified_at: new Date().toISOString(),
        };
        return supabase.from('payments').insert(paymentInsert);
      };

      const updateBankBalances = async () => {
        // For outgoing payments (to agent), we subtract from balance
        // For incoming payments (from agent or customer), we add to balance
        const balanceMultiplier = isB2BPaymentToAgent ? -1 : 1;
        
        if (isSplitPayment && params.splits) {
          const updatePromises = params.splits.map(async (split) => {
            const currentBalance = bankAccountBalanceMap[split.accountId] || 0;
            const newBalance = currentBalance + (split.amount * balanceMultiplier);
            return supabase
              .from('bank_accounts')
              .update({ current_balance: newBalance })
              .eq('id', split.accountId);
          });
          return Promise.all(updatePromises);
        } else if (params.depositAccountId && bankAccountBalanceMap[params.depositAccountId] !== undefined) {
          const currentBalance = bankAccountBalanceMap[params.depositAccountId];
          const newBalance = currentBalance + (params.amount * balanceMultiplier);
          return supabase
            .from('bank_accounts')
            .update({ current_balance: newBalance })
            .eq('id', params.depositAccountId);
        }
        return null;
      };

      // Execute all core operations in parallel
      const [invoiceUpdateResult] = await Promise.all([
        updateInvoice(),
        insertPayment(),
        updateBankBalances(),
      ]);
      if (invoiceUpdateResult.error) throw invoiceUpdateResult.error;

      // Fire-and-forget: Create journal entries in background (don't block UI)
      const createJournalEntriesAsync = async () => {
        try {
          if (isSplitPayment && params.splits) {
            for (const split of params.splits) {
              const splitAmountInTzs = params.paymentCurrency === 'TZS' && currentInvoice.currency !== 'TZS'
                ? split.amount
                : split.amount * invoiceCurrencyRate;
              const chartAccountId = bankAccountChartMap[split.accountId] || split.accountId;

              if (isB2BPaymentToAgent) {
                // We are paying OUT to agent (from_agent invoice)
                await createAgentPaymentJournalEntry({
                  invoiceId: invoiceUpdateResult.data.id,
                  invoiceNumber: currentInvoice.invoice_number,
                  amount: split.amount,
                  currency: params.paymentCurrency || currentInvoice.currency || 'USD',
                  exchangeRate: invoiceCurrencyRate,
                  paymentCurrency: params.paymentCurrency,
                  sourceAccountId: chartAccountId,
                  amountInTzs: splitAmountInTzs,
                });
              } else if (isB2BPaymentFromAgent) {
                // We are receiving payment FROM agent (to_agent invoice)
                await createAgentPaymentReceivedJournalEntry({
                  invoiceId: invoiceUpdateResult.data.id,
                  invoiceNumber: currentInvoice.invoice_number,
                  amount: split.amount,
                  currency: params.paymentCurrency || currentInvoice.currency || 'USD',
                  exchangeRate: invoiceCurrencyRate,
                  paymentCurrency: params.paymentCurrency,
                  depositAccountId: chartAccountId,
                  amountInTzs: splitAmountInTzs,
                });
              } else {
                await createInvoicePaymentJournalEntry({
                  invoiceId: invoiceUpdateResult.data.id,
                  invoiceNumber: currentInvoice.invoice_number,
                  amount: split.amount,
                  currency: params.paymentCurrency || currentInvoice.currency || 'USD',
                  exchangeRate: invoiceCurrencyRate,
                  paymentCurrency: params.paymentCurrency,
                  depositAccountId: chartAccountId,
                });
              }
            }
          } else {
            const paymentAmountInTzs = params.paymentCurrency === 'TZS' && currentInvoice.currency !== 'TZS'
              ? params.amount * invoiceCurrencyRate
              : params.amount;
            const chartAccountId = params.depositAccountId 
              ? bankAccountChartMap[params.depositAccountId] || params.depositAccountId 
              : undefined;

            if (isB2BPaymentToAgent) {
              // We are paying OUT to agent (from_agent invoice)
              await createAgentPaymentJournalEntry({
                invoiceId: invoiceUpdateResult.data.id,
                invoiceNumber: currentInvoice.invoice_number,
                amount: paymentAmountInTzs,
                currency: params.paymentCurrency || currentInvoice.currency || 'USD',
                exchangeRate: invoiceCurrencyRate,
                paymentCurrency: params.paymentCurrency,
                sourceAccountId: chartAccountId,
                amountInTzs: paymentAmountInTzs,
              });
            } else if (isB2BPaymentFromAgent) {
              // We are receiving payment FROM agent (to_agent invoice)
              await createAgentPaymentReceivedJournalEntry({
                invoiceId: invoiceUpdateResult.data.id,
                invoiceNumber: currentInvoice.invoice_number,
                amount: paymentAmountInTzs,
                currency: params.paymentCurrency || currentInvoice.currency || 'USD',
                exchangeRate: invoiceCurrencyRate,
                paymentCurrency: params.paymentCurrency,
                depositAccountId: chartAccountId,
                amountInTzs: paymentAmountInTzs,
              });
            } else {
              await createInvoicePaymentJournalEntry({
                invoiceId: invoiceUpdateResult.data.id,
                invoiceNumber: currentInvoice.invoice_number,
                amount: paymentAmountInTzs,
                currency: params.paymentCurrency || currentInvoice.currency || 'USD',
                exchangeRate: invoiceCurrencyRate,
                paymentCurrency: params.paymentCurrency,
                depositAccountId: chartAccountId,
              });
            }
          }
        } catch (err) {
          console.error('Background journal entry creation failed:', err);
        }
      };

      // Start journal creation but don't wait for it
      createJournalEntriesAsync();

      return invoiceUpdateResult.data;
    },
    onSuccess: () => {
      // Minimal invalidations for speed - only what's immediately visible
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-payments'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      
      // Defer less critical invalidations
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['b2b-invoices'] });
        queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
        queryClient.invalidateQueries({ queryKey: ['agent-balance'] });
        queryClient.invalidateQueries({ queryKey: ['accounting-summary'] });
      }, 500);
      
      toast.success('Payment recorded');
    },
    onError: (error) => {
      toast.error(`Failed to record payment: ${error.message}`);
    },
  });
}

export function useBulkDeleteInvoices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      // Delete invoice items first
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .delete()
        .in('invoice_id', ids);
      if (itemsError) throw itemsError;

      // Delete payments
      const { error: paymentsError } = await supabase
        .from('payments')
        .delete()
        .in('invoice_id', ids);
      if (paymentsError) throw paymentsError;

      // Delete invoices
      const { error } = await supabase
        .from('invoices')
        .delete()
        .in('id', ids);
      if (error) throw error;

      return { count: ids.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-payments'] });
      toast.success(`${data.count} invoice(s) deleted`);
    },
    onError: (error) => {
      toast.error(`Failed to delete invoices: ${error.message}`);
    },
  });
}

export const INVOICE_STATUSES = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800' },
  paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-800' },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
} as const;
