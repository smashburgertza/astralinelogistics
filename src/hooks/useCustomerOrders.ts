import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface OrderRequest {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  status: string;
  total_product_cost: number;
  handling_fee: number;
  estimated_shipping_cost: number;
  grand_total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  product_url: string;
  product_name: string | null;
  product_price: number | null;
  quantity: number;
  subtotal: number | null;
  currency: string | null;
}

export function useCustomerOrders() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['customer-orders', profile?.email],
    queryFn: async () => {
      if (!profile?.email) return [];

      const { data: orders, error } = await supabase
        .from('order_requests')
        .select('*')
        .eq('customer_email', profile.email)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch items for each order
      const ordersWithItems = await Promise.all(
        (orders || []).map(async (order) => {
          const { data: items } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_request_id', order.id);

          return {
            ...order,
            items: items || [],
          } as OrderRequest;
        })
      );

      return ordersWithItems;
    },
    enabled: !!profile?.email,
  });
}
