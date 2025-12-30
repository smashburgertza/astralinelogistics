import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { createExpenseApprovalJournalEntry } from '@/lib/journalEntryUtils';

export type Expense = Tables<'expenses'> & {
  status?: string;
  approved_by?: string | null;
  approved_at?: string | null;
  denial_reason?: string | null;
  clarification_notes?: string | null;
  submitted_by?: string | null;
};

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

export const EXPENSE_STATUSES = [
  { value: 'pending', label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  { value: 'approved', label: 'Approved', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  { value: 'denied', label: 'Denied', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
  { value: 'needs_clarification', label: 'Needs Clarification', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
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
  status?: string;
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
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
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

// Fetch only pending expenses for approval queue
export function usePendingExpenses() {
  return useQuery({
    queryKey: ['expenses', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*, shipments(tracking_number, origin_region)')
        .in('status', ['pending', 'needs_clarification'])
        .order('created_at', { ascending: true });

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
        .select('amount, category, created_at, currency, status');

      if (error) throw error;

      const now = new Date();
      const approvedExpenses = data?.filter(e => e.status === 'approved') || [];
      const thisMonth = approvedExpenses.filter(e => {
        const createdAt = new Date(e.created_at || '');
        return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
      });

      const totalAmount = approvedExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const thisMonthAmount = thisMonth.reduce((sum, e) => sum + Number(e.amount), 0);

      const byCategory = EXPENSE_CATEGORIES.reduce((acc, cat) => {
        acc[cat.value] = approvedExpenses.filter(e => e.category === cat.value).reduce((sum, e) => sum + Number(e.amount), 0);
        return acc;
      }, {} as Record<string, number>);

      // Count by status
      const pendingCount = data?.filter(e => e.status === 'pending').length || 0;
      const needsClarificationCount = data?.filter(e => e.status === 'needs_clarification').length || 0;

      return {
        total: data?.length || 0,
        totalAmount,
        thisMonth: thisMonth.length,
        thisMonthAmount,
        byCategory,
        pendingCount,
        needsClarificationCount,
        approvedCount: approvedExpenses.length,
      };
    },
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expense: TablesInsert<'expenses'> & { assigned_to?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { assigned_to, ...expenseData } = expense;
      
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          ...expenseData,
          assigned_to,
          status: 'pending',
          submitted_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Send notification to the assigned approver
      if (assigned_to) {
        const amount = Number(expense.amount).toFixed(2);
        const currency = expense.currency || 'USD';
        await supabase.from('notifications').insert({
          user_id: assigned_to,
          title: 'Expense Awaiting Your Approval',
          message: `A new expense of ${currency} ${amount} has been submitted for your approval.`,
          type: 'info',
        });
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      if (variables.shipment_id) {
        queryClient.invalidateQueries({ queryKey: ['expenses', 'shipment', variables.shipment_id] });
      }
      toast.success('Expense submitted for approval');
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

export function useApproveExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expenseId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('expenses')
        .update({
          status: 'approved',
          approved_by: userData.user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', expenseId)
        .select('*, submitted_by')
        .single();

      if (error) throw error;

      // Create notification for submitter
      if (data.submitted_by) {
        await supabase.from('notifications').insert({
          user_id: data.submitted_by,
          title: 'Expense Approved',
          message: `Your expense of ${data.currency || 'USD'} ${Number(data.amount).toFixed(2)} has been approved.`,
          type: 'info',
        });
      }

      // Auto-create journal entry for approved expense (Expense debit, AP credit)
      try {
        await createExpenseApprovalJournalEntry({
          expenseId: data.id,
          category: data.category,
          amount: Number(data.amount),
          currency: data.currency || 'USD',
          description: data.description || undefined,
          exchangeRate: 1, // Could be enhanced to fetch from exchange rates table
        });
      } catch (journalError) {
        console.error('Failed to create expense journal entry:', journalError);
        // Don't fail the approval if journal entry fails
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['trial-balance'] });
      queryClient.invalidateQueries({ queryKey: ['income-statement'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      toast.success('Expense approved');
    },
    onError: (error: Error) => {
      toast.error('Failed to approve expense: ' + error.message);
    },
  });
}

export function useDenyExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ expenseId, reason }: { expenseId: string; reason: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('expenses')
        .update({
          status: 'denied',
          approved_by: userData.user?.id,
          approved_at: new Date().toISOString(),
          denial_reason: reason,
        })
        .eq('id', expenseId)
        .select('*, submitted_by')
        .single();

      if (error) throw error;

      // Create notification for submitter
      if (data.submitted_by) {
        await supabase.from('notifications').insert({
          user_id: data.submitted_by,
          title: 'Expense Denied',
          message: `Your expense of ${data.currency || 'USD'} ${Number(data.amount).toFixed(2)} has been denied. Reason: ${reason}`,
          type: 'info',
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
      toast.success('Expense denied');
    },
    onError: (error: Error) => {
      toast.error('Failed to deny expense: ' + error.message);
    },
  });
}

export function useRequestClarification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ expenseId, notes }: { expenseId: string; notes: string }) => {
      const { data, error } = await supabase
        .from('expenses')
        .update({
          status: 'needs_clarification',
          clarification_notes: notes,
        })
        .eq('id', expenseId)
        .select('*, submitted_by')
        .single();

      if (error) throw error;

      // Create notification for submitter
      if (data.submitted_by) {
        await supabase.from('notifications').insert({
          user_id: data.submitted_by,
          title: 'Expense Needs Clarification',
          message: `Your expense of ${data.currency || 'USD'} ${Number(data.amount).toFixed(2)} needs clarification: ${notes}`,
          type: 'info',
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
      toast.success('Clarification requested');
    },
    onError: (error: Error) => {
      toast.error('Failed to request clarification: ' + error.message);
    },
  });
}

export function useResubmitExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ expenseId, description }: { expenseId: string; description?: string }) => {
      const updates: Record<string, unknown> = {
        status: 'pending',
        clarification_notes: null,
      };
      if (description !== undefined) {
        updates.description = description;
      }

      const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', expenseId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense resubmitted for approval');
    },
    onError: (error: Error) => {
      toast.error('Failed to resubmit expense: ' + error.message);
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
