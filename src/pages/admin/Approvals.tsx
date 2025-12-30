import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Package, CheckCircle, XCircle, Clock, AlertTriangle,
  User, FileText, DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import {
  useApprovalRequests,
  useReviewApprovalRequest,
  usePendingApprovalsCount,
  ApprovalRequest,
  ApprovalType,
  ApprovalStatus,
  APPROVAL_TYPES,
  APPROVAL_STATUSES,
} from '@/hooks/useApprovalRequests';
import { CURRENCY_SYMBOLS } from '@/lib/constants';

function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) {
  const config = APPROVAL_STATUSES[status];
  const Icon = status === 'approved' ? CheckCircle : status === 'rejected' ? XCircle : Clock;
  
  return (
    <Badge variant="outline" className={`${config.color} gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function ParcelReleaseApprovals() {
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'all'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected'>('approved');

  const { data: requests, isLoading } = useApprovalRequests({
    type: 'parcel_release',
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  const reviewMutation = useReviewApprovalRequest();

  const handleReview = (request: ApprovalRequest, action: 'approved' | 'rejected') => {
    setSelectedRequest(request);
    setReviewAction(action);
    setReviewNotes('');
    setDialogOpen(true);
  };

  const confirmReview = () => {
    if (!selectedRequest) return;
    
    reviewMutation.mutate({
      id: selectedRequest.id,
      status: reviewAction,
      review_notes: reviewNotes || undefined,
    }, {
      onSuccess: () => {
        setDialogOpen(false);
        setSelectedRequest(null);
      },
    });
  };

  if (isLoading) {
    return <Skeleton className="h-[400px]" />;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Parcel Release Requests
              </CardTitle>
              <CardDescription>
                Approve or reject requests to release parcels without full payment
              </CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ApprovalStatus | 'all')}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parcel</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[140px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!requests || requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No parcel release requests found
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      {request.parcels ? (
                        <div>
                          <p className="font-mono text-sm">{request.parcels.barcode}</p>
                          <p className="text-xs text-muted-foreground">
                            {request.parcels.weight_kg} kg
                          </p>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {request.customers ? (
                        <div>
                          <p className="font-medium">{request.customers.name}</p>
                          {request.customers.phone && (
                            <p className="text-xs text-muted-foreground">{request.customers.phone}</p>
                          )}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {request.invoices ? (
                        <div>
                          <p className="font-mono text-sm">{request.invoices.invoice_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {CURRENCY_SYMBOLS[request.invoices.currency || 'USD']}
                            {request.invoices.amount.toFixed(2)}
                          </p>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="text-sm truncate" title={request.reason}>
                        {request.reason}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{request.requester?.full_name || request.requester?.email || '-'}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{format(new Date(request.requested_at), 'MMM d, yyyy')}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(request.requested_at), 'HH:mm')}</p>
                    </TableCell>
                    <TableCell>
                      <ApprovalStatusBadge status={request.status} />
                    </TableCell>
                    <TableCell>
                      {request.status === 'pending' ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => handleReview(request, 'approved')}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleReview(request, 'rejected')}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {request.reviewer?.full_name || 'System'}
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reviewAction === 'approved' ? (
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              {reviewAction === 'approved' ? 'Approve' : 'Reject'} Request
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'approved'
                ? 'This will release the parcel without full payment.'
                : 'This will deny the parcel release request.'}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Parcel</p>
                  <p className="font-mono">{selectedRequest.parcels?.barcode}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p>{selectedRequest.customers?.name}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Reason for request</p>
                <p className="text-sm bg-muted p-2 rounded">{selectedRequest.reason}</p>
              </div>

              <div>
                <label className="text-sm font-medium">Notes (optional)</label>
                <Textarea
                  placeholder="Add any notes about this decision..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmReview}
              disabled={reviewMutation.isPending}
              className={reviewAction === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {reviewMutation.isPending ? 'Processing...' : reviewAction === 'approved' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ExpenseApprovals() {
  // Placeholder for expense approvals - can be integrated with existing expense approval flow
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Expense Approvals
        </CardTitle>
        <CardDescription>
          Review and approve expense claims
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Expense approvals are managed in the Expenses section.</p>
          <Button variant="link" className="mt-2" asChild>
            <a href="/admin/expenses">Go to Expenses</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ApprovalsPage() {
  const { data: pendingCount } = usePendingApprovalsCount();

  return (
    <AdminLayout 
      title="Approvals" 
      subtitle={pendingCount ? `${pendingCount} pending approval${pendingCount === 1 ? '' : 's'}` : 'Review and manage approval requests'}
    >
      <Tabs defaultValue="parcel_release" className="space-y-6">
        <TabsList>
          <TabsTrigger value="parcel_release" className="gap-2">
            <Package className="h-4 w-4" />
            Parcel Release
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Expenses
          </TabsTrigger>
        </TabsList>

        <TabsContent value="parcel_release">
          <ParcelReleaseApprovals />
        </TabsContent>

        <TabsContent value="expenses">
          <ExpenseApprovals />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}