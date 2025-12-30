import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ApprovalType = 'parcel_release' | 'expense' | 'refund' | 'discount';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ApprovalRequest {
  id: string;
  approval_type: ApprovalType;
  status: ApprovalStatus;
  reference_type: string;
  reference_id: string;
  reason: string;
  amount: number | null;
  currency: string | null;
  customer_id: string | null;
  parcel_id: string | null;
  invoice_id: string | null;
  requested_by: string;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Joined data
  customers?: { id: string; name: string; phone: string | null } | null;
  parcels?: { id: string; barcode: string; description: string | null; weight_kg: number } | null;
  invoices?: { id: string; invoice_number: string; amount: number; currency: string | null } | null;
  requester?: { id: string; full_name: string | null; email: string } | null;
  reviewer?: { id: string; full_name: string | null; email: string } | null;
}

export const APPROVAL_TYPES: Record<ApprovalType, { label: string; description: string }> = {
  parcel_release: { label: 'Parcel Release', description: 'Release parcel without full payment' },
  expense: { label: 'Expense', description: 'Approve expense claim' },
  refund: { label: 'Refund', description: 'Process customer refund' },
  discount: { label: 'Discount', description: 'Approve special discount' },
};

export const APPROVAL_STATUSES: Record<ApprovalStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
};

interface ApprovalFilters {
  type?: ApprovalType;
  status?: ApprovalStatus;
}

export function useApprovalRequests(filters?: ApprovalFilters) {
  return useQuery({
    queryKey: ['approval-requests', filters],
    queryFn: async () => {
      let query = supabase
        .from('approval_requests')
        .select(`
          *,
          customers:customer_id(id, name, phone),
          parcels:parcel_id(id, barcode, description, weight_kg),
          invoices:invoice_id(id, invoice_number, amount, currency),
          requester:requested_by(id, full_name, email),
          reviewer:reviewed_by(id, full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (filters?.type) {
        query = query.eq('approval_type', filters.type);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as ApprovalRequest[];
    },
  });
}

export function usePendingApprovalsCount() {
  return useQuery({
    queryKey: ['approval-requests', 'pending-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('approval_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) throw error;
      return count || 0;
    },
  });
}

interface CreateApprovalParams {
  approval_type: ApprovalType;
  reference_type: string;
  reference_id: string;
  reason: string;
  amount?: number;
  currency?: string;
  customer_id?: string;
  parcel_id?: string;
  invoice_id?: string;
  metadata?: Record<string, any>;
}

export function useCreateApprovalRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateApprovalParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('approval_requests')
        .insert({
          ...params,
          requested_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-requests'] });
      toast.success('Approval request submitted');
    },
    onError: (error) => {
      toast.error('Failed to submit approval request: ' + error.message);
    },
  });
}

interface ReviewApprovalParams {
  id: string;
  status: 'approved' | 'rejected';
  review_notes?: string;
}

export function useReviewApprovalRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, review_notes }: ReviewApprovalParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('approval_requests')
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // If it's a parcel release approval and approved, mark parcel as released
      if (status === 'approved' && data.approval_type === 'parcel_release' && data.parcel_id) {
        const { error: parcelError } = await supabase
          .from('parcels')
          .update({
            picked_up_at: new Date().toISOString(),
            picked_up_by: user.id,
          })
          .eq('id', data.parcel_id);

        if (parcelError) {
          console.error('Failed to update parcel:', parcelError);
        }
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['approval-requests'] });
      queryClient.invalidateQueries({ queryKey: ['parcels'] });
      toast.success(`Request ${variables.status === 'approved' ? 'approved' : 'rejected'}`);
    },
    onError: (error) => {
      toast.error('Failed to review request: ' + error.message);
    },
  });
}