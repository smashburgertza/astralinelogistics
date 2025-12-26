import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DeliveryTimes {
  sea_cargo: string;
  air_cargo: string;
  vehicle_roro: string;
  vehicle_container: string;
  shop_for_me: string;
  full_container: string;
}

const DEFAULT_TIMES: DeliveryTimes = {
  sea_cargo: '4-6 weeks',
  air_cargo: '7-10 working days',
  vehicle_roro: '4-6 weeks',
  vehicle_container: '6-8 weeks',
  shop_for_me: '7-10 working days',
  full_container: '4-6 weeks',
};

export function useDeliveryTimes() {
  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'delivery_times'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'delivery_times')
        .maybeSingle();
      
      if (error) throw error;
      return data?.value as unknown as DeliveryTimes | null;
    },
  });

  return {
    times: { ...DEFAULT_TIMES, ...data },
    isLoading,
  };
}
