import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export type Payment = Tables<'payments'>;

export function useInvoicePayments(invoiceId: string) {
  return useQuery({
    queryKey: ['invoice-payments', invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('paid_at', { ascending: false });

      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!invoiceId,
  });
}
