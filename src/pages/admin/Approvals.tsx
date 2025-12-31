import { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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
  User, FileText, DollarSign, CreditCard, Building2
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
import { usePaymentsPendingVerification, useVerifyPayment } from '@/hooks/useAgentInvoices';
import { useBankAccounts, useChartOfAccounts } from '@/hooks/useAccounting';
import { useExchangeRatesMap } from '@/hooks/useExchangeRates';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';

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
  const [fullInvoice, setFullInvoice] = useState<any>(null);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [invoicePayments, setInvoicePayments] = useState<any[]>([]);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  const { data: requests, isLoading } = useApprovalRequests({
    type: 'parcel_release',
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  const reviewMutation = useReviewApprovalRequest();

  const handleReview = async (request: ApprovalRequest, action: 'approved' | 'rejected') => {
    setSelectedRequest(request);
    setReviewAction(action);
    setReviewNotes('');
    setDialogOpen(true);
    
    // Fetch full invoice details if invoice_id exists
    if (request.invoice_id) {
      setLoadingInvoice(true);
      try {
        const [invoiceRes, itemsRes, paymentsRes] = await Promise.all([
          supabase
            .from('invoices')
            .select(`
              *,
              customers(id, name, email, phone, address, company_name, tin, vrn),
              shipments(id, tracking_number, origin_region, total_weight_kg, customer_name, description)
            `)
            .eq('id', request.invoice_id)
            .single(),
          supabase
            .from('invoice_items')
            .select('*')
            .eq('invoice_id', request.invoice_id)
            .order('created_at', { ascending: true }),
          supabase
            .from('payments')
            .select('*')
            .eq('invoice_id', request.invoice_id)
            .order('paid_at', { ascending: false }),
        ]);

        if (invoiceRes.data) setFullInvoice(invoiceRes.data);
        if (itemsRes.data) setInvoiceItems(itemsRes.data);
        if (paymentsRes.data) setInvoicePayments(paymentsRes.data);
      } catch (err) {
        console.error('Error fetching invoice details:', err);
      } finally {
        setLoadingInvoice(false);
      }
    } else {
      setFullInvoice(null);
      setInvoiceItems([]);
      setInvoicePayments([]);
    }
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
        setFullInvoice(null);
        setInvoiceItems([]);
        setInvoicePayments([]);
      },
    });
  };

  // Calculate totals
  const totalPaid = invoicePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const invoiceAmount = Number(fullInvoice?.amount || 0);
  const balance = Math.max(0, invoiceAmount - Math.max(totalPaid, Number(fullInvoice?.amount_paid || 0)));

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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reviewAction === 'approved' ? (
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              {reviewAction === 'approved' ? 'Approve' : 'Reject'} Parcel Release Request
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'approved'
                ? 'This will release the parcel without full payment.'
                : 'This will deny the parcel release request.'}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              {/* Customer & Parcel Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedRequest.customers?.name || fullInvoice?.customers?.name || '-'}</p>
                  {(selectedRequest.customers?.phone || fullInvoice?.customers?.phone) && (
                    <p className="text-xs text-muted-foreground">{selectedRequest.customers?.phone || fullInvoice?.customers?.phone}</p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground">Parcel</p>
                  <p className="font-mono">{selectedRequest.parcels?.barcode || '-'}</p>
                  {selectedRequest.parcels?.weight_kg && (
                    <p className="text-xs text-muted-foreground">{selectedRequest.parcels.weight_kg} kg</p>
                  )}
                </div>
              </div>

              {/* Full Invoice Details */}
              {loadingInvoice ? (
                <Skeleton className="h-40" />
              ) : fullInvoice ? (
                <div className="rounded-lg border bg-muted/30 overflow-hidden">
                  <div className="flex items-center gap-2 p-3 border-b bg-muted/50">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium text-sm">Invoice #{fullInvoice.invoice_number}</p>
                    <Badge variant="outline" className="ml-auto">
                      {fullInvoice.status}
                    </Badge>
                  </div>
                  
                  {/* Shipment Info */}
                  {fullInvoice.shipments && (
                    <div className="p-3 border-b text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-muted-foreground">Tracking:</span>{' '}
                          <span className="font-mono">{fullInvoice.shipments.tracking_number}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Origin:</span>{' '}
                          <span>{fullInvoice.shipments.origin_region?.toUpperCase()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Weight:</span>{' '}
                          <span>{fullInvoice.shipments.total_weight_kg} kg</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Invoice Items */}
                  {invoiceItems.length > 0 && (
                    <div className="p-3 border-b">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Invoice Items</p>
                      <Table>
                        <TableHeader>
                          <TableRow className="text-xs">
                            <TableHead className="py-1">Description</TableHead>
                            <TableHead className="py-1 text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoiceItems.map((item) => (
                            <TableRow key={item.id} className="text-sm">
                              <TableCell className="py-1.5">
                                {item.description || item.item_type}
                                {item.weight_kg && (
                                  <span className="text-xs text-muted-foreground ml-1">
                                    ({item.weight_kg} kg @ {item.unit_price}/kg)
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="py-1.5 text-right font-mono">
                                {CURRENCY_SYMBOLS[item.currency || 'USD']}{item.amount?.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Payment History */}
                  {invoicePayments.length > 0 && (
                    <div className="p-3 border-b">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Payment History</p>
                      <div className="space-y-1">
                        {invoicePayments.map((payment) => (
                          <div key={payment.id} className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-3 w-3 text-muted-foreground" />
                              <span className="capitalize">{payment.payment_method}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(payment.paid_at), 'MMM d, yyyy')}
                              </span>
                            </div>
                            <span className="font-mono text-emerald-600">
                              +{CURRENCY_SYMBOLS[payment.currency || 'USD']}{payment.amount?.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Invoice Totals */}
                  <div className="p-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Invoice Total</span>
                      <span className="font-mono">
                        {CURRENCY_SYMBOLS[fullInvoice.currency || 'USD']}{invoiceAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount Paid</span>
                      <span className="font-mono text-emerald-600">
                        -{CURRENCY_SYMBOLS[fullInvoice.currency || 'USD']}{Math.max(totalPaid, Number(fullInvoice.amount_paid || 0)).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold pt-1 border-t">
                      <span>Outstanding Balance</span>
                      <span className={balance > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                        {CURRENCY_SYMBOLS[fullInvoice.currency || 'USD']}{balance.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : selectedRequest.invoices ? (
                <div className="rounded-lg border p-3 bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium text-sm">Invoice Details</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Invoice Number</p>
                      <p className="font-mono">{selectedRequest.invoices.invoice_number}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Total Amount</p>
                      <p className="font-semibold">
                        {CURRENCY_SYMBOLS[selectedRequest.invoices.currency || 'USD']}
                        {selectedRequest.invoices.amount?.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Reason */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Reason for Request</p>
                <p className="text-sm bg-muted p-2 rounded">{selectedRequest.reason}</p>
              </div>

              {/* Requested By */}
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Requested by:</span>
                <span>{selectedRequest.requester?.full_name || selectedRequest.requester?.email || 'Unknown'}</span>
                <span className="text-muted-foreground">
                  on {format(new Date(selectedRequest.requested_at), 'MMM d, yyyy HH:mm')}
                </span>
              </div>

              {/* Notes Input */}
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
              disabled={reviewMutation.isPending || loadingInvoice}
              className={reviewAction === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {reviewMutation.isPending ? 'Processing...' : reviewAction === 'approved' ? 'Approve Release' : 'Reject Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PaymentVerificationApprovals() {
  const { data: pendingPayments, isLoading } = usePaymentsPendingVerification();
  const { data: bankAccounts } = useBankAccounts();
  const { data: chartAccounts } = useChartOfAccounts({ type: 'asset', active: true });
  const { rates: exchangeRates, getRate } = useExchangeRatesMap();
  const verifyMutation = useVerifyPayment();
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [verifyAction, setVerifyAction] = useState<'verified' | 'rejected'>('verified');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [amountInTzs, setAmountInTzs] = useState<string>('');
  const [useCustomRate, setUseCustomRate] = useState(false);
  const [customExchangeRate, setCustomExchangeRate] = useState<string>('');

  // Get chart account IDs that are already linked to bank accounts to avoid duplicates
  const linkedChartAccountIds = new Set(
    bankAccounts?.filter(b => b.chart_account_id).map(b => b.chart_account_id) || []
  );

  // Filter chart accounts to show only cash/bank accounts NOT linked to a bank account
  const cashAccounts = chartAccounts?.filter(acc => 
    (acc.account_subtype === 'cash' || 
     acc.account_subtype === 'bank' ||
     acc.account_code.startsWith('1001') || // Cash accounts
     acc.account_code.startsWith('1002')) && // Bank accounts
    !linkedChartAccountIds.has(acc.id) // Exclude accounts already linked to bank accounts
  ) || [];

  // Calculate system exchange rate for the currency
  const systemExchangeRate = useMemo(() => {
    if (!selectedPayment) return 1;
    return getRate(selectedPayment.currency);
  }, [selectedPayment, getRate]);

  // Calculate TZS amount based on exchange rate
  useEffect(() => {
    if (!selectedPayment || selectedPayment.currency === 'TZS') {
      setAmountInTzs(selectedPayment?.amount?.toString() || '');
      return;
    }
    
    const rate = useCustomRate && customExchangeRate ? parseFloat(customExchangeRate) : systemExchangeRate;
    if (rate && selectedPayment.amount) {
      setAmountInTzs((selectedPayment.amount * rate).toFixed(0));
    }
  }, [selectedPayment, systemExchangeRate, useCustomRate, customExchangeRate]);

  const handleVerify = (payment: any, action: 'verified' | 'rejected') => {
    setSelectedPayment(payment);
    setVerifyAction(action);
    setSelectedAccountId('');
    setAmountInTzs('');
    setUseCustomRate(false);
    setCustomExchangeRate('');
    setDialogOpen(true);
  };

  const confirmVerify = () => {
    if (!selectedPayment) return;
    if (verifyAction === 'verified' && !selectedAccountId) {
      toast.error('Please select an account to credit the payment');
      return;
    }
    if (verifyAction === 'verified' && !amountInTzs) {
      toast.error('Please enter the TZS equivalent amount');
      return;
    }

    const finalExchangeRate = useCustomRate && customExchangeRate 
      ? parseFloat(customExchangeRate) 
      : systemExchangeRate;
    
    verifyMutation.mutate({
      paymentId: selectedPayment.id,
      status: verifyAction,
      invoiceId: selectedPayment.invoice_id,
      depositAccountId: verifyAction === 'verified' ? selectedAccountId : undefined,
      amount: selectedPayment.amount,
      currency: selectedPayment.currency,
      invoiceNumber: selectedPayment.invoices?.invoice_number,
      amountInTzs: parseFloat(amountInTzs),
      exchangeRate: finalExchangeRate,
      isAgentPayment: selectedPayment.invoices?.invoice_direction === 'to_agent',
    }, {
      onSuccess: () => {
        setDialogOpen(false);
        setSelectedPayment(null);
        setSelectedAccountId('');
        setAmountInTzs('');
        setUseCustomRate(false);
        setCustomExchangeRate('');
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
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Verifications
          </CardTitle>
          <CardDescription>
            Verify payments marked by agents before updating accounting records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Marked On</TableHead>
                <TableHead className="w-[140px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!pendingPayments || pendingPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No payments pending verification</p>
                  </TableCell>
                </TableRow>
              ) : (
                pendingPayments.map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <p className="font-mono text-sm">{payment.invoices?.invoice_number}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{payment.agent?.company_name || payment.agent?.full_name}</p>
                          {payment.agent?.agent_code && (
                            <p className="text-xs text-muted-foreground">{payment.agent.agent_code}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {payment.currency} {payment.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {payment.payment_method?.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-mono">
                        {payment.stripe_payment_id || '-'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{format(new Date(payment.paid_at), 'MMM d, yyyy')}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(payment.paid_at), 'HH:mm')}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          onClick={() => handleVerify(payment, 'verified')}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleVerify(payment, 'rejected')}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Verify Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {verifyAction === 'verified' ? (
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              {verifyAction === 'verified' ? 'Verify' : 'Reject'} Payment
            </DialogTitle>
            <DialogDescription>
              {verifyAction === 'verified'
                ? 'This will mark the invoice as paid and record the payment in accounting.'
                : 'This will reject the payment and notify the agent.'}
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Invoice</p>
                  <p className="font-mono">{selectedPayment.invoices?.invoice_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-bold">{selectedPayment.currency} {selectedPayment.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Agent</p>
                  <p>{selectedPayment.agent?.company_name || selectedPayment.agent?.full_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reference</p>
                  <p className="font-mono text-sm">{selectedPayment.stripe_payment_id || '-'}</p>
                </div>
              </div>

              {verifyAction === 'verified' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="deposit-account">Deposit to Account *</Label>
                    <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                      <SelectTrigger id="deposit-account">
                        <SelectValue placeholder="Select account..." />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts && bankAccounts.filter(b => b.is_active && b.chart_account_id).length > 0 && (
                          <>
                            <SelectItem value="__bank_header" disabled className="font-semibold text-muted-foreground">
                              Bank Accounts
                            </SelectItem>
                            {bankAccounts.filter(b => b.is_active && b.chart_account_id).map(bank => (
                              <SelectItem key={bank.id} value={bank.chart_account_id!}>
                                {bank.bank_name} - {bank.account_name} ({bank.currency})
                              </SelectItem>
                            ))}
                          </>
                        )}
                        {cashAccounts.length > 0 && (
                          <>
                            <SelectItem value="__cash_header" disabled className="font-semibold text-muted-foreground">
                              Cash Accounts
                            </SelectItem>
                            {cashAccounts.map(acc => (
                              <SelectItem key={acc.id} value={acc.id}>
                                {acc.account_code} - {acc.account_name} ({acc.currency})
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Select where the payment was received
                    </p>
                  </div>

                  {/* Exchange Rate Section */}
                  {selectedPayment?.currency !== 'TZS' && (
                    <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Exchange Rate</Label>
                        <Button
                          type="button"
                          variant={useCustomRate ? "default" : "outline"}
                          size="sm"
                          onClick={() => setUseCustomRate(!useCustomRate)}
                        >
                          {useCustomRate ? 'Using Custom Rate' : 'Use Custom Rate'}
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">System Rate (1 {selectedPayment?.currency})</Label>
                          <p className="font-mono text-sm">TZS {systemExchangeRate.toLocaleString()}</p>
                        </div>
                        {useCustomRate && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Custom Rate *</Label>
                            <Input
                              type="number"
                              placeholder="Enter rate..."
                              value={customExchangeRate}
                              onChange={(e) => setCustomExchangeRate(e.target.value)}
                              className="mt-1"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TZS Equivalent */}
                  <div className="space-y-2">
                    <Label htmlFor="amount-tzs">TZS Equivalent *</Label>
                    <Input
                      id="amount-tzs"
                      type="number"
                      placeholder="Enter TZS amount..."
                      value={amountInTzs}
                      onChange={(e) => setAmountInTzs(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {selectedPayment?.currency === 'TZS' 
                        ? 'Same as payment amount'
                        : `Based on rate: 1 ${selectedPayment?.currency} = TZS ${(useCustomRate && customExchangeRate ? parseFloat(customExchangeRate) : systemExchangeRate).toLocaleString()}`
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmVerify}
              disabled={verifyMutation.isPending}
              className={verifyAction === 'verified' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {verifyMutation.isPending ? 'Processing...' : verifyAction === 'verified' ? 'Verify Payment' : 'Reject'}
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
  const { data: pendingPayments } = usePaymentsPendingVerification();
  
  const totalPending = (pendingCount || 0) + (pendingPayments?.length || 0);

  return (
    <AdminLayout 
      title="Approvals" 
      subtitle={totalPending ? `${totalPending} pending approval${totalPending === 1 ? '' : 's'}` : 'Review and manage approval requests'}
    >
      <Tabs defaultValue="parcel_release" className="space-y-6">
        <TabsList>
          <TabsTrigger value="parcel_release" className="gap-2">
            <Package className="h-4 w-4" />
            Parcel Release
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Payment Verification
            {pendingPayments && pendingPayments.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {pendingPayments.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Expenses
          </TabsTrigger>
        </TabsList>

        <TabsContent value="parcel_release">
          <ParcelReleaseApprovals />
        </TabsContent>

        <TabsContent value="payments">
          <PaymentVerificationApprovals />
        </TabsContent>

        <TabsContent value="expenses">
          <ExpenseApprovals />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}