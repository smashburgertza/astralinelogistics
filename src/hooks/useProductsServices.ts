import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProductService {
  id: string;
  name: string;
  description: string | null;
  category: string;
  service_type: string | null;
  unit_price: number;
  currency: string;
  unit: string | null;
  account_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// SERVICE_TYPES is now dynamic - use useServiceTypes hook instead
// Legacy fallback for backwards compatibility
export const SERVICE_TYPES_LEGACY = {
  air_cargo: { label: 'Air Cargo', color: 'bg-blue-100 text-blue-800' },
  sea_freight: { label: 'Sea Freight', color: 'bg-cyan-100 text-cyan-800' },
  handling: { label: 'Handling', color: 'bg-orange-100 text-orange-800' },
  customs: { label: 'Customs', color: 'bg-purple-100 text-purple-800' },
  insurance: { label: 'Insurance', color: 'bg-green-100 text-green-800' },
  transit: { label: 'Transit', color: 'bg-yellow-100 text-yellow-800' },
  purchasing: { label: 'Purchasing', color: 'bg-pink-100 text-pink-800' },
  other: { label: 'Other', color: 'bg-gray-100 text-gray-800' },
} as const;

// Re-export as SERVICE_TYPES for backwards compatibility
export const SERVICE_TYPES = SERVICE_TYPES_LEGACY;

export const UNIT_TYPES = [
  { value: 'kg', label: 'Per Kilogram (kg)' },
  { value: 'unit', label: 'Per Unit' },
  { value: 'shipment', label: 'Per Shipment' },
  { value: 'hour', label: 'Per Hour' },
  { value: 'cbm', label: 'Per Cubic Meter (CBM)' },
  { value: 'percent', label: 'Percentage (%)' },
] as const;

export function useProductsServices(filters?: { active?: boolean; serviceType?: string }) {
  return useQuery({
    queryKey: ['products-services', filters],
    queryFn: async () => {
      let query = supabase
        .from('products_services')
        .select('*')
        .order('service_type', { ascending: true })
        .order('name', { ascending: true });

      if (filters?.active !== undefined) {
        query = query.eq('is_active', filters.active);
      }

      if (filters?.serviceType) {
        query = query.eq('service_type', filters.serviceType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ProductService[];
    },
  });
}

export function useCreateProductService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: Omit<ProductService, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('products_services')
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-services'] });
      toast.success('Product/Service created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create: ${error.message}`);
    },
  });
}

export function useUpdateProductService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProductService> & { id: string }) => {
      const { data, error } = await supabase
        .from('products_services')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-services'] });
      toast.success('Product/Service updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });
}

export function useDeleteProductService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products_services')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-services'] });
      toast.success('Product/Service deleted');
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });
}

export function useBulkDeleteProductServices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('products_services')
        .delete()
        .in('id', ids);

      if (error) throw error;
      return { count: ids.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products-services'] });
      toast.success(`${data.count} product/service(s) deleted`);
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });
}
