import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ShopForMeCharge {
  id: string;
  charge_name: string;
  charge_key: string;
  charge_type: 'percentage' | 'fixed';
  charge_value: number;
  applies_to: 'product_cost' | 'subtotal' | 'cumulative';
  display_order: number;
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export function useShopForMeCharges() {
  return useQuery({
    queryKey: ['shop-for-me-charges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shop_for_me_charges')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data as ShopForMeCharge[];
    },
  });
}

export function useAllShopForMeCharges() {
  return useQuery({
    queryKey: ['shop-for-me-charges', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shop_for_me_charges')
        .select('*')
        .order('display_order');

      if (error) throw error;
      return data as ShopForMeCharge[];
    },
  });
}

export function useCreateShopForMeCharge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (charge: Omit<ShopForMeCharge, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('shop_for_me_charges')
        .insert(charge)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-for-me-charges'] });
      toast.success('Charge created successfully');
    },
    onError: (error) => {
      console.error('Error creating charge:', error);
      toast.error('Failed to create charge');
    },
  });
}

export function useUpdateShopForMeCharge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ShopForMeCharge> & { id: string }) => {
      const { data, error } = await supabase
        .from('shop_for_me_charges')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-for-me-charges'] });
      toast.success('Charge updated successfully');
    },
    onError: (error) => {
      console.error('Error updating charge:', error);
      toast.error('Failed to update charge');
    },
  });
}

export function useDeleteShopForMeCharge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('shop_for_me_charges')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-for-me-charges'] });
      toast.success('Charge deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting charge:', error);
      toast.error('Failed to delete charge');
    },
  });
}

// Calculate charges based on product cost, weight, and shipping rate
export function calculateShopForMeCharges(
  productCost: number,
  weightKg: number,
  shippingRatePerKg: number,
  charges: ShopForMeCharge[]
) {
  const breakdown: { name: string; key: string; amount: number; percentage?: number }[] = [];
  
  // Start with product cost
  breakdown.push({
    name: 'Product Cost',
    key: 'product_cost',
    amount: productCost,
  });

  // Calculate shipping cost first (weight × rate)
  const shippingCost = weightKg * shippingRatePerKg;

  // Process percentage/fixed charges in order
  const sortedCharges = [...charges].sort((a, b) => a.display_order - b.display_order);
  
  let dutyAndOtherCharges = 0;

  for (const charge of sortedCharges) {
    let chargeAmount = 0;

    if (charge.charge_type === 'percentage') {
      let base = 0;
      
      switch (charge.applies_to) {
        case 'product_cost':
          // Percentage of product cost only
          base = productCost;
          break;
        case 'subtotal':
          // Percentage of product cost + previous charges (not shipping)
          base = productCost + dutyAndOtherCharges;
          break;
        case 'cumulative':
          // Percentage of product cost + duty/other charges + shipping
          base = productCost + dutyAndOtherCharges + shippingCost;
          break;
      }
      
      chargeAmount = (base * charge.charge_value) / 100;
    } else {
      // Fixed amount
      chargeAmount = charge.charge_value;
    }

    breakdown.push({
      name: charge.charge_name,
      key: charge.charge_key,
      amount: chargeAmount,
      percentage: charge.charge_type === 'percentage' ? charge.charge_value : undefined,
    });

    // Track non-shipping charges for cumulative calculations
    dutyAndOtherCharges += chargeAmount;
  }

  // Add shipping to breakdown (after duty, before handling if handling is cumulative)
  // We need to insert shipping in the right position for display
  // Find where to insert shipping (after duty_clearing, before handling_fee)
  const handlingIndex = breakdown.findIndex(b => b.key === 'handling_fee');
  const shippingEntry = {
    name: 'Shipping Charges',
    key: 'shipping',
    amount: shippingCost,
  };

  if (handlingIndex !== -1) {
    // Insert shipping before handling fee
    breakdown.splice(handlingIndex, 0, shippingEntry);
  } else {
    // Add at the end
    breakdown.push(shippingEntry);
  }

  // Calculate total
  const total = breakdown.reduce((sum, item) => sum + item.amount, 0);

  return {
    breakdown,
    total,
    shippingCost,
  };
}
