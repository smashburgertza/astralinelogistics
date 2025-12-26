import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Region } from '@/lib/constants';

export interface ContainerPricing {
  id: string;
  container_size: '20ft' | '40ft';
  region: Region;
  price: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export function useContainerPricing() {
  const queryClient = useQueryClient();

  const { data: containerPricing = [], isLoading } = useQuery({
    queryKey: ['container-pricing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('container_pricing')
        .select('*')
        .order('container_size')
        .order('region');
      
      if (error) throw error;
      return data as ContainerPricing[];
    },
  });

  const updatePricing = useMutation({
    mutationFn: async ({ id, price, currency }: { id: string; price: number; currency: string }) => {
      const { error } = await supabase
        .from('container_pricing')
        .update({ price, currency })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['container-pricing'] });
      toast.success('Container pricing updated');
    },
    onError: (error) => {
      toast.error('Failed to update pricing: ' + error.message);
    },
  });

  return {
    containerPricing,
    isLoading,
    updatePricing,
  };
}
