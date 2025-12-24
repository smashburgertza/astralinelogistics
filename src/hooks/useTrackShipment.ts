import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export type TrackedShipment = Tables<'shipments'> & {
  parcels: Tables<'parcels'>[];
};

export function useTrackShipment(trackingNumber: string | null) {
  return useQuery({
    queryKey: ['track-shipment', trackingNumber],
    queryFn: async () => {
      if (!trackingNumber) return null;

      // Fetch shipment by tracking number
      const { data: shipment, error: shipmentError } = await supabase
        .from('shipments')
        .select('*')
        .eq('tracking_number', trackingNumber)
        .maybeSingle();

      if (shipmentError) throw shipmentError;
      if (!shipment) return null;

      // Fetch parcels for this shipment
      const { data: parcels, error: parcelsError } = await supabase
        .from('parcels')
        .select('*')
        .eq('shipment_id', shipment.id)
        .order('created_at', { ascending: true });

      if (parcelsError) throw parcelsError;

      return {
        ...shipment,
        parcels: parcels || [],
      } as TrackedShipment;
    },
    enabled: !!trackingNumber,
  });
}
