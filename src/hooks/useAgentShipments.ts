import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';

export type Shipment = Tables<'shipments'> & {
  customers?: Tables<'customers'> | null;
};

export function useAgentShipments(filters?: {
  status?: string;
  search?: string;
}) {
  const { getRegion } = useAuth();
  const region = getRegion();

  return useQuery({
    queryKey: ['agent-shipments', region, filters],
    queryFn: async () => {
      if (!region) return [];

      let query = supabase
        .from('shipments')
        .select('*, customers(name, email, company_name)')
        .eq('origin_region', region)
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status as 'collected' | 'in_transit' | 'arrived' | 'delivered');
      }
      if (filters?.search) {
        query = query.or(`tracking_number.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Shipment[];
    },
    enabled: !!region,
  });
}

export function useAgentShipmentStats() {
  const { getRegion } = useAuth();
  const region = getRegion();

  return useQuery({
    queryKey: ['agent-shipment-stats', region],
    queryFn: async () => {
      if (!region) return null;

      const { data, error } = await supabase
        .from('shipments')
        .select('status, total_weight_kg, created_at')
        .eq('origin_region', region);

      if (error) throw error;

      const now = new Date();
      const thisMonth = data?.filter(s => {
        const createdAt = new Date(s.created_at || '');
        return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
      });

      const stats = {
        total: data?.length || 0,
        collected: data?.filter(s => s.status === 'collected').length || 0,
        inTransit: data?.filter(s => s.status === 'in_transit').length || 0,
        arrived: data?.filter(s => s.status === 'arrived').length || 0,
        delivered: data?.filter(s => s.status === 'delivered').length || 0,
        thisMonth: thisMonth?.length || 0,
        totalWeight: data?.reduce((sum, s) => sum + Number(s.total_weight_kg), 0) || 0,
        thisMonthWeight: thisMonth?.reduce((sum, s) => sum + Number(s.total_weight_kg), 0) || 0,
      };

      return stats;
    },
    enabled: !!region,
  });
}
