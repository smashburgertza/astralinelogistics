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
      // First, fetch approval requests with existing foreign key relationships
      let query = supabase
        .from('approval_requests')
        .select(`
          *,
          customers:customer_id(id, name, phone),
          parcels:parcel_id(id, barcode, description, weight_kg),
          invoices:invoice_id(id, invoice_number, amount, currency)
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

      // Fetch profile data for requesters and reviewers
      const userIds = new Set<string>();
      data?.forEach(req => {
        if (req.requested_by) userIds.add(req.requested_by);
        if (req.reviewed_by) userIds.add(req.reviewed_by);
      });

      let profiles: Record<string, { id: string; full_name: string | null; email: string }> = {};
      if (userIds.size > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', Array.from(userIds));
        
        if (profilesData) {
          profiles = Object.fromEntries(profilesData.map(p => [p.id, p]));
        }
      }

      // Merge profile data into results
      const results = data?.map(req => ({
        ...req,
        requester: req.requested_by ? profiles[req.requested_by] || null : null,
        reviewer: req.reviewed_by ? profiles[req.reviewed_by] || null : null,
      }));

      return results as unknown as ApprovalRequest[];
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

      // Note: Parcel release approval only marks the request as approved.
      // The actual parcel release (picked_up_at) will be done by the requester
      // when they scan the parcel for pickup.

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