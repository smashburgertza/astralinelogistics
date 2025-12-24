import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';

export type CustomerShipment = Tables<'shipments'>;
export type CustomerInvoice = Tables<'invoices'>;

export function useCustomerProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['customer-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCustomerShipments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['customer-shipments', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // First get the customer ID for this user
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!customer) return [];

      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CustomerShipment[];
    },
    enabled: !!user,
  });
}

export function useCustomerInvoices() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['customer-invoices', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // First get the customer ID for this user
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!customer) return [];

      const { data, error } = await supabase
        .from('invoices')
        .select('*, shipments(tracking_number)')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCustomerStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['customer-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Get customer
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!customer) {
        return {
          activeShipments: 0,
          deliveredShipments: 0,
          pendingInvoices: 0,
          totalPaid: 0,
        };
      }

      // Get shipments
      const { data: shipments } = await supabase
        .from('shipments')
        .select('status')
        .eq('customer_id', customer.id);

      // Get invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('amount, status')
        .eq('customer_id', customer.id);

      const activeShipments = shipments?.filter(s => 
        s.status === 'collected' || s.status === 'in_transit' || s.status === 'arrived'
      ).length || 0;

      const deliveredShipments = shipments?.filter(s => s.status === 'delivered').length || 0;

      const pendingInvoices = invoices?.filter(i => i.status === 'pending').length || 0;

      const totalPaid = invoices
        ?.filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + Number(i.amount), 0) || 0;

      return {
        activeShipments,
        deliveredShipments,
        pendingInvoices,
        totalPaid,
      };
    },
    enabled: !!user,
  });
}
