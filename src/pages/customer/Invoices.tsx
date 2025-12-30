import { useState } from 'react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Calendar, Package, CheckCircle, Clock, Download, CreditCard, Send, AlertCircle } from 'lucide-react';
import { useCustomerInvoices } from '@/hooks/useCustomerPortal';
import { useCustomerMarkInvoicePaid } from '@/hooks/useCustomerPayments';
import { format } from 'date-fns';

interface SelectedInvoice {
  id: string;
  invoice_number: string;
  currency: string;
  amount: number;
  amount_in_tzs: number | null;
}

export default function CustomerInvoicesPage() {
  const { data: invoices, isLoading } = useCustomerInvoices();
  const markAsPaid = useCustomerMarkInvoicePaid();
  
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SelectedInvoice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentCurrency, setPaymentCurrency] = useState('');

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

  const handleOpenPaymentDialog = (invoice: {
    id: string;
    invoice_number: string;
    currency: string | null;
    amount: number;
    amount_in_tzs?: number | null;
  }) => {
    const currency = invoice.currency || 'USD';
    setSelectedInvoice({
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      currency,
      amount: invoice.amount,
      amount_in_tzs: invoice.amount_in_tzs || null,
    });
    setPaymentMethod('bank_transfer');
    setPaymentReference('');
    setPaymentCurrency(currency);
    setPaymentDialogOpen(true);
  };

  const handleSubmitPayment = async () => {
    if (!selectedInvoice) return;
    
    await markAsPaid.mutateAsync({
      invoiceId: selectedInvoice.id,
      paymentMethod,
      paymentReference,
      paymentCurrency,
    });
    
    setPaymentDialogOpen(false);
    setSelectedInvoice(null);
  };

  const getDisplayAmount = () => {
    if (!selectedInvoice) return '';
    if (paymentCurrency === 'TZS' && selectedInvoice.amount_in_tzs) {
      return `TZS ${selectedInvoice.amount_in_tzs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return `${selectedInvoice.currency} ${selectedInvoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
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
                                onClick={() => handleOpenPaymentDialog({
                                  id: invoice.id,
                                  invoice_number: invoice.invoice_number,
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

      {/* Mark as Paid Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Mark Invoice as Paid
            </DialogTitle>
            <DialogDescription>
              Submit payment details for verification by Astraline
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Invoice:</span>
                  <span className="font-mono">{selectedInvoice.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="text-lg font-bold">
                    {getDisplayAmount()}
                  </span>
                </div>
              </div>

              {/* Currency Selection (if TZS available) */}
              {selectedInvoice.currency !== 'TZS' && selectedInvoice.amount_in_tzs && (
                <div className="space-y-2">
                  <Label>Payment Currency</Label>
                  <Select value={paymentCurrency} onValueChange={setPaymentCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={selectedInvoice.currency}>
                        {selectedInvoice.currency} {selectedInvoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </SelectItem>
                      <SelectItem value="TZS">
                        TZS {selectedInvoice.amount_in_tzs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Payment Reference</Label>
                <Input
                  placeholder="Enter transaction reference or receipt number"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Provide your payment reference to help us verify your payment faster
                </p>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Your payment will be marked as pending until verified by Astraline. 
                  Please ensure payment has been completed before submitting.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitPayment}
              disabled={markAsPaid.isPending}
              className="gap-1"
            >
              <Send className="h-4 w-4" />
              {markAsPaid.isPending ? 'Submitting...' : 'Submit Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  );
}