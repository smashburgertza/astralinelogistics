import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type AgentRegion = Database['public']['Enums']['agent_region'];

export interface BatchWithProfitability {
  id: string;
  batch_number: string;
  origin_region: AgentRegion;
  arrival_week_start: string;
  arrival_week_end: string;
  cargo_type: string;
  status: string;
  created_at: string | null;
  shipment_count: number;
  total_weight: number;
  total_costs: number;
  total_revenue: number;
  profit: number;
  profit_margin: number;
  costs_breakdown: {
    category: string;
    amount: number;
    currency: string;
  }[];
}

// Admin hook to get all batches with profitability data
export function useAdminBatches(filters?: {
  region?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['admin-batches', filters],
    queryFn: async () => {
      // Get batches
      let batchQuery = supabase
        .from('cargo_batches')
        .select('*')
        .order('arrival_week_start', { ascending: false });

      if (filters?.region && filters.region !== 'all') {
        batchQuery = batchQuery.eq('origin_region', filters.region as AgentRegion);
      }
      if (filters?.status && filters.status !== 'all') {
        batchQuery = batchQuery.eq('status', filters.status);
      }
      if (filters?.startDate) {
        batchQuery = batchQuery.gte('arrival_week_start', filters.startDate);
      }
      if (filters?.endDate) {
        batchQuery = batchQuery.lte('arrival_week_end', filters.endDate);
      }

      const { data: batches, error: batchError } = await batchQuery;
      if (batchError) throw batchError;

      if (!batches || batches.length === 0) return [];

      // Get batch costs
      const batchIds = batches.map(b => b.id);
      const { data: costs, error: costsError } = await supabase
        .from('batch_costs')
        .select('*')
        .in('batch_id', batchIds);
      if (costsError) throw costsError;

      // Get shipments linked to batches
      const { data: shipments, error: shipmentsError } = await supabase
        .from('shipments')
        .select('id, batch_id, total_weight_kg')
        .in('batch_id', batchIds);
      if (shipmentsError) throw shipmentsError;

      // Get invoices for those shipments
      const shipmentIds = shipments?.map(s => s.id) || [];
      let invoices: any[] = [];
      if (shipmentIds.length > 0) {
        const { data: invoiceData, error: invoicesError } = await supabase
          .from('invoices')
          .select('id, shipment_id, amount, currency')
          .in('shipment_id', shipmentIds);
        if (invoicesError) throw invoicesError;
        invoices = invoiceData || [];
      }

      // Calculate profitability for each batch
      const batchesWithProfitability: BatchWithProfitability[] = batches.map(batch => {
        const batchCosts = costs?.filter(c => c.batch_id === batch.id) || [];
        const batchShipments = shipments?.filter(s => s.batch_id === batch.id) || [];
        const shipmentIdsInBatch = batchShipments.map(s => s.id);
        const batchInvoices = invoices.filter(i => shipmentIdsInBatch.includes(i.shipment_id));

        const totalCosts = batchCosts.reduce((sum, c) => sum + Number(c.amount), 0);
        const totalRevenue = batchInvoices.reduce((sum, i) => sum + Number(i.amount), 0);
        const totalWeight = batchShipments.reduce((sum, s) => sum + Number(s.total_weight_kg), 0);
        const profit = totalRevenue - totalCosts;
        const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

        const costsBreakdown = batchCosts.map(c => ({
          category: c.cost_category,
          amount: Number(c.amount),
          currency: c.currency,
        }));

        return {
          id: batch.id,
          batch_number: batch.batch_number,
          origin_region: batch.origin_region,
          arrival_week_start: batch.arrival_week_start,
          arrival_week_end: batch.arrival_week_end,
          cargo_type: batch.cargo_type,
          status: batch.status,
          created_at: batch.created_at,
          shipment_count: batchShipments.length,
          total_weight: totalWeight,
          total_costs: totalCosts,
          total_revenue: totalRevenue,
          profit,
          profit_margin: profitMargin,
          costs_breakdown: costsBreakdown,
        };
      });

      return batchesWithProfitability;
    },
  });
}

// Admin hook to add/update batch costs
export function useAddBatchCost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      batchId,
      costCategory,
      amount,
      currency = 'USD',
      description,
    }: {
      batchId: string;
      costCategory: string;
      amount: number;
      currency?: string;
      description?: string;
    }) => {
      // Check if cost already exists for this category
      const { data: existing } = await supabase
        .from('batch_costs')
        .select('id')
        .eq('batch_id', batchId)
        .eq('cost_category', costCategory)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('batch_costs')
          .update({ amount, currency, description })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('batch_costs')
          .insert({
            batch_id: batchId,
            cost_category: costCategory,
            amount,
            currency,
            description,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-batches'] });
      toast.success('Cost updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update cost: ' + error.message);
    },
  });
}

// Admin hook to close a batch
export function useCloseBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batchId: string) => {
      const { error } = await supabase
        .from('cargo_batches')
        .update({ status: 'closed' })
        .eq('id', batchId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-batches'] });
      toast.success('Batch closed successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to close batch: ' + error.message);
    },
  });
}

// Cost categories for admin
export const COST_CATEGORIES = [
  { key: 'freight', label: 'Freight (Shipping to TZ)', agentCanEdit: true },
  { key: 'import_duty', label: 'Import Duty', agentCanEdit: false },
  { key: 'local_transport', label: 'Local Transport', agentCanEdit: false },
  { key: 'customs_clearance', label: 'Customs Clearance', agentCanEdit: false },
  { key: 'handling', label: 'Handling & Warehousing', agentCanEdit: false },
  { key: 'other', label: 'Other Expenses', agentCanEdit: false },
] as const;
