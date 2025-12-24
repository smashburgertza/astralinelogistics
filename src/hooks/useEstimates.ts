import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Estimate {
  id: string;
  estimate_number: string;
  customer_id: string | null;
  shipment_id: string | null;
  origin_region: string;
  weight_kg: number;
  rate_per_kg: number;
  handling_fee: number;
  subtotal: number;
  total: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected' | 'converted';
  notes: string | null;
  valid_until: string | null;
  created_at: string;
  created_by: string | null;
  customers?: { id: string; name: string; email: string | null; company_name: string | null } | null;
  shipments?: { id: string; tracking_number: string; total_weight_kg: number } | null;
}

export function useEstimates() {
  return useQuery({
    queryKey: ['estimates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estimates')
        .select(`
          *,
          customers ( id, name, email, company_name ),
          shipments ( id, tracking_number, total_weight_kg )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Estimate[];
    },
  });
}

export function useCreateEstimate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      customer_id: string;
      shipment_id?: string;
      origin_region: string;
      weight_kg: number;
      rate_per_kg: number;
      handling_fee: number;
      currency: string;
      notes?: string;
      valid_days?: number;
    }) => {
      const { data: estimateNumber } = await supabase.rpc('generate_document_number', { prefix: 'EST' });
      const { data: user } = await supabase.auth.getUser();

      const subtotal = data.weight_kg * data.rate_per_kg;
      const total = subtotal + data.handling_fee;

      const validUntil = data.valid_days
        ? new Date(Date.now() + data.valid_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : null;

      const { data: result, error } = await supabase
        .from('estimates')
        .insert({
          estimate_number: estimateNumber || `EST-${Date.now()}`,
          customer_id: data.customer_id,
          shipment_id: data.shipment_id || null,
          origin_region: data.origin_region as 'europe' | 'dubai' | 'china' | 'india' | 'usa' | 'uk',
          weight_kg: data.weight_kg,
          rate_per_kg: data.rate_per_kg,
          handling_fee: data.handling_fee,
          subtotal,
          total,
          currency: data.currency,
          status: 'pending',
          notes: data.notes || null,
          valid_until: validUntil,
          created_by: user.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      toast.success('Estimate created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create estimate');
    },
  });
}

export function useUpdateEstimateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('estimates')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      toast.success('Estimate status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update estimate');
    },
  });
}

export function useConvertEstimateToInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (estimateId: string) => {
      // Get estimate details
      const { data: estimate, error: fetchError } = await supabase
        .from('estimates')
        .select('*')
        .eq('id', estimateId)
        .single();

      if (fetchError) throw fetchError;
      if (!estimate) throw new Error('Estimate not found');

      // Generate invoice number
      const { data: invoiceNumber } = await supabase.rpc('generate_document_number', { prefix: 'INV' });
      const { data: user } = await supabase.auth.getUser();

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber || `INV-${Date.now()}`,
          customer_id: estimate.customer_id,
          shipment_id: estimate.shipment_id,
          estimate_id: estimateId,
          amount: estimate.total,
          currency: estimate.currency,
          status: 'pending',
          notes: estimate.notes,
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          created_by: user.user?.id || null,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Update estimate status
      await supabase
        .from('estimates')
        .update({ status: 'converted' })
        .eq('id', estimateId);

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Estimate converted to invoice');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to convert estimate');
    },
  });
}

export function useDeleteEstimate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('estimates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      toast.success('Estimate deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete estimate');
    },
  });
}
