import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export type Expense = Tables<'expenses'>;

export const EXPENSE_CATEGORIES = [
  { value: 'shipping', label: 'Shipping Cost' },
  { value: 'handling', label: 'Handling Fee' },
  { value: 'customs', label: 'Customs & Duties' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'storage', label: 'Storage' },
  { value: 'fuel', label: 'Fuel Surcharge' },
  { value: 'other', label: 'Other' },
] as const;

export function useExpensesByShipment(shipmentId: string | null) {
  return useQuery({
    queryKey: ['expenses', 'shipment', shipmentId],
    queryFn: async () => {
      if (!shipmentId) return [];
      
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('shipment_id', shipmentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!shipmentId,
  });
}

export function useAllExpenses(filters?: {
  category?: string;
  region?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['expenses', filters],
    queryFn: async () => {
      let query = supabase
        .from('expenses')
        .select('*, shipments(tracking_number, origin_region)')
        .order('created_at', { ascending: false });

      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }
      if (filters?.region && filters.region !== 'all') {
        query = query.eq('region', filters.region as 'europe' | 'dubai' | 'china' | 'india');
      }
      if (filters?.search) {
        query = query.or(`description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useExpenseStats() {
  return useQuery({
    queryKey: ['expense-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('amount, category, created_at, currency');

      if (error) throw error;

      const now = new Date();
      const thisMonth = data?.filter(e => {
        const createdAt = new Date(e.created_at || '');
        return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
      });

      const totalAmount = data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const thisMonthAmount = thisMonth?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      const byCategory = EXPENSE_CATEGORIES.reduce((acc, cat) => {
        acc[cat.value] = data?.filter(e => e.category === cat.value).reduce((sum, e) => sum + Number(e.amount), 0) || 0;
        return acc;
      }, {} as Record<string, number>);

      return {
        total: data?.length || 0,
        totalAmount,
        thisMonth: thisMonth?.length || 0,
        thisMonthAmount,
        byCategory,
      };
    },
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expense: TablesInsert<'expenses'>) => {
      const { data, error } = await supabase
        .from('expenses')
        .insert(expense)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      if (variables.shipment_id) {
        queryClient.invalidateQueries({ queryKey: ['expenses', 'shipment', variables.shipment_id] });
      }
      toast.success('Expense added successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to add expense: ' + error.message);
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Expense> & { id: string }) => {
      const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update expense: ' + error.message);
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, shipmentId }: { id: string; shipmentId?: string }) => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { shipmentId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      if (data.shipmentId) {
        queryClient.invalidateQueries({ queryKey: ['expenses', 'shipment', data.shipmentId] });
      }
      toast.success('Expense deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete expense: ' + error.message);
    },
  });
}
