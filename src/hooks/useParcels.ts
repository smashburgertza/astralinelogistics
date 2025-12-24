import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export type Parcel = Tables<'parcels'>;

export function useParcels(shipmentId: string | null) {
  return useQuery({
    queryKey: ['parcels', shipmentId],
    queryFn: async () => {
      if (!shipmentId) return [];
      const { data, error } = await supabase
        .from('parcels')
        .select('*')
        .eq('shipment_id', shipmentId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Parcel[];
    },
    enabled: !!shipmentId,
  });
}
