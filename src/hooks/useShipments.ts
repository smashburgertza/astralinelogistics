import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export type Shipment = Tables<'shipments'> & {
  customers?: Pick<Tables<'customers'>, 'name' | 'email' | 'company_name' | 'phone'> | null;
  cargo_batches?: Pick<Tables<'cargo_batches'>, 'batch_number' | 'cargo_type' | 'arrival_week_start'> | null;
};

export function useShipments(filters?: {
  status?: string;
  region?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['shipments', filters],
    queryFn: async () => {
      let query = supabase
        .from('shipments')
        .select('*, customers(name, email, company_name, phone), cargo_batches(batch_number, cargo_type, arrival_week_start)')
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status as 'collected' | 'in_transit' | 'arrived' | 'delivered');
      }
      if (filters?.region && filters.region !== 'all') {
        query = query.eq('origin_region', filters.region as 'europe' | 'dubai' | 'china' | 'india');
      }
      if (filters?.search) {
        query = query.or(`tracking_number.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Shipment[];
    },
  });
}

// Get shipments that don't have customer invoices yet (for invoice creation)
export function useUninvoicedShipments() {
  return useQuery({
    queryKey: ['shipments', 'uninvoiced'],
    queryFn: async () => {
      // First get all shipment IDs that already have customer invoices
      const { data: invoicedShipments, error: invoiceError } = await supabase
        .from('invoices')
        .select('shipment_id')
        .not('shipment_id', 'is', null)
        .is('invoice_direction', null); // Customer invoices only (not B2B)

      if (invoiceError) throw invoiceError;

      const invoicedShipmentIds = invoicedShipments
        ?.map(i => i.shipment_id)
        .filter(Boolean) as string[] || [];

      // Get shipments that are NOT in the invoiced list
      let query = supabase
        .from('shipments')
        .select('*, customers(name, email, company_name, phone), cargo_batches(batch_number, cargo_type, arrival_week_start)')
        .eq('is_draft', false)
        .order('created_at', { ascending: false });

      if (invoicedShipmentIds.length > 0) {
        query = query.not('id', 'in', `(${invoicedShipmentIds.join(',')})`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Shipment[];
    },
  });
}

export function useShipment(id: string) {
  return useQuery({
    queryKey: ['shipment', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipments')
        .select('*, customers(name, email, company_name, phone), cargo_batches(batch_number, cargo_type, arrival_week_start)')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as Shipment | null;
    },
    enabled: !!id,
  });
}

export function useCreateShipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shipment: TablesInsert<'shipments'>) => {
      const { data, error } = await supabase
        .from('shipments')
        .insert(shipment)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast.success('Shipment created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create shipment: ${error.message}`);
    },
  });
}

export function useUpdateShipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'shipments'> & { id: string }) => {
      const { data, error } = await supabase
        .from('shipments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast.success('Shipment updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update shipment: ${error.message}`);
    },
  });
}

export function useUpdateShipmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const statusTimestamps: Record<string, string> = {
        collected: 'collected_at',
        in_transit: 'in_transit_at',
        arrived: 'arrived_at',
        delivered: 'delivered_at',
      };

      const updates: TablesUpdate<'shipments'> = {
        status: status as any,
        [statusTimestamps[status]]: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('shipments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast.success('Status updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
}

export function useBulkUpdateShipmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const statusTimestamps: Record<string, string> = {
        collected: 'collected_at',
        in_transit: 'in_transit_at',
        arrived: 'arrived_at',
        delivered: 'delivered_at',
      };

      const updates: TablesUpdate<'shipments'> = {
        status: status as any,
        [statusTimestamps[status]]: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('shipments')
        .update(updates)
        .in('id', ids);

      if (error) throw error;
      return { count: ids.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['agent-shipments'] });
      toast.success(`${data.count} shipment(s) updated successfully`);
    },
    onError: (error) => {
      toast.error(`Failed to update shipments: ${error.message}`);
    },
  });
}

export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}
