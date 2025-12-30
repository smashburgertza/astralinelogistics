import { useState, useRef, useEffect, useCallback } from 'react';
import { ScanLine, Package, User, Phone, Mail, CheckCircle2, AlertCircle, Volume2, X, CreditCard, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRecordPayment, Invoice } from '@/hooks/useInvoices';
import { useInvoicePayments } from '@/hooks/useInvoicePayments';
import { useInvoiceItems } from '@/hooks/useInvoiceItems';
import { InvoiceStatusBadge } from '@/components/admin/InvoiceStatusBadge';
import { InvoicePDFPreview } from '@/components/admin/InvoicePDFPreview';
import { RecordPaymentDialog, PaymentDetails } from '@/components/admin/RecordPaymentDialog';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { playSuccessBeep, playErrorBeep } from '@/lib/audioFeedback';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface ParcelWithInvoice {
  id: string;
  barcode: string;
  description: string | null;
  weight_kg: number;
  picked_up_at: string | null;
  shipment: {
    id: string;
    tracking_number: string;
    status: string;
    customer: {
      id: string;
      name: string;
      phone: string | null;
      email: string | null;
    } | null;
  } | null;
  invoice: Invoice | null;
}

export function ParcelCheckoutScanner() {
  const [barcode, setBarcode] = useState('');
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [scanAnimation, setScanAnimation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parcelData, setParcelData] = useState<ParcelWithInvoice | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [recentCheckouts, setRecentCheckouts] = useState<ParcelWithInvoice[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const recordPayment = useRecordPayment();
  
  const { data: payments = [], refetch: refetchPayments } = useInvoicePayments(parcelData?.invoice?.id || '');
  const { data: invoiceItems = [] } = useInvoiceItems(parcelData?.invoice?.id || '');

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Re-focus input when dialog closes
  useEffect(() => {
    if (!dialogOpen) {
      inputRef.current?.focus();
    }
  }, [dialogOpen]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: parcelData?.invoice?.invoice_number || 'Invoice',
  });

  const lookupParcel = useCallback(async (barcodeValue: string) => {
    setIsLoading(true);
    setError(null);
    
    let barcodeToSearch = barcodeValue.trim();
    
    // Check if the scanned value is JSON (from a QR code with embedded data)
    if (barcodeToSearch.startsWith('{') && barcodeToSearch.endsWith('}')) {
      try {
        const parsedData = JSON.parse(barcodeToSearch);
        // Extract barcode from common field names
        barcodeToSearch = parsedData.BARCODE || parsedData.barcode || 
                          parsedData.TRACKING || parsedData.tracking ||
                          parsedData.CODE || parsedData.code || barcodeToSearch;
      } catch {
        // Not valid JSON, use as-is
      }
    }
    
    try {
      // First, lookup the parcel (case-insensitive)
      const { data: parcel, error: parcelError } = await supabase
        .from('parcels')
        .select(`
          id,
          barcode,
          description,
          weight_kg,
          picked_up_at,
          shipment:shipments(
            id,
            tracking_number,
            status,
            customer:customers(
              id,
              name,
              phone,
              email
            )
          )
        `)
        .ilike('barcode', barcodeToSearch)
        .maybeSingle();

      if (parcelError) throw parcelError;

      if (!parcel) {
        setError('Parcel not found. Please check the barcode.');
        playErrorBeep();
        return;
      }

      // Get the shipment from the parcel
      const shipmentData = Array.isArray(parcel.shipment) ? parcel.shipment[0] : parcel.shipment;
      
      // Now lookup the invoice for this shipment
      let invoice: Invoice | null = null;
      if (shipmentData?.id) {
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .select(`
            *,
            customers(id, name, email, phone, address, company_name, tin, vrn),
            shipments(id, tracking_number, origin_region, total_weight_kg, customer_name, description)
          `)
          .eq('shipment_id', shipmentData.id)
          .eq('invoice_type', 'shipping')
          .maybeSingle();

        if (!invoiceError && invoiceData) {
          invoice = invoiceData as unknown as Invoice;
        }
      }

      const result: ParcelWithInvoice = {
        id: parcel.id,
        barcode: parcel.barcode,
        description: parcel.description,
        weight_kg: parcel.weight_kg,
        picked_up_at: parcel.picked_up_at,
        shipment: shipmentData ? {
          id: shipmentData.id,
          tracking_number: shipmentData.tracking_number,
          status: shipmentData.status,
          customer: Array.isArray(shipmentData.customer) ? shipmentData.customer[0] : shipmentData.customer,
        } : null,
        invoice,
      };

      setParcelData(result);
      setDialogOpen(true);
      playSuccessBeep();
    } catch (err: any) {
      console.error('Error looking up parcel:', err);
      setError(err.message || 'Failed to lookup parcel');
      playErrorBeep();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleScan = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    setScanAnimation(true);
    setLastScanTime(new Date());
    
    await lookupParcel(barcode.trim());
    
    setTimeout(() => setScanAnimation(false), 500);
    setBarcode('');
  }, [barcode, lookupParcel]);

  const releaseParcel = useCallback(async () => {
    if (!parcelData || !user?.id) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('parcels')
        .update({
          picked_up_at: new Date().toISOString(),
          picked_up_by: user.id,
        })
        .eq('id', parcelData.id);

      if (error) throw error;

      // Update local state
      const updatedParcel = {
        ...parcelData,
        picked_up_at: new Date().toISOString(),
      };
      setParcelData(updatedParcel);
      setRecentCheckouts(prev => [updatedParcel, ...prev.slice(0, 9)]);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['parcels'] });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });

      toast.success('Parcel Released', {
        description: `Parcel ${parcelData.barcode} has been released to customer.`,
      });
      playSuccessBeep();
    } catch (err: any) {
      console.error('Error releasing parcel:', err);
      toast.error('Failed to release parcel', {
        description: err.message,
      });
      playErrorBeep();
    } finally {
      setIsLoading(false);
    }
  }, [parcelData, user?.id, queryClient]);

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
        // Refresh invoice data
        if (parcelData?.shipment?.id) {
          supabase
            .from('invoices')
            .select(`
              *,
              customers(id, name, email, phone, address, company_name, tin, vrn),
              shipments(id, tracking_number, origin_region, total_weight_kg, customer_name, description)
            `)
            .eq('shipment_id', parcelData.shipment.id)
            .eq('invoice_type', 'shipping')
            .maybeSingle()
            .then(({ data }) => {
              if (data) {
                setParcelData(prev => prev ? { ...prev, invoice: data as unknown as Invoice } : null);
              }
            });
        }
      },
    });
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setParcelData(null);
    inputRef.current?.focus();
  };

  // Calculate invoice amounts
  const invoice = parcelData?.invoice;
  const currencySymbol = invoice ? (CURRENCY_SYMBOLS[invoice.currency || 'USD'] || '$') : '$';
  const totalAmount = Number(invoice?.amount || 0);
  const paidFromPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalPaid = Math.max(Number(invoice?.amount_paid || 0), paidFromPayments);
  const remainingBalance = Math.max(0, totalAmount - totalPaid);
  const isPaid = invoice?.status === 'paid' || remainingBalance <= 0;

  return (
    <>
      <div className="space-y-6">
        {/* Scanner Input */}
        <Card className={cn(
          "border-2 border-dashed transition-all duration-300",
          scanAnimation 
            ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/20" 
            : "border-accent/50 bg-gradient-to-br from-accent/5 to-transparent"
        )}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className={cn(
                  "p-2 rounded-lg transition-colors duration-300",
                  scanAnimation ? "bg-emerald-500/20" : "bg-accent/10"
                )}>
                  <ScanLine className={cn(
                    "h-5 w-5 transition-colors duration-300",
                    scanAnimation ? "text-emerald-500" : "text-accent"
                  )} />
                </div>
                Parcel Checkout
              </CardTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Volume2 className="h-3 w-3" />
                Audio feedback enabled
              </div>
            </div>
            <CardDescription>
              Scan a parcel barcode to view invoice, record payment, and release to customer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleScan} className="flex gap-3">
              <div className="relative flex-1">
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Scan parcel barcode..."
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className={cn(
                    "text-lg h-14 font-mono pr-24 transition-all duration-300",
                    scanAnimation && "ring-2 ring-emerald-500"
                  )}
                  autoComplete="off"
                  autoFocus
                />
                {lastScanTime && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    Last: {format(lastScanTime, 'HH:mm:ss')}
                  </div>
                )}
              </div>
              <Button type="submit" size="lg" className="h-14 px-6" disabled={isLoading || !barcode.trim()}>
                {isLoading ? 'Looking up...' : 'Lookup'}
              </Button>
            </form>
            
            {error && (
              <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-3 animate-in slide-in-from-top-2">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Checkouts */}
        {recentCheckouts.length > 0 && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                Recent Releases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentCheckouts.map((parcel) => (
                  <div 
                    key={parcel.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-emerald-500/10">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-mono font-medium">{parcel.barcode}</p>
                        <p className="text-sm text-muted-foreground">
                          {parcel.shipment?.customer?.name || 'Unknown customer'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {parcel.picked_up_at && format(new Date(parcel.picked_up_at), 'HH:mm')}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Parcel & Invoice Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="h-6 w-6 text-primary" />
                <div>
                  <DialogTitle className="text-xl">Parcel Checkout</DialogTitle>
                  <p className="text-sm text-muted-foreground font-mono">
                    {parcelData?.barcode}
                  </p>
                </div>
              </div>
              {parcelData?.picked_up_at && (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Released
                </Badge>
              )}
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-6 py-4">
              {/* Parcel & Customer Info */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    Parcel Details
                  </h4>
                  <div className="pl-6 space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="font-medium">{parcelData?.description || 'No description'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Weight</p>
                      <p className="font-medium">{parcelData?.weight_kg} kg</p>
                    </div>
                    {parcelData?.shipment && (
                      <div>
                        <p className="text-sm text-muted-foreground">Tracking #</p>
                        <p className="font-mono font-medium">{parcelData.shipment.tracking_number}</p>
                      </div>
                    )}
                  </div>
                </div>

                {parcelData?.shipment?.customer && (
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Customer
                    </h4>
                    <div className="pl-6 p-4 rounded-lg bg-muted/50 border space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{parcelData.shipment.customer.name}</span>
                      </div>
                      {parcelData.shipment.customer.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{parcelData.shipment.customer.phone}</span>
                        </div>
                      )}
                      {parcelData.shipment.customer.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>{parcelData.shipment.customer.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Invoice Section */}
              {invoice ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Invoice {invoice.invoice_number}
                    </h4>
                    <InvoiceStatusBadge status={invoice.status || 'pending'} />
                  </div>

                  {/* Invoice Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Invoice Date</p>
                      <p className="font-medium">{invoice.created_at ? format(new Date(invoice.created_at), 'MMM dd, yyyy') : '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Due Date</p>
                      <p className="font-medium">{invoice.due_date ? format(new Date(invoice.due_date), 'MMM dd, yyyy') : '-'}</p>
                    </div>
                    {invoice.shipments?.origin_region && (
                      <div>
                        <p className="text-muted-foreground">Origin</p>
                        <p className="font-medium capitalize">{invoice.shipments.origin_region}</p>
                      </div>
                    )}
                    {invoice.rate_per_kg && (
                      <div>
                        <p className="text-muted-foreground">Rate per kg</p>
                        <p className="font-medium">{currencySymbol}{Number(invoice.rate_per_kg).toFixed(2)}/kg</p>
                      </div>
                    )}
                  </div>

                  {/* Invoice Line Items */}
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Description</TableHead>
                          <TableHead className="text-center">Qty</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
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
                          // Fallback: show basic invoice info if no line items
                          <TableRow>
                            <TableCell>
                              <div>
                                <p className="font-medium">Shipping Charges</p>
                                {invoice.shipments?.total_weight_kg && (
                                  <p className="text-sm text-muted-foreground">{invoice.shipments.total_weight_kg} kg</p>
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
                        {/* Subtotal / Total row */}
                        <TableRow className="bg-muted/30 font-semibold">
                          <TableCell colSpan={3} className="text-right">Total</TableCell>
                          <TableCell className="text-right">
                            {currencySymbol}{totalAmount.toFixed(2)} {invoice.currency}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  {/* Amount Overview */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                      <p className="text-xl font-bold">
                        {currencySymbol}{totalAmount.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-4">
                      <p className="text-sm text-emerald-600 dark:text-emerald-400">Amount Paid</p>
                      <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                        {currencySymbol}{totalPaid.toFixed(2)}
                      </p>
                    </div>
                    <div className={`rounded-lg p-4 ${remainingBalance > 0 ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-emerald-50 dark:bg-emerald-950/30'}`}>
                      <p className={`text-sm ${remainingBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        Balance Due
                      </p>
                      <p className={`text-xl font-bold ${remainingBalance > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                        {currencySymbol}{remainingBalance.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Notes */}
                  {invoice.notes && (
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <p className="text-sm text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm">{invoice.notes}</p>
                    </div>
                  )}

                  {/* Payment History */}
                  {payments.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="font-medium text-sm flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        Payment History
                      </h5>
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
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No invoice found for this shipment</p>
                </div>
              )}

              {/* Already Released Warning */}
              {parcelData?.picked_up_at && (
                <>
                  <Separator />
                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                    <div>
                      <p className="font-medium text-amber-700">Already Released</p>
                      <p className="text-sm text-amber-600">
                        This parcel was released on {format(new Date(parcelData.picked_up_at), 'PPp')}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="flex justify-between items-center pt-4 border-t flex-shrink-0">
            <div className="flex gap-2">
              {invoice && (
                <Button variant="outline" size="sm" onClick={() => handlePrint()}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Invoice
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={closeDialog}>
                Close
              </Button>
              {invoice && !isPaid && (
                <Button variant="outline" onClick={() => setPaymentDialogOpen(true)}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              )}
              {!parcelData?.picked_up_at && (
                <Button 
                  onClick={releaseParcel} 
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={isLoading}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Release to Customer
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

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        invoice={invoice || null}
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        isLoading={recordPayment.isPending}
        remainingBalance={remainingBalance}
        onRecordPayment={handleRecordPayment}
      />
    </>
  );
}
