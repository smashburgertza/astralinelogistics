import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Region {
  id: string;
  code: string;
  name: string;
  flag_emoji: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export function useRegions() {
  return useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regions')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as Region[];
    },
  });
}

export function useActiveRegions() {
  return useQuery({
    queryKey: ['regions', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regions')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data as Region[];
    },
  });
}

export function useCreateRegion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (region: {
      code: string;
      name: string;
      flag_emoji?: string;
      is_active?: boolean;
      display_order?: number;
    }) => {
      const { data, error } = await supabase
        .from('regions')
        .insert(region)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      toast.success('Region created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create region: ${error.message}`);
    },
  });
}

export function useUpdateRegion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Region> & { id: string }) => {
      const { data, error } = await supabase
        .from('regions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      toast.success('Region updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update region: ${error.message}`);
    },
  });
}

export function useDeleteRegion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('regions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      toast.success('Region deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete region: ${error.message}`);
    },
  });
}

// Helper to convert regions array to a map for easy lookup
export function regionsToMap(regions: Region[] | undefined): Record<string, Region> {
  if (!regions) return {};
  return regions.reduce((acc, region) => {
    acc[region.code] = region;
    return acc;
  }, {} as Record<string, Region>);
}
