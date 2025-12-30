import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays } from 'date-fns';
import { useExchangeRatesMap } from '@/hooks/useExchangeRates';

export interface AgingBucket {
  label: string;
  min: number;
  max: number | null;
  count: number;
  total: number;
  items: AgingItem[];
}

export interface AgingItem {
  id: string;
  reference: string;
  date: string;
  dueDate?: string;
  amount: number;
  currency: string;
  daysOutstanding: number;
  customerName?: string;
  description?: string;
}

export interface AgingReport {
  current: AgingBucket;
  days30: AgingBucket;
  days60: AgingBucket;
  days90Plus: AgingBucket;
  totalOutstanding: number;
  totalCount: number;
}

const createEmptyBuckets = (): AgingReport => ({
  current: { label: 'Current (0-30)', min: 0, max: 30, count: 0, total: 0, items: [] },
  days30: { label: '31-60 Days', min: 31, max: 60, count: 0, total: 0, items: [] },
  days60: { label: '61-90 Days', min: 61, max: 90, count: 0, total: 0, items: [] },
  days90Plus: { label: '90+ Days', min: 91, max: null, count: 0, total: 0, items: [] },
  totalOutstanding: 0,
  totalCount: 0,
});

function categorizeByAge(daysOutstanding: number, item: AgingItem, buckets: AgingReport) {
  if (daysOutstanding <= 30) {
    buckets.current.items.push(item);
    buckets.current.count++;
    buckets.current.total += item.amount;
  } else if (daysOutstanding <= 60) {
    buckets.days30.items.push(item);
    buckets.days30.count++;
    buckets.days30.total += item.amount;
  } else if (daysOutstanding <= 90) {
    buckets.days60.items.push(item);
    buckets.days60.count++;
    buckets.days60.total += item.amount;
  } else {
    buckets.days90Plus.items.push(item);
    buckets.days90Plus.count++;
    buckets.days90Plus.total += item.amount;
  }
  buckets.totalOutstanding += item.amount;
  buckets.totalCount++;
}

// Accounts Receivable Aging - Outstanding Invoices
export function useAccountsReceivableAging() {
  const { getRate } = useExchangeRatesMap();

  return useQuery({
    queryKey: ['ar-aging'],
    queryFn: async () => {
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('*, customers(name)')
        .in('status', ['pending', 'overdue'])
        .order('created_at', { ascending: true });

      if (error) throw error;

      const buckets = createEmptyBuckets();
      const today = new Date();

      invoices?.forEach((invoice) => {
        const invoiceDate = new Date(invoice.due_date || invoice.created_at || today);
        const daysOutstanding = Math.max(0, differenceInDays(today, invoiceDate));
        const currency = invoice.currency || 'USD';
        const rate = getRate(currency);
        const amountInTZS = Number(invoice.amount_in_tzs) || Number(invoice.amount) * rate;

        const item: AgingItem = {
          id: invoice.id,
          reference: invoice.invoice_number,
          date: invoice.created_at || '',
          dueDate: invoice.due_date || undefined,
          amount: amountInTZS,
          currency: 'TZS',
          daysOutstanding,
          customerName: (invoice.customers as any)?.name,
        };

        categorizeByAge(daysOutstanding, item, buckets);
      });

      return buckets;
    },
  });
}

// Accounts Payable Aging - Approved but unpaid expenses (simplified as payables)
export function useAccountsPayableAging() {
  const { getRate } = useExchangeRatesMap();

  return useQuery({
    queryKey: ['ap-aging'],
    queryFn: async () => {
      // For AP, we look at approved expenses that represent payables
      const { data: expenses, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const buckets = createEmptyBuckets();
      const today = new Date();

      expenses?.forEach((expense) => {
        const expenseDate = new Date(expense.approved_at || expense.created_at || today);
        const daysOutstanding = Math.max(0, differenceInDays(today, expenseDate));
        const currency = expense.currency || 'TZS';
        const rate = getRate(currency);
        const amountInTZS = Number(expense.amount) * rate;

        const item: AgingItem = {
          id: expense.id,
          reference: `EXP-${expense.id.slice(0, 8).toUpperCase()}`,
          date: expense.created_at || '',
          amount: amountInTZS,
          currency: 'TZS',
          daysOutstanding,
          description: expense.description || expense.category,
        };

        categorizeByAge(daysOutstanding, item, buckets);
      });

      return buckets;
    },
  });
}

// Combined aging summary for dashboard
export function useAgingSummary() {
  const { data: arAging, isLoading: arLoading } = useAccountsReceivableAging();
  const { data: apAging, isLoading: apLoading } = useAccountsPayableAging();

  return {
    ar: arAging,
    ap: apAging,
    isLoading: arLoading || apLoading,
    netPosition: (arAging?.totalOutstanding || 0) - (apAging?.totalOutstanding || 0),
  };
}
