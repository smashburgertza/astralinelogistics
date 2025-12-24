import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface CustomerPayment {
  id: string;
  amount: number;
  currency: string | null;
  payment_method: string;
  status: string | null;
  paid_at: string | null;
  invoice: {
    id: string;
    invoice_number: string;
    shipment_id: string | null;
  } | null;
}

export function useCustomerPayments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['customer-payments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // First get customer id for this user
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!customer) return [];

      // Get invoices for this customer
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id')
        .eq('customer_id', customer.id);

      if (!invoices || invoices.length === 0) return [];

      const invoiceIds = invoices.map(inv => inv.id);

      // Get payments for these invoices
      const { data: payments, error } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          currency,
          payment_method,
          status,
          paid_at,
          invoice_id
        `)
        .in('invoice_id', invoiceIds)
        .order('paid_at', { ascending: false });

      if (error) throw error;

      // Get invoice details
      const { data: invoiceDetails } = await supabase
        .from('invoices')
        .select('id, invoice_number, shipment_id')
        .in('id', invoiceIds);

      const invoiceMap = new Map(invoiceDetails?.map(inv => [inv.id, inv]) || []);

      return (payments || []).map(payment => ({
        ...payment,
        invoice: payment.invoice_id ? invoiceMap.get(payment.invoice_id) || null : null,
      })) as CustomerPayment[];
    },
    enabled: !!user?.id,
  });
}
