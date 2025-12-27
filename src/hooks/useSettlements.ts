import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type SettlementType = 'payment_to_agent' | 'collection_from_agent';
export type SettlementStatus = 'pending' | 'approved' | 'paid' | 'cancelled';

export interface Settlement {
  id: string;
  settlement_number: string;
  agent_id: string;
  settlement_type: SettlementType;
  period_start: string;
  period_end: string;
  total_amount: number;
  currency: string;
  amount_in_tzs: number | null;
  status: SettlementStatus;
  notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  paid_at: string | null;
  payment_reference: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string | null; email: string } | null;
  items?: SettlementItem[];
}

export interface SettlementItem {
  id: string;
  settlement_id: string;
  invoice_id: string;
  amount: number;
  currency: string;
  created_at: string;
  invoices?: {
    invoice_number: string;
    amount: number;
    currency: string;
    customer_id: string | null;
  } | null;
}

export const SETTLEMENT_TYPES = {
  payment_to_agent: { label: 'Payment to Agent', description: 'Money owed to agent for collected shipments' },
  collection_from_agent: { label: 'Collection from Agent', description: 'Money owed by agent to Astraline' },
} as const;

export const SETTLEMENT_STATUSES = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-800' },
  paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
} as const;

export function useSettlements(filters?: {
  status?: string;
  agentId?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['settlements', filters],
    queryFn: async () => {
      let query = supabase
        .from('settlements')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.agentId) {
        query = query.eq('agent_id', filters.agentId);
      }
      if (filters?.search) {
        query = query.ilike('settlement_number', `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Settlement[];
    },
  });
}

export function useSettlement(id: string) {
  return useQuery({
    queryKey: ['settlement', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settlements')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      
      if (data) {
        // Fetch settlement items
        const { data: items } = await supabase
          .from('settlement_items')
          .select('*, invoices(invoice_number, amount, currency, customer_id)')
          .eq('settlement_id', id);
        
        return { ...data, items: items || [] } as Settlement;
      }
      return null;
    },
    enabled: !!id,
  });
}

export function useAgentSettlements() {
  return useQuery({
    queryKey: ['agent-settlements'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('settlements')
        .select('*')
        .eq('agent_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Settlement[];
    },
  });
}

export function useCreateSettlement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settlement: {
      agent_id: string;
      settlement_type: SettlementType;
      period_start: string;
      period_end: string;
      total_amount: number;
      currency: string;
      amount_in_tzs?: number;
      notes?: string;
      invoice_ids: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Generate settlement number
      const { data: numberData } = await supabase.rpc('generate_settlement_number');
      const settlementNumber = numberData || `SET-${Date.now()}`;

      const { invoice_ids, ...settlementData } = settlement;

      const { data, error } = await supabase
        .from('settlements')
        .insert({
          ...settlementData,
          settlement_number: settlementNumber,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create settlement items
      if (invoice_ids.length > 0) {
        const items = invoice_ids.map(invoiceId => ({
          settlement_id: data.id,
          invoice_id: invoiceId,
          amount: settlement.total_amount / invoice_ids.length, // Will be updated with actual amounts
          currency: settlement.currency,
        }));

        await supabase.from('settlement_items').insert(items);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      toast.success('Settlement created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create settlement: ${error.message}`);
    },
  });
}

export function useUpdateSettlementStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SettlementStatus }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updates: Record<string, any> = { status };
      
      if (status === 'approved') {
        updates.approved_by = user?.id;
        updates.approved_at = new Date().toISOString();
      }
      if (status === 'paid') {
        updates.paid_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('settlements')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      toast.success('Settlement status updated');
    },
    onError: (error) => {
      toast.error(`Failed to update settlement: ${error.message}`);
    },
  });
}

// Get unsettled invoices for an agent
export function useUnsettledInvoices(agentId: string) {
  return useQuery({
    queryKey: ['unsettled-invoices', agentId],
    queryFn: async () => {
      // Get invoices that are not in any settlement
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, amount, currency, created_at, customer_id, customers(name)')
        .eq('agent_id', agentId)
        .eq('status', 'paid')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out invoices already in settlements
      const { data: settledItems } = await supabase
        .from('settlement_items')
        .select('invoice_id');

      const settledInvoiceIds = new Set(settledItems?.map(i => i.invoice_id) || []);
      
      return data?.filter(inv => !settledInvoiceIds.has(inv.id)) || [];
    },
    enabled: !!agentId,
  });
}
