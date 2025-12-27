import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type VehicleType = 'motorcycle' | 'sedan' | 'suv' | 'truck';
export type ShippingMethod = 'roro' | 'container';

export interface VehiclePricing {
  id: string;
  vehicle_type: VehicleType;
  shipping_method: ShippingMethod;
  region: string;
  region_id: string | null;
  price: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export function useVehiclePricing() {
  const queryClient = useQueryClient();

  const { data: vehiclePricing = [], isLoading } = useQuery({
    queryKey: ['vehicle-pricing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_pricing')
        .select('*')
        .order('vehicle_type')
        .order('shipping_method')
        .order('region');
      
      if (error) throw error;
      return data as VehiclePricing[];
    },
  });

  const updatePricing = useMutation({
    mutationFn: async ({ id, price, currency }: { id: string; price: number; currency: string }) => {
      const { error } = await supabase
        .from('vehicle_pricing')
        .update({ price, currency })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-pricing'] });
      toast.success('Vehicle pricing updated');
    },
    onError: (error) => {
      toast.error('Failed to update pricing: ' + error.message);
    },
  });

  return {
    vehiclePricing,
    isLoading,
    updatePricing,
  };
}
