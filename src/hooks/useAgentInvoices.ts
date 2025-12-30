import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export interface AgentInvoice {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: string;
  invoice_direction: 'from_agent' | 'to_agent';
  created_at: string;
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
  shipment_id: string | null;
  shipment?: {
    tracking_number: string;
    total_weight_kg: number;
  } | null;
}

export interface AgentPayment {
  id: string;
  invoice_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  paid_at: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  verified_at: string | null;
  verified_by: string | null;
}

// Fetch invoices TO agent (from Astraline)
export function useAgentInvoicesToMe() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['agent-invoices-to-me', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          amount,
          currency,
          status,
          invoice_direction,
          created_at,
          due_date,
          paid_at,
          notes,
          shipment_id
        `)
        .eq('agent_id', user.id)
        .eq('invoice_direction', 'to_agent')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get shipment details
      const shipmentIds = data?.map(i => i.shipment_id).filter(Boolean) || [];
      let shipmentsMap = new Map();
      
      if (shipmentIds.length > 0) {
        const { data: shipments } = await supabase
          .from('shipments')
          .select('id, tracking_number, total_weight_kg')
          .in('id', shipmentIds);
        
        shipmentsMap = new Map((shipments || []).map(s => [s.id, s]));
      }

      return (data || []).map(inv => ({
        ...inv,
        shipment: shipmentsMap.get(inv.shipment_id) || null,
      })) as AgentInvoice[];
    },
    enabled: !!user?.id,
  });
}

// Agent marks an invoice as paid
export function useAgentMarkInvoicePaid() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      invoiceId, 
      paymentMethod, 
      paymentReference 
    }: { 
      invoiceId: string; 
      paymentMethod: string;
      paymentReference?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Get invoice amount
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('amount, currency')
        .eq('id', invoiceId)
        .eq('agent_id', user.id)
        .eq('invoice_direction', 'to_agent')
        .single();

      if (invoiceError || !invoice) throw new Error('Invoice not found');

      // Create a payment record with pending verification
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          invoice_id: invoiceId,
          amount: invoice.amount,
          currency: invoice.currency,
          payment_method: paymentMethod,
          verification_status: 'pending',
          paid_at: new Date().toISOString(),
          stripe_payment_id: paymentReference || null, // Reusing this field for reference
        });

      if (paymentError) throw paymentError;

      // Update invoice status to partial/pending verification
      // Don't mark as fully paid until admin verifies
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          notes: invoice.amount ? 
            `Payment of ${invoice.currency} ${invoice.amount} marked by agent, pending verification. Ref: ${paymentReference || 'N/A'}` :
            null,
        })
        .eq('id', invoiceId);

      if (updateError) throw updateError;

      return { invoiceId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-invoices-to-me'] });
      queryClient.invalidateQueries({ queryKey: ['agent-balance'] });
      queryClient.invalidateQueries({ queryKey: ['payments-pending-verification'] });
      toast.success('Payment marked - awaiting Astraline verification');
    },
    onError: (error) => {
      toast.error(`Failed to mark payment: ${error.message}`);
    },
  });
}

// Admin: Fetch payments pending verification
export function usePaymentsPendingVerification() {
  return useQuery({
    queryKey: ['payments-pending-verification'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          invoice_id,
          amount,
          currency,
          payment_method,
          paid_at,
          verification_status,
          stripe_payment_id,
          invoices!inner(
            id,
            invoice_number,
            amount,
            currency,
            agent_id,
            invoice_direction
          )
        `)
        .eq('verification_status', 'pending')
        .eq('invoices.invoice_direction', 'to_agent')
        .order('paid_at', { ascending: false });

      if (error) throw error;

      // Get agent profiles
      const agentIds = [...new Set(data?.map(p => p.invoices?.agent_id).filter(Boolean))];
      let profilesMap = new Map();

      if (agentIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, company_name, agent_code')
          .in('id', agentIds);
        
        profilesMap = new Map((profiles || []).map(p => [p.id, p]));
      }

      return (data || []).map(payment => ({
        ...payment,
        agent: profilesMap.get(payment.invoices?.agent_id) || null,
      }));
    },
  });
}

// Admin: Verify or reject a payment
export function useVerifyPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      paymentId, 
      status,
      invoiceId,
      depositAccountId,
      amount,
      currency,
      invoiceNumber,
    }: { 
      paymentId: string; 
      status: 'verified' | 'rejected';
      invoiceId: string;
      depositAccountId?: string;
      amount?: number;
      currency?: string;
      invoiceNumber?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update payment verification status
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          verification_status: status,
          verified_at: new Date().toISOString(),
          verified_by: user.id,
          status: status === 'verified' ? 'completed' : 'failed',
        })
        .eq('id', paymentId);

      if (paymentError) throw paymentError;

      // If verified, mark invoice as paid and create journal entry
      if (status === 'verified') {
        const { data: payment } = await supabase
          .from('payments')
          .select('amount, currency')
          .eq('id', paymentId)
          .single();

        const { error: invoiceError } = await supabase
          .from('invoices')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            amount_paid: payment?.amount || 0,
          })
          .eq('id', invoiceId);

        if (invoiceError) throw invoiceError;

        // Create journal entry if deposit account is specified
        if (depositAccountId && amount) {
          // Import and use the journal entry utility
          const { createAgentPaymentJournalEntry } = await import('@/lib/journalEntryUtils');
          
          await createAgentPaymentJournalEntry({
            invoiceId,
            invoiceNumber: invoiceNumber || 'Unknown',
            amount,
            currency: currency || 'USD',
            sourceAccountId: depositAccountId,
          });
        }
      }

      return { paymentId, status };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payments-pending-verification'] });
      queryClient.invalidateQueries({ queryKey: ['b2b-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['agent-invoices-to-me'] });
      queryClient.invalidateQueries({ queryKey: ['agent-balance'] });
      queryClient.invalidateQueries({ queryKey: ['all-agent-balances'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast.success(data.status === 'verified' ? 'Payment verified and recorded' : 'Payment rejected');
    },
    onError: (error) => {
      toast.error(`Failed to update payment: ${error.message}`);
    },
  });
}
