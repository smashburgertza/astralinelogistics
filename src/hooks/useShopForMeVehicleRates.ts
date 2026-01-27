import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

export type ShopForMeVehicleType = 'motorcycle' | 'sedan' | 'suv' | 'truck';
export type ShopForMeShippingMethod = 'sea_roro' | 'sea_container' | 'air';
type AgentRegion = Database['public']['Enums']['agent_region'];

export interface ShopForMeVehicleRate {
  id: string;
  region: AgentRegion;
  vehicle_type: ShopForMeVehicleType;
  shipping_method: ShopForMeShippingMethod;
  base_shipping_price: number;
  handling_fee: number;
  duty_percentage: number;
  markup_percentage: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const VEHICLE_TYPES: { value: ShopForMeVehicleType; label: string }[] = [
  { value: 'motorcycle', label: 'Motorcycle' },
  { value: 'sedan', label: 'Sedan' },
  { value: 'suv', label: 'SUV' },
  { value: 'truck', label: 'Truck' },
];

export const SHIPPING_METHODS: { value: ShopForMeShippingMethod; label: string }[] = [
  { value: 'sea_roro', label: 'Sea (RoRo)' },
  { value: 'sea_container', label: 'Sea (Container)' },
  { value: 'air', label: 'Air Freight' },
];

export function useShopForMeVehicleRates(region?: AgentRegion) {
  return useQuery({
    queryKey: ['shop-for-me-vehicle-rates', region],
    queryFn: async () => {
      let query = supabase
        .from('shop_for_me_vehicle_rates')
        .select('*')
        .order('vehicle_type')
        .order('shipping_method');

      if (region) {
        query = query.eq('region', region);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ShopForMeVehicleRate[];
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useAllShopForMeVehicleRates() {
  return useQuery({
    queryKey: ['shop-for-me-vehicle-rates', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shop_for_me_vehicle_rates')
        .select('*')
        .order('region')
        .order('vehicle_type')
        .order('shipping_method');

      if (error) throw error;
      return data as ShopForMeVehicleRate[];
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useActiveVehicleRate(region: AgentRegion, vehicleType: ShopForMeVehicleType, shippingMethod: ShopForMeShippingMethod) {
  return useQuery({
    queryKey: ['shop-for-me-vehicle-rates', region, vehicleType, shippingMethod],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shop_for_me_vehicle_rates')
        .select('*')
        .eq('region', region)
        .eq('vehicle_type', vehicleType)
        .eq('shipping_method', shippingMethod)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as ShopForMeVehicleRate | null;
    },
    enabled: !!region && !!vehicleType && !!shippingMethod,
    staleTime: 30 * 1000,
  });
}

export function useCreateShopForMeVehicleRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rate: {
      region: AgentRegion;
      vehicle_type: string;
      shipping_method: string;
      base_shipping_price: number;
      handling_fee: number;
      duty_percentage: number;
      markup_percentage: number;
      currency: string;
      is_active: boolean;
    }) => {
      const { data, error } = await supabase
        .from('shop_for_me_vehicle_rates')
        .insert(rate)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-for-me-vehicle-rates'] });
      toast.success('Vehicle rate created successfully');
    },
    onError: (error) => {
      console.error('Error creating vehicle rate:', error);
      toast.error('Failed to create vehicle rate');
    },
  });
}

export function useUpdateShopForMeVehicleRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<{
      region: AgentRegion;
      vehicle_type: string;
      shipping_method: string;
      base_shipping_price: number;
      handling_fee: number;
      duty_percentage: number;
      markup_percentage: number;
      currency: string;
      is_active: boolean;
    }>) => {
      const { data, error } = await supabase
        .from('shop_for_me_vehicle_rates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-for-me-vehicle-rates'] });
      toast.success('Vehicle rate updated successfully');
    },
    onError: (error) => {
      console.error('Error updating vehicle rate:', error);
      toast.error('Failed to update vehicle rate');
    },
  });
}

export function useDeleteShopForMeVehicleRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('shop_for_me_vehicle_rates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-for-me-vehicle-rates'] });
      toast.success('Vehicle rate deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting vehicle rate:', error);
      toast.error('Failed to delete vehicle rate');
    },
  });
}

// Calculate vehicle shipping cost
export function calculateVehicleCost(
  vehiclePrice: number,
  rate: ShopForMeVehicleRate
) {
  // Base shipping price
  const shippingCost = rate.base_shipping_price;
  
  // Handling fee (fixed amount)
  const handlingFee = rate.handling_fee;
  
  // Duty based on vehicle price
  const dutyAmount = (vehiclePrice * rate.duty_percentage) / 100;
  
  // Markup (profit margin) based on subtotal
  const subtotal = vehiclePrice + shippingCost + handlingFee + dutyAmount;
  const markupAmount = (subtotal * rate.markup_percentage) / 100;
  
  // CIF (Cost, Insurance, Freight) - vehicle price + shipping + handling
  const cifValue = vehiclePrice + shippingCost + handlingFee;
  
  // Total duty paid price
  const totalDutyPaid = subtotal + markupAmount;

  return {
    breakdown: [
      { name: 'Vehicle Price', key: 'vehicle_price', amount: vehiclePrice },
      { name: 'Shipping', key: 'shipping', amount: shippingCost },
      { name: 'Handling Fee', key: 'handling_fee', amount: handlingFee },
      { name: 'Duty', key: 'duty', amount: dutyAmount, percentage: rate.duty_percentage },
      ...(rate.markup_percentage > 0 ? [{ name: 'Markup', key: 'markup', amount: markupAmount, percentage: rate.markup_percentage }] : []),
    ],
    cifValue,
    totalDutyPaid,
    shippingCost,
    currency: rate.currency,
  };
}
