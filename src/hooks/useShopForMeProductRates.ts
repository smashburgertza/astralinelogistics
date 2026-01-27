import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

export type ProductCategory = 'general' | 'hazardous' | 'cosmetics' | 'electronics' | 'spare_parts';
type AgentRegion = Database['public']['Enums']['agent_region'];

export interface ShopForMeProductRate {
  id: string;
  region: AgentRegion;
  product_category: ProductCategory;
  rate_per_kg: number;
  handling_fee_percentage: number;
  duty_percentage: number;
  markup_percentage: number;
  currency: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export const PRODUCT_CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: 'general', label: 'General Goods' },
  { value: 'hazardous', label: 'Hazardous Goods' },
  { value: 'cosmetics', label: 'Cosmetics' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'spare_parts', label: 'Spare Parts' },
];

export function useShopForMeProductRates(region?: AgentRegion) {
  return useQuery({
    queryKey: ['shop-for-me-product-rates', region],
    queryFn: async () => {
      let query = supabase
        .from('shop_for_me_product_rates')
        .select('*')
        .order('display_order');

      if (region) {
        query = query.eq('region', region);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ShopForMeProductRate[];
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useAllShopForMeProductRates() {
  return useQuery({
    queryKey: ['shop-for-me-product-rates', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shop_for_me_product_rates')
        .select('*')
        .order('region')
        .order('display_order');

      if (error) throw error;
      return data as ShopForMeProductRate[];
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useActiveProductRate(region: AgentRegion, category: ProductCategory) {
  return useQuery({
    queryKey: ['shop-for-me-product-rates', region, category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shop_for_me_product_rates')
        .select('*')
        .eq('region', region)
        .eq('product_category', category)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as ShopForMeProductRate | null;
    },
    enabled: !!region && !!category,
    staleTime: 30 * 1000,
  });
}

export function useCreateShopForMeProductRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rate: {
      region: AgentRegion;
      product_category: string;
      rate_per_kg: number;
      handling_fee_percentage: number;
      duty_percentage: number;
      markup_percentage: number;
      currency: string;
      is_active: boolean;
      display_order: number;
    }) => {
      const { data, error } = await supabase
        .from('shop_for_me_product_rates')
        .insert(rate)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-for-me-product-rates'] });
      toast.success('Product rate created successfully');
    },
    onError: (error) => {
      console.error('Error creating product rate:', error);
      toast.error('Failed to create product rate');
    },
  });
}

export function useUpdateShopForMeProductRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<{
      region: AgentRegion;
      product_category: string;
      rate_per_kg: number;
      handling_fee_percentage: number;
      duty_percentage: number;
      markup_percentage: number;
      currency: string;
      is_active: boolean;
      display_order: number;
    }>) => {
      const { data, error } = await supabase
        .from('shop_for_me_product_rates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-for-me-product-rates'] });
      toast.success('Product rate updated successfully');
    },
    onError: (error) => {
      console.error('Error updating product rate:', error);
      toast.error('Failed to update product rate');
    },
  });
}

export function useDeleteShopForMeProductRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('shop_for_me_product_rates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-for-me-product-rates'] });
      toast.success('Product rate deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting product rate:', error);
      toast.error('Failed to delete product rate');
    },
  });
}

// Calculate product cost using category-specific rates
export function calculateProductCost(
  productCost: number,
  weightKg: number,
  rate: ShopForMeProductRate
) {
  // Shipping cost based on weight and rate per kg
  const shippingCost = weightKg * rate.rate_per_kg;
  
  // Duty based on product cost
  const dutyAmount = (productCost * rate.duty_percentage) / 100;
  
  // Handling fee based on product cost + shipping
  const handlingFeeAmount = ((productCost + shippingCost) * rate.handling_fee_percentage) / 100;
  
  // Markup (profit margin) based on subtotal
  const subtotal = productCost + shippingCost + dutyAmount + handlingFeeAmount;
  const markupAmount = (subtotal * rate.markup_percentage) / 100;
  
  const total = subtotal + markupAmount;

  return {
    breakdown: [
      { name: 'Product Cost', key: 'product_cost', amount: productCost },
      { name: 'Shipping', key: 'shipping', amount: shippingCost },
      { name: 'Duty', key: 'duty', amount: dutyAmount, percentage: rate.duty_percentage },
      { name: 'Handling Fee', key: 'handling_fee', amount: handlingFeeAmount, percentage: rate.handling_fee_percentage },
      ...(rate.markup_percentage > 0 ? [{ name: 'Markup', key: 'markup', amount: markupAmount, percentage: rate.markup_percentage }] : []),
    ],
    total,
    shippingCost,
    currency: rate.currency,
  };
}
