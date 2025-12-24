import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export type Parcel = Tables<'parcels'>;

export function useParcels(shipmentId: string | null) {
  return useQuery({
    queryKey: ['parcels', shipmentId],
    queryFn: async () => {
      if (!shipmentId) return [];
      const { data, error } = await supabase
        .from('parcels')
        .select('*')
        .eq('shipment_id', shipmentId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Parcel[];
    },
    enabled: !!shipmentId,
  });
}

export function useCreateParcel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (parcel: TablesInsert<'parcels'>) => {
      const { data, error } = await supabase
        .from('parcels')
        .insert(parcel)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['parcels', data.shipment_id] });
      toast.success('Parcel added successfully');
    },
    onError: (error) => {
      toast.error(`Failed to add parcel: ${error.message}`);
    },
  });
}

export function useUpdateParcel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'parcels'> & { id: string }) => {
      const { data, error } = await supabase
        .from('parcels')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['parcels', data.shipment_id] });
      toast.success('Parcel updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update parcel: ${error.message}`);
    },
  });
}

export function useDeleteParcel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, shipmentId }: { id: string; shipmentId: string }) => {
      const { error } = await supabase.from('parcels').delete().eq('id', id);
      if (error) throw error;
      return { id, shipmentId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['parcels', data.shipmentId] });
      toast.success('Parcel deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete parcel: ${error.message}`);
    },
  });
}
