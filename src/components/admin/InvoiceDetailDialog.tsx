import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Download, 
  Plus, 
  CreditCard, 
  Calendar, 
  User,
  Building2,
  Package,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { Invoice, useRecordPayment, RecordPaymentParams } from '@/hooks/useInvoices';
import { useInvoicePayments } from '@/hooks/useInvoicePayments';
import { useInvoiceItems } from '@/hooks/useInvoiceItems';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { InvoicePDFPreview } from './InvoicePDFPreview';
import { RecordPaymentDialog, PaymentDetails } from './RecordPaymentDialog';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { useRegions } from '@/hooks/useRegions';
import { format } from 'date-fns';
import { useReactToPrint } from 'react-to-print';

interface InvoiceDetailDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceDetailDialog({ invoice, open, onOpenChange }: InvoiceDetailDialogProps) {
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const { data: regions } = useRegions();
  const { data: payments = [], isLoading: paymentsLoading, refetch: refetchPayments } = useInvoicePayments(invoice?.id || '');
  const { data: invoiceItems = [] } = useInvoiceItems(invoice?.id || '');
  const recordPayment = useRecordPayment();

  // Calculate total weight from invoice items (for B2B invoices which may have multiple shipments)
  const totalBillableWeight = invoiceItems
    .filter(item => item.unit_type === 'kg' && item.weight_kg)
    .reduce((sum, item) => sum + Number(item.weight_kg || 0), 0);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: invoice?.invoice_number || 'Invoice',
  });

  if (!invoice) return null;

  const currencySymbol = CURRENCY_SYMBOLS[invoice.currency || 'USD'] || '$';
  const regionInfo = invoice.shipments?.origin_region
    ? regions?.find(r => r.code === invoice.shipments?.origin_region)
    : null;

  // Calculate paid amount from payments if invoice.amount_paid isn't updated yet
  const paidFromPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalPaid = Math.max(Number(invoice.amount_paid || 0), paidFromPayments);
  const totalAmount = Number(invoice.amount || 0);
  const remainingBalance = Math.max(0, totalAmount - totalPaid);
  const isPaid = invoice.status === 'paid' || remainingBalance <= 0;
  const isPartiallyPaid = totalPaid > 0 && remainingBalance > 0;

  const handleRecordPayment = (details: PaymentDetails) => {
    recordPayment.mutate({
      invoiceId: details.invoiceId,
      amount: details.amount,
      paymentMethod: details.paymentMethod,
      depositAccountId: details.depositAccountId,
      paymentCurrency: details.paymentCurrency,
      paymentDate: details.paymentDate,
      reference: details.reference,
      notes: details.notes,
    }, {
      onSuccess: () => {
        setPaymentDialogOpen(false);
        refetchPayments();
      },
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case 'pending': return <Clock className="h-5 w-5 text-amber-500" />;
      case 'overdue': return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'cancelled': return <XCircle className="h-5 w-5 text-muted-foreground" />;
      default: return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(invoice.status || 'pending')}
                <div>
                  <DialogTitle className="text-xl">{invoice.invoice_number}</DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    Created {format(new Date(invoice.created_at || new Date()), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <InvoiceStatusBadge status={invoice.status || 'pending'} />
                {isPartiallyPaid && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    Partial
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-5 py-4">
              {/* Customer or Agent & Shipment Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  {/* Show Agent info for B2B invoices, Customer info otherwise */}
                  {(invoice.invoice_direction === 'from_agent' || invoice.invoice_direction === 'to_agent') && (invoice as any).agent ? (
                    <>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        <span className="text-sm font-medium">Agent</span>
                      </div>
                      <div className="pl-6 text-sm">
                        <p className="font-medium">{(invoice as any).agent?.company_name || (invoice as any).agent?.full_name || 'Unknown Agent'}</p>
                        {(invoice as any).agent?.company_name && (invoice as any).agent?.full_name && (
                          <p className="text-muted-foreground">{(invoice as any).agent.full_name}</p>
                        )}
                        {(invoice as any).agent?.agent_code && (
                          <p className="text-muted-foreground font-mono">{(invoice as any).agent.agent_code}</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span className="text-sm font-medium">Customer</span>
                      </div>
                      <div className="pl-6 text-sm">
                        <p className="font-medium">{invoice.customers?.name || invoice.shipments?.customer_name || 'Unknown'}</p>
                        {invoice.customers?.company_name && (
                          <p className="text-muted-foreground">{invoice.customers.company_name}</p>
                        )}
                        {invoice.customers?.email && (
                          <p className="text-muted-foreground">{invoice.customers.email}</p>
                        )}
                        {invoice.customers?.phone && (
                          <p className="text-muted-foreground">{invoice.customers.phone}</p>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {invoice.shipments && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span className="text-sm font-medium">Shipment</span>
                    </div>
                    <div className="pl-6 text-sm">
                      <p className="font-mono font-medium">{invoice.shipments.tracking_number}</p>
                      {regionInfo && (
                        <p className="text-muted-foreground">
                          {regionInfo.flag_emoji} {regionInfo.name}
                        </p>
                      )}
                      {(invoice.invoice_direction === 'from_agent' || invoice.invoice_direction === 'to_agent') && totalBillableWeight > 0 ? (
                        <p className="text-muted-foreground">
                          Total Weight: {totalBillableWeight.toFixed(2)} kg
                        </p>
                      ) : invoice.shipments.total_weight_kg ? (
                        <p className="text-muted-foreground">
                          Weight: {invoice.shipments.total_weight_kg} kg
                        </p>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Invoice Line Items */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">Invoice Items</span>
                </div>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Description</TableHead>
                        <TableHead className="text-center w-20">Qty</TableHead>
                        <TableHead className="text-right w-28">Unit Price</TableHead>
                        <TableHead className="text-right w-28">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceItems.length > 0 ? (
                        invoiceItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium capitalize">{item.item_type.replace('_', ' ')}</p>
                                {item.description && (
                                  <p className="text-sm text-muted-foreground">{item.description}</p>
                                )}
                                {item.weight_kg && (
                                  <p className="text-xs text-muted-foreground">{item.weight_kg} kg</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-right">
                              {CURRENCY_SYMBOLS[item.currency] || '$'}{Number(item.unit_price).toFixed(2)}
                              {item.unit_type === 'kg' && '/kg'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {CURRENCY_SYMBOLS[item.currency] || '$'}{Number(item.amount).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell>
                            <div>
                              <p className="font-medium">Shipping Charges</p>
                              {invoice.shipments?.total_weight_kg && (
                                <p className="text-sm text-muted-foreground">{invoice.shipments.total_weight_kg} kg @ {currencySymbol}{Number(invoice.rate_per_kg || 0).toFixed(2)}/kg</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">1</TableCell>
                          <TableCell className="text-right">
                            {currencySymbol}{totalAmount.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {currencySymbol}{totalAmount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow className="bg-muted/30 font-semibold">
                        <TableCell colSpan={3} className="text-right">Total</TableCell>
                        <TableCell className="text-right">
                          {currencySymbol}{totalAmount.toFixed(2)} {invoice.currency}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Amount Overview */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                  <p className="text-lg font-bold">
                    {currencySymbol}{totalAmount.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">{invoice.currency}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Amount Paid</p>
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                    {currencySymbol}{totalPaid.toFixed(2)}
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">{payments.length} payment(s)</p>
                </div>
                <div className={`rounded-lg p-3 ${remainingBalance > 0 ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-emerald-50 dark:bg-emerald-950/30'}`}>
                  <p className={`text-xs ${remainingBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    Balance Due
                  </p>
                  <p className={`text-lg font-bold ${remainingBalance > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                    {currencySymbol}{remainingBalance.toFixed(2)}
                  </p>
                  {invoice.due_date && remainingBalance > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Due {format(new Date(invoice.due_date), 'MMM dd')}
                    </p>
                  )}
                </div>
              </div>

              {/* Notes */}
              {invoice.notes && (
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{invoice.notes}</p>
                </div>
              )}

              {/* Payment History */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CreditCard className="h-4 w-4" />
                    <span className="text-sm font-medium">Payment History</span>
                  </div>
                  {!isPaid && (
                    <Button size="sm" onClick={() => setPaymentDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Record Payment
                    </Button>
                  )}
                </div>

                {paymentsLoading ? (
                  <div className="text-sm text-muted-foreground">Loading payments...</div>
                ) : payments.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground border rounded-lg">
                    <CreditCard className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No payments recorded yet</p>
                  </div>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Date</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="text-sm">
                              {payment.paid_at 
                                ? format(new Date(payment.paid_at), 'MMM dd, yyyy')
                                : '—'
                              }
                            </TableCell>
                            <TableCell className="capitalize text-sm">
                              {payment.payment_method?.replace('_', ' ') || '—'}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {payment.stripe_payment_id || '—'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {CURRENCY_SYMBOLS[payment.currency || 'USD']}{Number(payment.amount).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="flex justify-between items-center pt-4 border-t flex-shrink-0">
            <Button variant="outline" onClick={() => handlePrint()}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {!isPaid && (
                <Button onClick={() => setPaymentDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Record Payment
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden print container */}
      <div className="hidden">
        {invoice && <InvoicePDFPreview ref={printRef} invoice={invoice} />}
      </div>

      {/* Record Payment Dialog - pass remaining balance as the pre-filled amount */}
      {(() => {
        const isB2BAgentPayment = invoice?.invoice_direction === 'from_agent' && invoice?.agent_id;
        return (
          <RecordPaymentDialog
            invoice={invoice}
            open={paymentDialogOpen}
            onOpenChange={setPaymentDialogOpen}
            isLoading={recordPayment.isPending}
            remainingBalance={remainingBalance}
            onRecordPayment={handleRecordPayment}
            isOutgoingPayment={!!isB2BAgentPayment}
            payeeName={isB2BAgentPayment ? 'Agent' : undefined}
          />
        );
      })()}
    </>
  );
}
