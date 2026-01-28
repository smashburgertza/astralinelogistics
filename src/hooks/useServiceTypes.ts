import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Named ProductServiceType to avoid conflict with ServiceType from useRegionDeliveryTimes
export interface ProductServiceType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color_class: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Re-export as ServiceType for backwards compatibility when importing directly
export type { ProductServiceType as ServiceTypeRecord };

export function useServiceTypes(filters?: { active?: boolean }) {
  return useQuery({
    queryKey: ['service-types', filters],
    queryFn: async () => {
      let query = supabase
        .from('service_types')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (filters?.active !== undefined) {
        query = query.eq('is_active', filters.active);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ProductServiceType[];
    },
  });
}

export function useCreateServiceType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: Omit<ProductServiceType, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('service_types')
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-types'] });
      queryClient.refetchQueries({ queryKey: ['service-types'] });
      toast.success('Service type created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create: ${error.message}`);
    },
  });
}

export function useUpdateServiceType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProductServiceType> & { id: string }) => {
      const { data, error } = await supabase
        .from('service_types')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-types'] });
      queryClient.refetchQueries({ queryKey: ['service-types'] });
      toast.success('Service type updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });
}

export function useDeleteServiceType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('service_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-types'] });
      queryClient.refetchQueries({ queryKey: ['service-types'] });
      toast.success('Service type deleted');
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });
}

// Helper function to generate slug from name
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_');
}

// Available color classes for service types
export const SERVICE_TYPE_COLORS = [
  { value: 'bg-blue-100 text-blue-800', label: 'Blue', preview: 'bg-blue-500' },
  { value: 'bg-cyan-100 text-cyan-800', label: 'Cyan', preview: 'bg-cyan-500' },
  { value: 'bg-orange-100 text-orange-800', label: 'Orange', preview: 'bg-orange-500' },
  { value: 'bg-purple-100 text-purple-800', label: 'Purple', preview: 'bg-purple-500' },
  { value: 'bg-green-100 text-green-800', label: 'Green', preview: 'bg-green-500' },
  { value: 'bg-yellow-100 text-yellow-800', label: 'Yellow', preview: 'bg-yellow-500' },
  { value: 'bg-pink-100 text-pink-800', label: 'Pink', preview: 'bg-pink-500' },
  { value: 'bg-red-100 text-red-800', label: 'Red', preview: 'bg-red-500' },
  { value: 'bg-indigo-100 text-indigo-800', label: 'Indigo', preview: 'bg-indigo-500' },
  { value: 'bg-gray-100 text-gray-800', label: 'Gray', preview: 'bg-gray-500' },
] as const;
