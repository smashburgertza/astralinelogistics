import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type TransitPointType = 'direct' | 'nairobi' | 'zanzibar';

export interface TransitRoute {
  id: string;
  region_id: string;
  transit_point: TransitPointType;
  is_active: boolean;
  additional_cost: number;
  currency: string;
  estimated_days: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  region?: {
    id: string;
    name: string;
    code: string;
    flag_emoji: string;
  };
}

export function useTransitRoutes() {
  return useQuery({
    queryKey: ['transit-routes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transit_routes')
        .select(`
          *,
          region:regions(id, name, code, flag_emoji)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TransitRoute[];
    },
  });
}

export function useTransitRoutesByRegion(regionCode: string | undefined) {
  return useQuery({
    queryKey: ['transit-routes', 'by-region', regionCode],
    queryFn: async () => {
      if (!regionCode) return [];
      
      // First get the region ID from code
      const { data: region } = await supabase
        .from('regions')
        .select('id')
        .eq('code', regionCode)
        .maybeSingle();

      if (!region) return [];

      const { data, error } = await supabase
        .from('transit_routes')
        .select('*')
        .eq('region_id', region.id)
        .eq('is_active', true)
        .order('transit_point');

      if (error) throw error;
      return data as TransitRoute[];
    },
    enabled: !!regionCode,
  });
}

export function useCreateTransitRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      region_id: string;
      transit_point: TransitPointType;
      is_active?: boolean;
      additional_cost?: number;
      currency?: string;
      estimated_days?: number;
      notes?: string;
    }) => {
      const { data: result, error } = await supabase
        .from('transit_routes')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transit-routes'] });
      toast.success('Transit route created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create transit route');
    },
  });
}

export function useUpdateTransitRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: {
      id: string;
      is_active?: boolean;
      additional_cost?: number;
      currency?: string;
      estimated_days?: number;
      notes?: string;
    }) => {
      const { data: result, error } = await supabase
        .from('transit_routes')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transit-routes'] });
      toast.success('Transit route updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update transit route');
    },
  });
}

export function useDeleteTransitRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transit_routes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transit-routes'] });
      toast.success('Transit route deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete transit route');
    },
  });
}

// Transit point display helpers
export const TRANSIT_POINT_LABELS: Record<TransitPointType, string> = {
  direct: 'Direct',
  nairobi: 'Via Nairobi',
  zanzibar: 'Via Zanzibar',
};

export const TRANSIT_POINT_OPTIONS: { value: TransitPointType; label: string }[] = [
  { value: 'direct', label: 'Direct' },
  { value: 'nairobi', label: 'Via Nairobi' },
  { value: 'zanzibar', label: 'Via Zanzibar' },
];
