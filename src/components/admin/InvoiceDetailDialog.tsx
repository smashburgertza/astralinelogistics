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
  Package, 
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { Invoice, useRecordPayment, RecordPaymentParams } from '@/hooks/useInvoices';
import { useInvoicePayments } from '@/hooks/useInvoicePayments';
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
  const { data: payments = [], isLoading: paymentsLoading } = useInvoicePayments(invoice?.id || '');
  const recordPayment = useRecordPayment();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: invoice?.invoice_number || 'Invoice',
  });

  if (!invoice) return null;

  const currencySymbol = CURRENCY_SYMBOLS[invoice.currency || 'USD'] || '$';
  const regionInfo = invoice.shipments?.origin_region
    ? regions?.find(r => r.code === invoice.shipments?.origin_region)
    : null;

  const totalPaid = Number(invoice.amount_paid || 0);
  const totalAmount = Number(invoice.amount || 0);
  const remainingBalance = totalAmount - totalPaid;
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
            <div className="space-y-6 py-4">
              {/* Amount Overview */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold">
                    {currencySymbol}{totalAmount.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">{invoice.currency}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-4">
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">Amount Paid</p>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                    {currencySymbol}{totalPaid.toFixed(2)}
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">{payments.length} payment(s)</p>
                </div>
                <div className={`rounded-lg p-4 ${remainingBalance > 0 ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-emerald-50 dark:bg-emerald-950/30'}`}>
                  <p className={`text-sm ${remainingBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    Balance Due
                  </p>
                  <p className={`text-2xl font-bold ${remainingBalance > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                    {currencySymbol}{remainingBalance.toFixed(2)}
                  </p>
                  {invoice.due_date && remainingBalance > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Due {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Customer & Shipment Info */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span className="text-sm font-medium">Customer</span>
                  </div>
                  <div className="pl-6">
                    <p className="font-medium">{invoice.customers?.name || invoice.shipments?.customer_name || 'Unknown'}</p>
                    {invoice.customers?.company_name && (
                      <p className="text-sm text-muted-foreground">{invoice.customers.company_name}</p>
                    )}
                    {invoice.customers?.email && (
                      <p className="text-sm text-muted-foreground">{invoice.customers.email}</p>
                    )}
                    {invoice.customers?.phone && (
                      <p className="text-sm text-muted-foreground">{invoice.customers.phone}</p>
                    )}
                    {invoice.customers?.address && (
                      <p className="text-sm text-muted-foreground mt-2">{invoice.customers.address}</p>
                    )}
                  </div>
                </div>

                {invoice.shipments && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span className="text-sm font-medium">Shipment</span>
                    </div>
                    <div className="pl-6">
                      <p className="font-mono font-medium">{invoice.shipments.tracking_number}</p>
                      {regionInfo && (
                        <p className="text-sm text-muted-foreground">
                          {regionInfo.flag_emoji} {regionInfo.name}
                        </p>
                      )}
                      {invoice.shipments.total_weight_kg && (
                        <p className="text-sm text-muted-foreground">
                          Weight: {invoice.shipments.total_weight_kg} kg
                        </p>
                      )}
                      {invoice.rate_per_kg && (
                        <p className="text-sm text-muted-foreground">
                          Rate: {currencySymbol}{Number(invoice.rate_per_kg).toFixed(2)}/kg
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Payment History */}
              <div className="space-y-4">
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
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No payments recorded yet</p>
                  </div>
                ) : (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              {payment.paid_at 
                                ? format(new Date(payment.paid_at), 'MMM dd, yyyy')
                                : '—'
                              }
                            </TableCell>
                            <TableCell className="capitalize">
                              {payment.payment_method?.replace('_', ' ') || '—'}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
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

              {/* Notes */}
              {invoice.notes && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm font-medium">Notes</span>
                    </div>
                    <p className="text-sm pl-6">{invoice.notes}</p>
                  </div>
                </>
              )}
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
      <RecordPaymentDialog
        invoice={invoice}
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        isLoading={recordPayment.isPending}
        remainingBalance={remainingBalance}
        onRecordPayment={handleRecordPayment}
      />
    </>
  );
}
