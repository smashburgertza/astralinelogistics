import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type InvoiceItemType = 'freight' | 'customs' | 'handling' | 'insurance' | 'duty' | 'transit' | 'other';

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  item_type: InvoiceItemType;
  description: string | null;
  quantity: number;
  unit_price: number;
  amount: number;
  currency: string;
  weight_kg: number | null;
  unit_type: 'fixed' | 'percent' | 'kg' | null;
  product_service_id: string | null;
  created_at: string;
}

export const INVOICE_ITEM_TYPES = {
  freight: { label: 'Freight', description: 'Shipping cost per kg' },
  customs: { label: 'Customs', description: 'Customs clearance fees' },
  handling: { label: 'Handling', description: 'Handling and processing fees' },
  insurance: { label: 'Insurance', description: 'Cargo insurance' },
  duty: { label: 'Duty', description: 'Import duties and taxes' },
  transit: { label: 'Transit Fee', description: 'Transit point additional charges' },
  other: { label: 'Other', description: 'Other charges' },
} as const;

export function useInvoiceItems(invoiceId: string) {
  return useQuery({
    queryKey: ['invoice-items', invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as InvoiceItem[];
    },
    enabled: !!invoiceId,
  });
}

export function useCreateInvoiceItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: Omit<InvoiceItem, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('invoice_items')
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoice-items', variables.invoice_id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error) => {
      toast.error(`Failed to add invoice item: ${error.message}`);
    },
  });
}

export function useCreateInvoiceItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: Omit<InvoiceItem, 'id' | 'created_at'>[]) => {
      if (items.length === 0) return [];
      
      const { data, error } = await supabase
        .from('invoice_items')
        .insert(items)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      if (variables.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['invoice-items', variables[0].invoice_id] });
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
      }
    },
    onError: (error) => {
      toast.error(`Failed to add invoice items: ${error.message}`);
    },
  });
}

export function useUpdateInvoiceItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InvoiceItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('invoice_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoice-items', data.invoice_id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error) => {
      toast.error(`Failed to update invoice item: ${error.message}`);
    },
  });
}

export function useDeleteInvoiceItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, invoiceId }: { id: string; invoiceId: string }) => {
      const { error } = await supabase
        .from('invoice_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, invoiceId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoice-items', data.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice item deleted');
    },
    onError: (error) => {
      toast.error(`Failed to delete invoice item: ${error.message}`);
    },
  });
}

// Helper to create standard invoice items from shipment data
export function createFreightInvoiceItem(params: {
  invoiceId: string;
  weightKg: number;
  ratePerKg: number;
  currency: string;
  description?: string;
}): Omit<InvoiceItem, 'id' | 'created_at'> {
  return {
    invoice_id: params.invoiceId,
    item_type: 'freight',
    description: params.description || `Freight charge @ ${params.ratePerKg}/kg`,
    quantity: 1,
    unit_price: params.ratePerKg,
    amount: params.weightKg * params.ratePerKg,
    currency: params.currency,
    weight_kg: params.weightKg,
    unit_type: 'kg',
    product_service_id: null,
  };
}

export function createHandlingInvoiceItem(params: {
  invoiceId: string;
  amount: number;
  currency: string;
  description?: string;
}): Omit<InvoiceItem, 'id' | 'created_at'> {
  return {
    invoice_id: params.invoiceId,
    item_type: 'handling',
    description: params.description || 'Handling fee',
    quantity: 1,
    unit_price: params.amount,
    amount: params.amount,
    currency: params.currency,
    weight_kg: null,
    unit_type: 'fixed',
    product_service_id: null,
  };
}

export function createTransitInvoiceItem(params: {
  invoiceId: string;
  amount: number;
  currency: string;
  transitPoint: string;
}): Omit<InvoiceItem, 'id' | 'created_at'> {
  return {
    invoice_id: params.invoiceId,
    item_type: 'transit',
    description: `Transit via ${params.transitPoint}`,
    quantity: 1,
    unit_price: params.amount,
    amount: params.amount,
    currency: params.currency,
    weight_kg: null,
    unit_type: 'fixed',
    product_service_id: null,
  };
}
