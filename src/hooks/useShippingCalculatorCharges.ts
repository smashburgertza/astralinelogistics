import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ShippingCalculatorCharge {
  id: string;
  charge_key: string;
  charge_name: string;
  charge_type: 'fixed' | 'percentage';
  charge_value: number;
  applies_to: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export function useShippingCalculatorCharges() {
  return useQuery({
    queryKey: ['shipping-calculator-charges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipping_calculator_charges')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as ShippingCalculatorCharge[];
    },
  });
}

export function useCreateShippingCalculatorCharge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (charge: Omit<ShippingCalculatorCharge, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('shipping_calculator_charges')
        .insert(charge)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-calculator-charges'] });
    },
  });
}

export function useUpdateShippingCalculatorCharge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ShippingCalculatorCharge> & { id: string }) => {
      const { data, error } = await supabase
        .from('shipping_calculator_charges')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-calculator-charges'] });
    },
  });
}

export function useDeleteShippingCalculatorCharge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('shipping_calculator_charges')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-calculator-charges'] });
    },
  });
}
