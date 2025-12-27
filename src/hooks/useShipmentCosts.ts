import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ShipmentCostAllocation {
  id: string;
  shipment_id: string;
  batch_cost_id: string;
  allocated_amount: number;
  allocation_method: 'weight' | 'equal' | 'manual';
  currency: string;
  created_at: string;
  batch_costs?: {
    cost_category: string;
    description: string | null;
    amount: number;
  } | null;
}

export interface ShipmentProfitability {
  shipment_id: string;
  tracking_number: string;
  customer_name: string | null;
  total_weight_kg: number;
  total_revenue: number;
  total_cost: number;
  profit: number;
  profit_margin: number;
  cost_breakdown: {
    category: string;
    amount: number;
  }[];
}

export function useShipmentCostAllocations(shipmentId: string) {
  return useQuery({
    queryKey: ['shipment-cost-allocations', shipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipment_cost_allocations')
        .select('*, batch_costs(cost_category, description, amount)')
        .eq('shipment_id', shipmentId);

      if (error) throw error;
      return data as ShipmentCostAllocation[];
    },
    enabled: !!shipmentId,
  });
}

export function useAllocateBatchCosts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batchId: string) => {
      const { error } = await supabase.rpc('allocate_batch_costs', { p_batch_id: batchId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipment-cost-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['batch-profitability'] });
      toast.success('Costs allocated to shipments');
    },
    onError: (error) => {
      toast.error(`Failed to allocate costs: ${error.message}`);
    },
  });
}

export function useBatchProfitability(batchId: string) {
  return useQuery({
    queryKey: ['batch-profitability', batchId],
    queryFn: async () => {
      // Get all shipments in batch with their costs
      const { data: shipments, error: shipmentError } = await supabase
        .from('shipments')
        .select('id, tracking_number, customer_name, total_weight_kg, total_revenue, total_cost, profit, customers(name)')
        .eq('batch_id', batchId);

      if (shipmentError) throw shipmentError;

      // Get cost allocations for all shipments
      const shipmentIds = shipments?.map(s => s.id) || [];
      
      if (shipmentIds.length === 0) return [];

      const { data: allocations } = await supabase
        .from('shipment_cost_allocations')
        .select('shipment_id, allocated_amount, batch_costs(cost_category)')
        .in('shipment_id', shipmentIds);

      // Build profitability report
      return shipments?.map(shipment => {
        const shipmentAllocations = allocations?.filter(a => a.shipment_id === shipment.id) || [];
        const costBreakdown = shipmentAllocations.map(a => ({
          category: a.batch_costs?.cost_category || 'unknown',
          amount: a.allocated_amount,
        }));

        const revenue = shipment.total_revenue || 0;
        const cost = shipment.total_cost || 0;
        const profit = revenue - cost;

        return {
          shipment_id: shipment.id,
          tracking_number: shipment.tracking_number,
          customer_name: shipment.customers?.name || shipment.customer_name,
          total_weight_kg: shipment.total_weight_kg,
          total_revenue: revenue,
          total_cost: cost,
          profit,
          profit_margin: revenue > 0 ? (profit / revenue) * 100 : 0,
          cost_breakdown: costBreakdown,
        } as ShipmentProfitability;
      }) || [];
    },
    enabled: !!batchId,
  });
}

export function useUpdateShipmentRevenue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shipmentId, totalRevenue }: { shipmentId: string; totalRevenue: number }) => {
      const { data, error } = await supabase
        .from('shipments')
        .update({ 
          total_revenue: totalRevenue,
          profit: totalRevenue - (await getShipmentCost(shipmentId)),
        })
        .eq('id', shipmentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['batch-profitability'] });
    },
  });
}

async function getShipmentCost(shipmentId: string): Promise<number> {
  const { data } = await supabase
    .from('shipment_cost_allocations')
    .select('allocated_amount')
    .eq('shipment_id', shipmentId);
  
  return data?.reduce((sum, a) => sum + a.allocated_amount, 0) || 0;
}
