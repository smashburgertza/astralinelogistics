import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { useAgentAssignedRegions } from '@/hooks/useAgentRegions';
import { toast } from 'sonner';

export type Shipment = Tables<'shipments'> & {
  customers?: Tables<'customers'> | null;
};

export function useAgentShipments(filters?: {
  status?: string;
  search?: string;
  includeDrafts?: boolean;
}) {
  const { user } = useAuth();
  const { data: assignedRegions } = useAgentAssignedRegions();
  const regionCodes = assignedRegions?.map(r => r.region_code) || [];

  return useQuery({
    queryKey: ['agent-shipments', user?.id, regionCodes, filters],
    queryFn: async () => {
      if (!user?.id || regionCodes.length === 0) return [];

      let query = supabase
        .from('shipments')
        .select('*, customers(name, email, company_name)')
        .in('origin_region', regionCodes)
        .order('created_at', { ascending: false });

      // By default, exclude drafts unless explicitly requested
      if (!filters?.includeDrafts) {
        query = query.eq('is_draft', false);
      }

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status as 'collected' | 'in_transit' | 'arrived' | 'delivered');
      }
      if (filters?.search) {
        query = query.or(`tracking_number.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Shipment[];
    },
    enabled: !!user?.id && regionCodes.length > 0,
  });
}

// Hook specifically for draft shipments
export function useAgentDraftShipments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['agent-draft-shipments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('shipments')
        .select('*, customers(name, email, company_name), parcels(*)')
        .eq('agent_id', user.id)
        .eq('is_draft', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

export function useAgentShipmentStats() {
  const { user } = useAuth();
  const { data: assignedRegions } = useAgentAssignedRegions();
  const regionCodes = assignedRegions?.map(r => r.region_code) || [];

  return useQuery({
    queryKey: ['agent-shipment-stats', user?.id, regionCodes],
    queryFn: async () => {
      if (!user?.id || regionCodes.length === 0) return null;

      const { data, error } = await supabase
        .from('shipments')
        .select('status, total_weight_kg, created_at')
        .in('origin_region', regionCodes);

      if (error) throw error;

      const now = new Date();
      const thisMonth = data?.filter(s => {
        const createdAt = new Date(s.created_at || '');
        return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
      });

      const stats = {
        total: data?.length || 0,
        collected: data?.filter(s => s.status === 'collected').length || 0,
        inTransit: data?.filter(s => s.status === 'in_transit').length || 0,
        arrived: data?.filter(s => s.status === 'arrived').length || 0,
        delivered: data?.filter(s => s.status === 'delivered').length || 0,
        thisMonth: thisMonth?.length || 0,
        totalWeight: data?.reduce((sum, s) => sum + Number(s.total_weight_kg), 0) || 0,
        thisMonthWeight: thisMonth?.reduce((sum, s) => sum + Number(s.total_weight_kg), 0) || 0,
      };

      return stats;
    },
    enabled: !!user?.id && regionCodes.length > 0,
  });
}

// Hook to finalize a draft shipment
export function useFinalizeDraftShipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shipmentId: string) => {
      const { error } = await supabase
        .from('shipments')
        .update({ is_draft: false })
        .eq('id', shipmentId)
        .eq('is_draft', true);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-shipments'] });
      queryClient.invalidateQueries({ queryKey: ['agent-draft-shipments'] });
      queryClient.invalidateQueries({ queryKey: ['agent-shipment-stats'] });
      toast.success('Shipment finalized successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to finalize shipment: ' + error.message);
    },
  });
}

// Hook to delete a draft shipment
export function useDeleteDraftShipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shipmentId: string) => {
      // First delete related parcels
      const { error: parcelError } = await supabase
        .from('parcels')
        .delete()
        .eq('shipment_id', shipmentId);

      if (parcelError) throw parcelError;

      // Then delete the shipment
      const { error } = await supabase
        .from('shipments')
        .delete()
        .eq('id', shipmentId)
        .eq('is_draft', true);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-draft-shipments'] });
      toast.success('Draft deleted');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete draft: ' + error.message);
    },
  });
}

// Hook to update a draft shipment
export function useUpdateDraftShipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      customer_id?: string | null;
      customer_name?: string | null;
      total_weight_kg?: number;
      description?: string | null;
      rate_per_kg?: number;
      transit_point?: 'direct' | 'nairobi' | 'zanzibar';
    }) => {
      const { id, ...updates } = data;
      const { error } = await supabase
        .from('shipments')
        .update(updates)
        .eq('id', id)
        .eq('is_draft', true);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-draft-shipments'] });
      toast.success('Draft updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update draft: ' + error.message);
    },
  });
}

export function useUpdateAgentShipment() {
  const queryClient = useQueryClient();
  const { data: assignedRegions } = useAgentAssignedRegions();
  const regionCodes = assignedRegions?.map(r => r.region_code) || [];

  return useMutation({
    mutationFn: async (data: {
      id: string;
      customer_id: string;
      total_weight_kg: number;
      description: string | null;
      warehouse_location: string | null;
    }) => {
      // Verify the shipment belongs to one of the agent's assigned regions
      const { data: shipment, error: fetchError } = await supabase
        .from('shipments')
        .select('origin_region')
        .eq('id', data.id)
        .single();

      if (fetchError) throw fetchError;
      if (!regionCodes.includes(shipment.origin_region)) {
        throw new Error('You do not have permission to edit this shipment');
      }

      const { error } = await supabase
        .from('shipments')
        .update({
          customer_id: data.customer_id,
          total_weight_kg: data.total_weight_kg,
          description: data.description,
          warehouse_location: data.warehouse_location,
        })
        .eq('id', data.id)
        .eq('status', 'collected'); // Only allow editing collected shipments

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-shipments'] });
      queryClient.invalidateQueries({ queryKey: ['agent-shipment-stats'] });
      toast.success('Shipment updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update shipment: ' + error.message);
    },
  });
}
