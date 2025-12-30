import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface CustomerPayment {
  id: string;
  amount: number;
  currency: string | null;
  payment_method: string;
  status: string | null;
  paid_at: string | null;
  verification_status: 'pending' | 'verified' | 'rejected' | null;
  invoice: {
    id: string;
    invoice_number: string;
    shipment_id: string | null;
  } | null;
}

export interface CustomerInvoice {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
  amount_in_tzs: number | null;
  shipment?: {
    tracking_number: string;
    total_weight_kg: number;
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
          invoice_id,
          verification_status
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

// Customer marks an invoice as paid
export function useCustomerMarkInvoicePaid() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      invoiceId, 
      paymentMethod, 
      paymentReference,
      paymentCurrency,
    }: { 
      invoiceId: string; 
      paymentMethod: string;
      paymentReference?: string;
      paymentCurrency?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Get customer
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!customer) throw new Error('Customer not found');

      // Get invoice amount and verify it belongs to this customer
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('amount, currency, amount_in_tzs')
        .eq('id', invoiceId)
        .eq('customer_id', customer.id)
        .single();

      if (invoiceError || !invoice) throw new Error('Invoice not found');

      const payAmount = paymentCurrency === 'TZS' && invoice.amount_in_tzs 
        ? invoice.amount_in_tzs 
        : invoice.amount;
      const payCurrency = paymentCurrency || invoice.currency;

      // Create a payment record with pending verification
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          invoice_id: invoiceId,
          amount: payAmount,
          currency: payCurrency,
          payment_method: paymentMethod,
          verification_status: 'pending',
          status: 'pending',
          paid_at: new Date().toISOString(),
          stripe_payment_id: paymentReference || null,
        });

      if (paymentError) throw paymentError;

      // Update invoice notes to track the payment submission
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          notes: `Payment of ${payCurrency} ${payAmount.toLocaleString()} marked by customer, pending verification. Ref: ${paymentReference || 'N/A'}`,
        })
        .eq('id', invoiceId);

      if (updateError) throw updateError;

      return { invoiceId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-payments'] });
      queryClient.invalidateQueries({ queryKey: ['customer-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payments-pending-verification'] });
      toast.success('Payment marked - awaiting verification by Astraline');
    },
    onError: (error) => {
      toast.error(`Failed to mark payment: ${error.message}`);
    },
  });
}
