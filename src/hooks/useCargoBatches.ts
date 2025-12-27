import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type AgentRegion = Database['public']['Enums']['agent_region'];

export interface CargoBatch {
  id: string;
  batch_number: string;
  origin_region: AgentRegion;
  region_id: string | null;
  arrival_week_start: string;
  arrival_week_end: string;
  cargo_type: string;
  status: string;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  freight_cost?: number | null;
}

export interface BatchCost {
  id: string;
  batch_id: string;
  cost_category: string;
  description: string | null;
  amount: number;
  currency: string;
  entered_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// Hook to get or create a batch for the current week and region
export function useGetOrCreateBatch() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      originRegion, 
      cargoType = 'air' 
    }: { 
      originRegion: AgentRegion; 
      cargoType?: string;
    }) => {
      const { data, error } = await supabase
        .rpc('get_or_create_batch', {
          _origin_region: originRegion,
          _cargo_type: cargoType
        });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargo-batches'] });
    },
    onError: (error: Error) => {
      toast.error('Failed to create batch: ' + error.message);
    },
  });
}

// Hook to get current week's batch for agent's region
export function useCurrentBatch(cargoType: string = 'air') {
  const { getRegion } = useAuth();
  const region = getRegion();

  return useQuery({
    queryKey: ['current-batch', region, cargoType],
    queryFn: async () => {
      if (!region) return null;

      const weekStart = getWeekStart(new Date());
      
      const { data, error } = await supabase
        .from('cargo_batches')
        .select('*, batch_costs(*)')
        .eq('origin_region', region)
        .eq('cargo_type', cargoType)
        .eq('arrival_week_start', weekStart.toISOString().split('T')[0])
        .eq('status', 'open')
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        const freightCost = (data.batch_costs as BatchCost[])?.find(
          (c) => c.cost_category === 'freight'
        );
        return {
          ...data,
          freight_cost: freightCost?.amount ?? null,
        } as CargoBatch;
      }
      
      return null;
    },
    enabled: !!region,
  });
}

// Hook to get all batches for agent's region
export function useAgentBatches() {
  const { getRegion } = useAuth();
  const region = getRegion();

  return useQuery({
    queryKey: ['agent-batches', region],
    queryFn: async () => {
      if (!region) return [];

      const { data, error } = await supabase
        .from('cargo_batches')
        .select('*')
        .eq('origin_region', region)
        .order('arrival_week_start', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!region,
  });
}

// Hook to update or create freight cost for a batch
export function useUpdateFreightCost() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      batchId, 
      amount, 
      currency = 'USD' 
    }: { 
      batchId: string; 
      amount: number; 
      currency?: string;
    }) => {
      // Check if freight cost already exists
      const { data: existing } = await supabase
        .from('batch_costs')
        .select('id')
        .eq('batch_id', batchId)
        .eq('cost_category', 'freight')
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('batch_costs')
          .update({ amount, currency })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('batch_costs')
          .insert({
            batch_id: batchId,
            cost_category: 'freight',
            description: 'Shipping to Tanzania',
            amount,
            currency,
            entered_by: user?.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-batch'] });
      queryClient.invalidateQueries({ queryKey: ['agent-batches'] });
      toast.success('Freight cost updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update freight cost: ' + error.message);
    },
  });
}

// Helper function to get Monday of current week
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
