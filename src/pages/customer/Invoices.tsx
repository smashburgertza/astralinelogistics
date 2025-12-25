import { useState } from 'react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FileText, Calendar, Package, CheckCircle, Clock, Download, CreditCard } from 'lucide-react';
import { useCustomerInvoices } from '@/hooks/useCustomerPortal';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function CustomerInvoicesPage() {
  const { data: invoices, isLoading } = useCustomerInvoices();
  const { data: exchangeRates } = useExchangeRates();
  const [paymentDialog, setPaymentDialog] = useState<{
    open: boolean;
    invoiceId: string;
    currency: string;
    amount: number;
    amountTZS: number | null;
  }>({ open: false, invoiceId: '', currency: '', amount: 0, amountTZS: null });
  const [selectedPaymentCurrency, setSelectedPaymentCurrency] = useState<string>('');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Paid</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">Pending</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Overdue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const openPaymentDialog = (invoice: { id: string; currency: string | null; amount: number; amount_in_tzs?: number | null }) => {
    const currency = invoice.currency || 'USD';
    setPaymentDialog({
      open: true,
      invoiceId: invoice.id,
      currency,
      amount: invoice.amount,
      amountTZS: invoice.amount_in_tzs || null,
    });
    setSelectedPaymentCurrency(currency);
  };

  const handlePayment = () => {
    // This would integrate with Stripe in a real implementation
    toast.info(`Payment initiated in ${selectedPaymentCurrency}`);
    setPaymentDialog({ ...paymentDialog, open: false });
  };

  const getPaymentAmount = () => {
    if (selectedPaymentCurrency === paymentDialog.currency) {
      return `${paymentDialog.currency} ${paymentDialog.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    }
    if (selectedPaymentCurrency === 'TZS' && paymentDialog.amountTZS) {
      return `TZS ${paymentDialog.amountTZS.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return `${selectedPaymentCurrency} —`;
  };

  return (
    <CustomerLayout title="Invoices" subtitle="View and manage your invoices">
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : !invoices?.length ? (
        <Card className="shadow-lg border-0">
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No invoices yet</h3>
            <p className="text-muted-foreground">
              Your invoices will appear here once you have shipments.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => {
            const shipment = invoice.shipments as { tracking_number: string } | null;
            const isPaid = invoice.status === 'paid';
            const amountTZS = (invoice as { amount_in_tzs?: number | null }).amount_in_tzs;
            const showTZS = invoice.currency !== 'TZS' && amountTZS;

            return (
              <Card key={invoice.id} className="shadow-lg border-0 overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    {/* Status indicator */}
                    <div className={`w-full md:w-2 ${
                      invoice.status === 'paid' ? 'bg-green-500' :
                      invoice.status === 'overdue' ? 'bg-red-500' :
                      'bg-amber-500'
                    }`} />

                    <div className="flex-1 p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            isPaid ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'
                          }`}>
                            {isPaid ? (
                              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                            ) : (
                              <FileText className="w-6 h-6 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <span className="font-bold text-lg">{invoice.invoice_number}</span>
                              {getStatusBadge(invoice.status || 'pending')}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                              {shipment && (
                                <span className="flex items-center gap-1">
                                  <Package className="h-3 w-3" />
                                  {shipment.tracking_number}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Created: {format(new Date(invoice.created_at || ''), 'MMM d, yyyy')}
                              </span>
                              {invoice.due_date && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Due: {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">
                              {invoice.currency || 'USD'} {Number(invoice.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                            {showTZS && (
                              <p className="text-sm font-medium text-muted-foreground">
                                ≈ TZS {Number(amountTZS).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            {!isPaid && (
                              <Button 
                                size="sm"
                                onClick={() => openPaymentDialog({
                                  id: invoice.id,
                                  currency: invoice.currency,
                                  amount: Number(invoice.amount),
                                  amount_in_tzs: amountTZS,
                                })}
                              >
                                <CreditCard className="h-4 w-4 mr-1" />
                                Pay Now
                              </Button>
                            )}
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-1" />
                              PDF
                            </Button>
                          </div>
                        </div>
                      </div>

                      {invoice.notes && (
                        <p className="mt-4 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                          {invoice.notes}
                        </p>
                      )}

                      {isPaid && invoice.paid_at && (
                        <p className="mt-4 text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          Paid on {format(new Date(invoice.paid_at), 'MMM d, yyyy')}
                          {invoice.payment_method && ` via ${invoice.payment_method}`}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Payment Currency Selection Dialog */}
      <Dialog open={paymentDialog.open} onOpenChange={(open) => setPaymentDialog({ ...paymentDialog, open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose Payment Currency</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Select which currency you'd like to pay in:
            </p>
            
            <RadioGroup value={selectedPaymentCurrency} onValueChange={setSelectedPaymentCurrency}>
              {/* Original currency option */}
              <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value={paymentDialog.currency} id="original" />
                <Label htmlFor="original" className="flex-1 cursor-pointer">
                  <p className="font-medium">{paymentDialog.currency} (Original Currency)</p>
                  <p className="text-lg font-bold text-primary">
                    {paymentDialog.currency} {paymentDialog.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </Label>
              </div>

              {/* TZS option (if different from original) */}
              {paymentDialog.currency !== 'TZS' && paymentDialog.amountTZS && (
                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="TZS" id="tzs" />
                  <Label htmlFor="tzs" className="flex-1 cursor-pointer">
                    <p className="font-medium">TZS (Tanzanian Shilling)</p>
                    <p className="text-lg font-bold text-primary">
                      TZS {paymentDialog.amountTZS.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                  </Label>
                </div>
              )}
            </RadioGroup>

            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">You will pay:</p>
              <p className="text-xl font-bold">{getPaymentAmount()}</p>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setPaymentDialog({ ...paymentDialog, open: false })}>
                Cancel
              </Button>
              <Button onClick={handlePayment}>
                Proceed to Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  );
}
