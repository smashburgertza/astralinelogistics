import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OrderRequest {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  total_product_cost: number;
  estimated_shipping_cost: number;
  handling_fee: number;
  grand_total: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_request_id: string;
  product_url: string;
  product_name: string | null;
  product_price: number | null;
  currency: string;
  estimated_weight_kg: number | null;
  quantity: number;
  subtotal: number | null;
  created_at: string;
}

export function useOrderRequests() {
  return useQuery({
    queryKey: ['order_requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as OrderRequest[];
    },
  });
}

export function useOrderItems(orderRequestId: string | null) {
  return useQuery({
    queryKey: ['order_items', orderRequestId],
    queryFn: async () => {
      if (!orderRequestId) return [];
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_request_id', orderRequestId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as OrderItem[];
    },
    enabled: !!orderRequestId,
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const updateData: { status: string; notes?: string } = { status };
      if (notes !== undefined) {
        updateData.notes = notes;
      }
      
      const { error } = await supabase
        .from('order_requests')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order_requests'] });
    },
  });
}
