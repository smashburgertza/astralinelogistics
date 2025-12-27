import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export type RegionPricing = Tables<'region_pricing'>;
export type AgentAddress = Tables<'agent_addresses'>;

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
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
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

export function useAgentAddresses() {
  return useQuery({
    queryKey: ['agent_addresses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_addresses')
        .select('*')
        .order('region');
      if (error) throw error;
      return data as AgentAddress[];
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useUpdateRegionPricing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      ...updates 
    }: TablesUpdate<'region_pricing'> & { id: string }) => {
      const { data, error } = await supabase
        .from('region_pricing')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['region_pricing'] });
      toast.success('Pricing updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update pricing: ${error.message}`);
    },
  });
}

export function useCreateRegionPricing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pricing: {
      region: 'europe' | 'dubai' | 'china' | 'india';
      customer_rate_per_kg: number;
      agent_rate_per_kg: number;
      handling_fee: number;
      currency: string;
    }) => {
      const { data, error } = await supabase
        .from('region_pricing')
        .insert(pricing)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['region_pricing'] });
      toast.success('Pricing created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create pricing: ${error.message}`);
    },
  });
}

export function useUpdateAgentAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      ...updates 
    }: TablesUpdate<'agent_addresses'> & { id: string }) => {
      const { data, error } = await supabase
        .from('agent_addresses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent_addresses'] });
      toast.success('Address updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update address: ${error.message}`);
    },
  });
}

export function useCreateAgentAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (address: {
      region: 'europe' | 'dubai' | 'china' | 'india';
      address_line1: string;
      address_line2?: string;
      city: string;
      postal_code?: string;
      country: string;
      contact_name?: string;
      contact_phone?: string;
      contact_email?: string;
    }) => {
      const { data, error } = await supabase
        .from('agent_addresses')
        .insert(address)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent_addresses'] });
      toast.success('Address created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create address: ${error.message}`);
    },
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
