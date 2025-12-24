import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export type RegionPricing = Tables<'region_pricing'>;

export function useRegionPricing() {
  return useQuery({
    queryKey: ['region_pricing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('region_pricing')
        .select('*')
        .order('region');
      if (error) throw error;
      return data as RegionPricing[];
    },
  });
}

export function useRegionPricingByRegion(region: string | undefined) {
  return useQuery({
    queryKey: ['region_pricing', region],
    queryFn: async () => {
      if (!region) return null;
      const { data, error } = await supabase
        .from('region_pricing')
        .select('*')
        .eq('region', region as 'europe' | 'dubai' | 'china' | 'india')
        .maybeSingle();
      if (error) throw error;
      return data as RegionPricing | null;
    },
    enabled: !!region,
  });
}

export function calculateShipmentCost(
  weightKg: number,
  pricing: RegionPricing | null | undefined
): { subtotal: number; handlingFee: number; total: number; currency: string } {
  if (!pricing) {
    return { subtotal: 0, handlingFee: 0, total: 0, currency: 'USD' };
  }

  const subtotal = weightKg * pricing.customer_rate_per_kg;
  const handlingFee = pricing.handling_fee || 0;
  const total = subtotal + handlingFee;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    handlingFee: Math.round(handlingFee * 100) / 100,
    total: Math.round(total * 100) / 100,
    currency: pricing.currency,
  };
}
