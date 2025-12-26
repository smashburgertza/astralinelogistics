import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type AgentRegion = Database['public']['Enums']['agent_region'];

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
  region: AgentRegion;
  currency: string;
  created_at: string;
  updated_at: string;
}

export const REGION_CURRENCIES: Record<AgentRegion, string> = {
  usa: 'USD',
  dubai: 'USD',
  china: 'USD',
  india: 'USD',
  europe: 'GBP',
  uk: 'GBP',
};

export const REGION_LABELS: Record<AgentRegion, string> = {
  usa: 'United States',
  dubai: 'Dubai',
  china: 'China',
  india: 'India',
  europe: 'Europe',
  uk: 'United Kingdom',
};

export function useShippingCalculatorCharges(region?: AgentRegion) {
  return useQuery({
    queryKey: ['shipping-calculator-charges', region],
    queryFn: async () => {
      let query = supabase
        .from('shipping_calculator_charges')
        .select('*')
        .order('region', { ascending: true })
        .order('display_order', { ascending: true });

      if (region) {
        query = query.eq('region', region);
      }

      const { data, error } = await query;

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
