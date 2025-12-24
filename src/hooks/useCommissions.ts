import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Commission {
  id: string;
  employee_id: string;
  invoice_id: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'paid';
  paid_at: string | null;
  created_at: string;
  invoices?: {
    invoice_number: string;
    amount: number;
    customers?: { name: string } | null;
  } | null;
  employee_profile?: {
    full_name: string | null;
    email: string;
  } | null;
}

export interface CommissionRule {
  id: string;
  employee_id: string;
  commission_type: 'percentage_handling' | 'per_kg' | 'percentage_total';
  rate: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  employee_profile?: {
    full_name: string | null;
    email: string;
  } | null;
}

export const COMMISSION_TYPES = [
  { value: 'percentage_handling', label: '% of Handling Fee' },
  { value: 'per_kg', label: 'Per KG Shipped' },
  { value: 'percentage_total', label: '% of Invoice Total' },
] as const;

export function useCommissions() {
  return useQuery({
    queryKey: ['commissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commissions')
        .select(`
          *,
          invoices (
            invoice_number,
            amount,
            customers ( name )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch employee profiles
      const employeeIds = [...new Set(data.map(c => c.employee_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', employeeIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data.map(commission => ({
        ...commission,
        employee_profile: profileMap.get(commission.employee_id) || null,
      })) as Commission[];
    },
  });
}

export function useEmployeeCommissions(employeeId?: string) {
  return useQuery({
    queryKey: ['commissions', 'employee', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      
      const { data, error } = await supabase
        .from('commissions')
        .select(`
          *,
          invoices (
            invoice_number,
            amount,
            customers ( name )
          )
        `)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Commission[];
    },
    enabled: !!employeeId,
  });
}

export function useCommissionRules() {
  return useQuery({
    queryKey: ['commission-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commission_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch employee profiles
      const employeeIds = [...new Set(data.map(r => r.employee_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', employeeIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data.map(rule => ({
        ...rule,
        employee_profile: profileMap.get(rule.employee_id) || null,
      })) as CommissionRule[];
    },
  });
}

export function useCreateCommissionRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      employee_id: string;
      commission_type: string;
      rate: number;
      description?: string;
    }) => {
      const { data: result, error } = await supabase
        .from('commission_rules')
        .insert({
          employee_id: data.employee_id,
          commission_type: data.commission_type,
          rate: data.rate,
          description: data.description || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-rules'] });
      toast.success('Commission rule created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create rule');
    },
  });
}

export function useUpdateCommissionRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      rate?: number;
      description?: string;
      is_active?: boolean;
    }) => {
      const { error } = await supabase
        .from('commission_rules')
        .update({
          rate: data.rate,
          description: data.description,
          is_active: data.is_active,
        })
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-rules'] });
      toast.success('Commission rule updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update rule');
    },
  });
}

export function useDeleteCommissionRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('commission_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-rules'] });
      toast.success('Commission rule deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete rule');
    },
  });
}

export function useMarkCommissionPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('commissions')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      toast.success('Commission marked as paid');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update commission');
    },
  });
}

export function useCalculateCommissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Get all active commission rules
      const { data: rules, error: rulesError } = await supabase
        .from('commission_rules')
        .select('*')
        .eq('is_active', true);

      if (rulesError) throw rulesError;

      // Get paid invoices without commissions
      const { data: existingCommissions } = await supabase
        .from('commissions')
        .select('invoice_id');

      const processedInvoiceIds = existingCommissions?.map(c => c.invoice_id) || [];

      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          id,
          amount,
          currency,
          created_by,
          shipments (
            total_weight_kg
          ),
          estimates (
            handling_fee
          )
        `)
        .eq('status', 'paid')
        .not('id', 'in', `(${processedInvoiceIds.length > 0 ? processedInvoiceIds.join(',') : 'null'})`);

      if (invoicesError) throw invoicesError;

      const commissionsToCreate: Array<{
        employee_id: string;
        invoice_id: string;
        amount: number;
        currency: string;
        status: string;
      }> = [];

      for (const invoice of invoices || []) {
        // Find rules for the employee who created this invoice
        const employeeRules = rules?.filter(r => r.employee_id === invoice.created_by) || [];

        for (const rule of employeeRules) {
          let commissionAmount = 0;

          if (rule.commission_type === 'percentage_total') {
            commissionAmount = (invoice.amount * rule.rate) / 100;
          } else if (rule.commission_type === 'percentage_handling') {
            const handlingFee = (invoice.estimates as any)?.handling_fee || 0;
            commissionAmount = (handlingFee * rule.rate) / 100;
          } else if (rule.commission_type === 'per_kg') {
            const weight = (invoice.shipments as any)?.total_weight_kg || 0;
            commissionAmount = weight * rule.rate;
          }

          if (commissionAmount > 0) {
            commissionsToCreate.push({
              employee_id: rule.employee_id,
              invoice_id: invoice.id,
              amount: commissionAmount,
              currency: invoice.currency || 'USD',
              status: 'pending',
            });
          }
        }
      }

      if (commissionsToCreate.length > 0) {
        const { error: insertError } = await supabase
          .from('commissions')
          .insert(commissionsToCreate);

        if (insertError) throw insertError;
      }

      return commissionsToCreate.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      toast.success(`Calculated ${count} new commissions`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to calculate commissions');
    },
  });
}
