import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ServiceType = 
  | 'sea_cargo' 
  | 'air_cargo' 
  | 'vehicle_roro' 
  | 'vehicle_container' 
  | 'shop_for_me' 
  | 'full_container';

export interface RegionDeliveryTime {
  id: string;
  region_id: string;
  service_type: ServiceType;
  delivery_time: string;
  created_at: string | null;
  updated_at: string | null;
}

export const SERVICE_TYPE_LABELS: Record<ServiceType, { label: string; description: string }> = {
  sea_cargo: { label: 'Sea Cargo (Loose)', description: 'LCL shipments by sea' },
  air_cargo: { label: 'Air Cargo', description: 'Air freight shipments' },
  vehicle_roro: { label: 'Vehicle (RoRo)', description: 'Roll-on/Roll-off shipping' },
  vehicle_container: { label: 'Vehicle (Container)', description: 'Containerized vehicle shipping' },
  shop_for_me: { label: 'Shop For Me', description: 'Personal shopping service' },
  full_container: { label: 'Full Container', description: 'FCL shipments' },
};

export const DEFAULT_DELIVERY_TIMES: Record<ServiceType, string> = {
  sea_cargo: '4-6 weeks',
  air_cargo: '7-10 working days',
  vehicle_roro: '4-6 weeks',
  vehicle_container: '6-8 weeks',
  shop_for_me: '7-10 working days',
  full_container: '4-6 weeks',
};

export function useRegionDeliveryTimes() {
  return useQuery({
    queryKey: ['region_delivery_times'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('region_delivery_times')
        .select('*')
        .order('service_type');
      
      if (error) throw error;
      return data as RegionDeliveryTime[];
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useRegionDeliveryTimesByRegion(regionId: string | undefined) {
  return useQuery({
    queryKey: ['region_delivery_times', regionId],
    queryFn: async () => {
      if (!regionId) return null;
      
      const { data, error } = await supabase
        .from('region_delivery_times')
        .select('*')
        .eq('region_id', regionId);
      
      if (error) throw error;
      
      // Convert to a map for easy lookup
      const timesMap: Partial<Record<ServiceType, string>> = {};
      (data as RegionDeliveryTime[]).forEach(item => {
        timesMap[item.service_type as ServiceType] = item.delivery_time;
      });
      
      // Return with defaults for missing service types
      return {
        sea_cargo: timesMap.sea_cargo || DEFAULT_DELIVERY_TIMES.sea_cargo,
        air_cargo: timesMap.air_cargo || DEFAULT_DELIVERY_TIMES.air_cargo,
        vehicle_roro: timesMap.vehicle_roro || DEFAULT_DELIVERY_TIMES.vehicle_roro,
        vehicle_container: timesMap.vehicle_container || DEFAULT_DELIVERY_TIMES.vehicle_container,
        shop_for_me: timesMap.shop_for_me || DEFAULT_DELIVERY_TIMES.shop_for_me,
        full_container: timesMap.full_container || DEFAULT_DELIVERY_TIMES.full_container,
      };
    },
    enabled: !!regionId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useUpsertRegionDeliveryTime() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      regionId, 
      serviceType, 
      deliveryTime 
    }: { 
      regionId: string; 
      serviceType: ServiceType; 
      deliveryTime: string;
    }) => {
      const { data, error } = await supabase
        .from('region_delivery_times')
        .upsert({
          region_id: regionId,
          service_type: serviceType,
          delivery_time: deliveryTime,
        }, {
          onConflict: 'region_id,service_type',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['region_delivery_times'] });
      toast.success('Delivery time updated');
    },
    onError: (error) => {
      console.error('Error updating delivery time:', error);
      toast.error('Failed to update delivery time');
    },
  });
}

export function useBulkUpsertRegionDeliveryTimes() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (items: { regionId: string; serviceType: ServiceType; deliveryTime: string }[]) => {
      const upsertData = items.map(item => ({
        region_id: item.regionId,
        service_type: item.serviceType,
        delivery_time: item.deliveryTime,
      }));
      
      const { data, error } = await supabase
        .from('region_delivery_times')
        .upsert(upsertData, {
          onConflict: 'region_id,service_type',
        })
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['region_delivery_times'] });
      toast.success('Delivery times updated');
    },
    onError: (error) => {
      console.error('Error updating delivery times:', error);
      toast.error('Failed to update delivery times');
    },
  });
}
