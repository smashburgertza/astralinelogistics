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
import { useExchangeRates, convertToTZS } from '@/hooks/useExchangeRates';
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
  const { data: exchangeRates = [] } = useExchangeRates();
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

  // Calculate TZS equivalents
  const invoiceCurrency = invoice.currency || 'USD';
  const showTzsEquivalent = invoiceCurrency !== 'TZS' && exchangeRates.length > 0;
  const totalAmountTzs = showTzsEquivalent ? convertToTZS(totalAmount, invoiceCurrency, exchangeRates) : 0;
  const totalPaidTzs = showTzsEquivalent ? convertToTZS(totalPaid, invoiceCurrency, exchangeRates) : 0;
  const remainingBalanceTzs = showTzsEquivalent ? convertToTZS(remainingBalance, invoiceCurrency, exchangeRates) : 0;

  const handleRecordPayment = (details: PaymentDetails) => {
    recordPayment.mutate({
      invoiceId: details.invoiceId,
      amount: details.amount,
      amountInPaymentCurrency: details.amountInPaymentCurrency,
      paymentMethod: details.paymentMethod,
      depositAccountId: details.depositAccountId,
      paymentCurrency: details.paymentCurrency,
      paymentDate: details.paymentDate,
      reference: details.reference,
      notes: details.notes,
      splits: details.splits,
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
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-auto p-4">
          {/* Top Section: Parcel | Customer | Totals */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {/* Parcel/Shipment Info */}
            <div className="border rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                <Package className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Shipment</span>
              </div>
              {invoice.shipments ? (
                <div className="text-sm space-y-0.5">
                  {invoice.shipments.description && (
                    <p><span className="text-muted-foreground text-xs">Desc:</span> {invoice.shipments.description}</p>
                  )}
                  {((invoice.invoice_direction === 'from_agent' || invoice.invoice_direction === 'to_agent') && totalBillableWeight > 0) ? (
                    <p><span className="text-muted-foreground text-xs">Weight:</span> {totalBillableWeight.toFixed(2)} kg</p>
                  ) : invoice.shipments.total_weight_kg ? (
                    <p><span className="text-muted-foreground text-xs">Weight:</span> {invoice.shipments.total_weight_kg} kg</p>
                  ) : null}
                  <p className="font-mono text-xs">{invoice.shipments.tracking_number}</p>
                  {regionInfo && (
                    <p className="text-xs text-muted-foreground">
                      {regionInfo.flag_emoji} {regionInfo.name}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No shipment linked</p>
              )}
            </div>

            {/* Customer/Agent Info */}
            <div className="border rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                <User className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">
                  {(invoice.invoice_direction === 'from_agent' || invoice.invoice_direction === 'to_agent') && (invoice as any).agent ? 'Agent' : 'Customer'}
                </span>
              </div>
              {(invoice.invoice_direction === 'from_agent' || invoice.invoice_direction === 'to_agent') && (invoice as any).agent ? (
                <div className="text-sm space-y-0.5">
                  <p className="font-medium">{(invoice as any).agent?.company_name || (invoice as any).agent?.full_name || 'Unknown Agent'}</p>
                  {(invoice as any).agent?.agent_code && (
                    <p className="font-mono text-xs">{(invoice as any).agent.agent_code}</p>
                  )}
                </div>
              ) : (
                <div className="text-sm space-y-0.5">
                  <p className="font-medium">{invoice.customers?.name || invoice.shipments?.customer_name || 'Unknown'}</p>
                  {invoice.customers?.phone && (
                    <p className="flex items-center gap-1 text-xs">
                      <span className="text-muted-foreground">📞</span> {invoice.customers.phone}
                    </p>
                  )}
                  {invoice.customers?.email && (
                    <p className="flex items-center gap-1 text-xs">
                      <span className="text-muted-foreground">✉</span> {invoice.customers.email}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="space-y-2">
              <div className="border rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{currencySymbol}{totalAmount.toFixed(2)}</p>
                {showTzsEquivalent && (
                  <p className="text-xs text-muted-foreground">≈ TZS {totalAmountTzs.toLocaleString()}</p>
                )}
              </div>
              <div className={`rounded-lg p-3 text-center ${remainingBalance > 0 ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900' : 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900'}`}>
                <p className={`text-xs ${remainingBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>Balance Due</p>
                <p className={`text-lg font-bold ${remainingBalance > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                  {currencySymbol}{remainingBalance.toFixed(2)}
                </p>
                {showTzsEquivalent && (
                  <p className={`text-xs ${remainingBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    ≈ TZS {remainingBalanceTzs.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Invoice Header */}
          <div className="flex items-center justify-between border rounded-lg p-3 mb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Invoice {invoice.invoice_number}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {format(new Date(invoice.created_at || new Date()), 'MMM dd, yyyy')}
              </span>
              <InvoiceStatusBadge status={invoice.status || 'pending'} />
              {isPartiallyPaid && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                  Partial
                </Badge>
              )}
            </div>
          </div>

          {/* Invoice Line Items Table */}
          <div className="rounded-lg border overflow-hidden mb-3">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs py-2">Description</TableHead>
                  <TableHead className="text-center w-16 text-xs py-2">Qty</TableHead>
                  <TableHead className="text-right w-24 text-xs py-2">Rate</TableHead>
                  <TableHead className="text-right w-24 text-xs py-2">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoiceItems.length > 0 ? (
                  invoiceItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="py-2">
                        <span className="font-medium text-sm">{item.description || item.item_type.replace('_', ' ')}</span>
                        {item.weight_kg && (
                          <span className="text-muted-foreground text-xs"> ({item.weight_kg} kg)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm py-2">{item.quantity}</TableCell>
                      <TableCell className="text-right text-sm py-2">
                        {CURRENCY_SYMBOLS[item.currency] || '$'}{Number(item.unit_price).toFixed(2)}
                        {item.unit_type === 'kg' && '/kg'}
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm py-2">
                        {CURRENCY_SYMBOLS[item.currency] || '$'}{Number(item.amount).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell className="py-2">
                      <span className="font-medium text-sm">Shipping Charges</span>
                      {invoice.shipments?.total_weight_kg && (
                        <span className="text-muted-foreground text-xs"> - {invoice.shipments.total_weight_kg} kg</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm py-2">1</TableCell>
                    <TableCell className="text-right text-sm py-2">
                      {currencySymbol}{totalAmount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm py-2">
                      {currencySymbol}{totalAmount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                )}
                <TableRow className="bg-muted/30 font-semibold">
                  <TableCell colSpan={3} className="text-right py-2">Total</TableCell>
                  <TableCell className="text-right py-2">
                    {currencySymbol}{totalAmount.toFixed(2)} {invoice.currency}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="p-3 rounded-lg bg-muted/50 border mb-3">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{invoice.notes}</p>
            </div>
          )}

          {/* Payment History */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CreditCard className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Payment History</span>
              </div>
              {!isPaid && (
                <Button size="sm" variant="outline" onClick={() => setPaymentDialogOpen(true)}>
                  <Plus className="h-3 w-3 mr-1" />
                  Record Payment
                </Button>
              )}
            </div>

            {paymentsLoading ? (
              <div className="text-sm text-muted-foreground">Loading payments...</div>
            ) : payments.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground border rounded-lg">
                <CreditCard className="h-5 w-5 mx-auto mb-1 opacity-50" />
                <p className="text-xs">No payments recorded</p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs py-2">Date</TableHead>
                      <TableHead className="text-xs py-2">Method</TableHead>
                      <TableHead className="text-xs py-2">Reference</TableHead>
                      <TableHead className="text-right text-xs py-2">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="text-xs py-2">
                          {payment.paid_at 
                            ? format(new Date(payment.paid_at), 'MMM dd, yyyy')
                            : '—'
                          }
                        </TableCell>
                        <TableCell className="capitalize text-xs py-2">
                          {payment.payment_method?.replace('_', ' ') || '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs py-2">
                          {payment.stripe_payment_id || '—'}
                        </TableCell>
                        <TableCell className="text-right font-medium text-xs py-2">
                          {CURRENCY_SYMBOLS[payment.currency || 'USD']}{Number(payment.amount).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex justify-between items-center pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => handlePrint()}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {!isPaid && (
                <Button size="sm" onClick={() => setPaymentDialogOpen(true)}>
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
