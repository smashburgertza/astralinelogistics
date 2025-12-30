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
import { useExchangeRates, convertToTZS } from '@/hooks/useExchangeRates';
import { InvoiceStatusBadge, InvoicePDFPreview, RecordPaymentDialog, type PaymentDetails } from '@/components/admin/invoices';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { playSuccessBeep, playErrorBeep } from '@/lib/audioFeedback';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface ParcelInfo {
  id: string;
  barcode: string;
  description: string | null;
  weight_kg: number;
  picked_up_at: string | null;
}

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
  allParcels: ParcelInfo[]; // All parcels linked to this shipment
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
  const [recentCheckouts, setRecentCheckouts] = useState<ParcelInfo[]>([]);
  const [selectedParcelIds, setSelectedParcelIds] = useState<Set<string>>(new Set());
  
  const inputRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const recordPayment = useRecordPayment();
  
  const { data: payments = [], refetch: refetchPayments } = useInvoicePayments(parcelData?.invoice?.id || '');
  const { data: invoiceItems = [] } = useInvoiceItems(parcelData?.invoice?.id || '');
  const { data: exchangeRates = [] } = useExchangeRates();

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
      
      // Fetch invoice and all parcels for this shipment in parallel
      let invoice: Invoice | null = null;
      let allParcels: ParcelInfo[] = [];
      
      if (shipmentData?.id) {
        const [invoiceResult, parcelsResult] = await Promise.all([
          supabase
            .from('invoices')
            .select(`
              *,
              customers(id, name, email, phone, address, company_name, tin, vrn),
              shipments(id, tracking_number, origin_region, total_weight_kg, customer_name, description)
            `)
            .eq('shipment_id', shipmentData.id)
            .eq('invoice_type', 'shipping')
            .maybeSingle(),
          supabase
            .from('parcels')
            .select('id, barcode, description, weight_kg, picked_up_at')
            .eq('shipment_id', shipmentData.id)
            .order('barcode'),
        ]);

        if (!invoiceResult.error && invoiceResult.data) {
          invoice = invoiceResult.data as unknown as Invoice;
        }
        
        if (!parcelsResult.error && parcelsResult.data) {
          allParcels = parcelsResult.data;
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
        allParcels,
      };

      // Pre-select unreleased parcels
      const unreleasedIds = allParcels.filter(p => !p.picked_up_at).map(p => p.id);
      setSelectedParcelIds(new Set(unreleasedIds));
      
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

  const releaseSelectedParcels = useCallback(async () => {
    if (!parcelData || !user?.id || selectedParcelIds.size === 0) return;

    setIsLoading(true);
    try {
      const idsToRelease = Array.from(selectedParcelIds);
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('parcels')
        .update({
          picked_up_at: now,
          picked_up_by: user.id,
        })
        .in('id', idsToRelease);

      if (error) throw error;

      // Update local state - mark released parcels
      const updatedParcels = parcelData.allParcels.map(p => 
        idsToRelease.includes(p.id) ? { ...p, picked_up_at: now } : p
      );
      
      // Add to recent checkouts
      const releasedParcels = updatedParcels.filter(p => idsToRelease.includes(p.id));
      setRecentCheckouts(prev => [...releasedParcels, ...prev].slice(0, 10));
      
      setParcelData({
        ...parcelData,
        picked_up_at: idsToRelease.includes(parcelData.id) ? now : parcelData.picked_up_at,
        allParcels: updatedParcels,
      });
      
      // Clear selection
      setSelectedParcelIds(new Set());
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['parcels'] });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });

      toast.success(`${idsToRelease.length} Parcel${idsToRelease.length > 1 ? 's' : ''} Released`, {
        description: `Released to customer.`,
      });
      playSuccessBeep();
    } catch (err: any) {
      console.error('Error releasing parcels:', err);
      toast.error('Failed to release parcels', {
        description: err.message,
      });
      playErrorBeep();
    } finally {
      setIsLoading(false);
    }
  }, [parcelData, user?.id, selectedParcelIds, queryClient]);

  const toggleParcelSelection = (parcelId: string) => {
    setSelectedParcelIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(parcelId)) {
        newSet.delete(parcelId);
      } else {
        newSet.add(parcelId);
      }
      return newSet;
    });
  };

  const selectAllUnreleased = () => {
    if (!parcelData) return;
    const unreleasedIds = parcelData.allParcels.filter(p => !p.picked_up_at).map(p => p.id);
    setSelectedParcelIds(new Set(unreleasedIds));
  };

  const deselectAll = () => {
    setSelectedParcelIds(new Set());
  };

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
      splits: details.splits,
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

  // Calculate TZS equivalents
  const invoiceCurrency = invoice?.currency || 'USD';
  const showTzsEquivalent = invoiceCurrency !== 'TZS' && exchangeRates.length > 0;
  const totalAmountTzs = showTzsEquivalent ? convertToTZS(totalAmount, invoiceCurrency, exchangeRates) : 0;
  const totalPaidTzs = showTzsEquivalent ? convertToTZS(totalPaid, invoiceCurrency, exchangeRates) : 0;
  const remainingBalanceTzs = showTzsEquivalent ? convertToTZS(remainingBalance, invoiceCurrency, exchangeRates) : 0;

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
                          {parcel.description || `${parcel.weight_kg} kg`}
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
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-auto p-4">
          <DialogHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <div>
                  <DialogTitle className="text-lg">Parcel Checkout</DialogTitle>
                  <p className="text-xs text-muted-foreground font-mono">
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

          <div className="space-y-3">
            {/* Parcel & Customer Info - Compact Side by Side */}
            <div className="grid grid-cols-3 gap-3">
              {/* Parcels List */}
              <div className="bg-muted/30 rounded-lg p-3 border col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                    Parcels ({parcelData?.allParcels.length || 0})
                  </h4>
                  {parcelData && parcelData.allParcels.filter(p => !p.picked_up_at).length > 0 && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={selectAllUnreleased}>
                        Select All
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={deselectAll}>
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {parcelData?.allParcels.map((parcel) => {
                    const isReleased = !!parcel.picked_up_at;
                    const isSelected = selectedParcelIds.has(parcel.id);
                    return (
                      <div 
                        key={parcel.id}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg border text-sm cursor-pointer transition-colors",
                          isReleased 
                            ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 opacity-70" 
                            : isSelected 
                              ? "bg-primary/10 border-primary" 
                              : "bg-background hover:bg-muted/50"
                        )}
                        onClick={() => !isReleased && toggleParcelSelection(parcel.id)}
                      >
                        {!isReleased && (
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => toggleParcelSelection(parcel.id)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        )}
                        {isReleased && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <span className="font-mono text-xs">{parcel.barcode}</span>
                          {parcel.description && (
                            <span className="text-muted-foreground text-xs ml-2 truncate">{parcel.description}</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{parcel.weight_kg} kg</span>
                        {isReleased && parcel.picked_up_at && (
                          <span className="text-[10px] text-emerald-600 shrink-0">
                            {format(new Date(parcel.picked_up_at), 'HH:mm')}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {parcelData?.shipment && (
                  <p className="font-mono text-xs text-muted-foreground mt-2">
                    Tracking: {parcelData.shipment.tracking_number}
                  </p>
                )}
              </div>

              {/* Customer & Amount Column */}
              <div className="space-y-3">
                {/* Customer */}
                {parcelData?.shipment?.customer && (
                  <div className="bg-muted/30 rounded-lg p-3 border">
                    <h4 className="font-medium text-sm flex items-center gap-1.5 mb-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      Customer
                    </h4>
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">{parcelData.shipment.customer.name}</p>
                      {parcelData.shipment.customer.phone && (
                        <p className="text-muted-foreground text-xs flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {parcelData.shipment.customer.phone}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Amount Overview */}
                {invoice && (
                  <div className="space-y-2">
                    <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-lg font-bold">{currencySymbol}{totalAmount.toFixed(2)}</p>
                      {showTzsEquivalent && (
                        <p className="text-[10px] text-muted-foreground">≈ TZS {totalAmountTzs.toLocaleString()}</p>
                      )}
                    </div>
                    <div className={`rounded-lg p-2.5 text-center ${remainingBalance > 0 ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-emerald-50 dark:bg-emerald-950/30'}`}>
                      <p className={`text-xs ${remainingBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>Balance Due</p>
                      <p className={`text-lg font-bold ${remainingBalance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {currencySymbol}{remainingBalance.toFixed(2)}
                      </p>
                      {showTzsEquivalent && (
                        <p className={`text-[10px] ${remainingBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          ≈ TZS {remainingBalanceTzs.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Invoice Section */}
            {invoice ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    Invoice {invoice.invoice_number}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {invoice.created_at ? format(new Date(invoice.created_at), 'MMM dd, yyyy') : '-'}
                    </span>
                    <InvoiceStatusBadge status={invoice.status || 'pending'} />
                  </div>
                </div>

                {/* Invoice Line Items - Compact Table */}
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="py-2 text-xs">Description</TableHead>
                        <TableHead className="py-2 text-xs text-center w-16">Qty</TableHead>
                        <TableHead className="py-2 text-xs text-right w-24">Rate</TableHead>
                        <TableHead className="py-2 text-xs text-right w-24">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceItems.length > 0 ? (
                        invoiceItems.map((item) => (
                          <TableRow key={item.id} className="text-sm">
                            <TableCell className="py-1.5">
                              <span className="capitalize">{item.item_type.replace('_', ' ')}</span>
                              {item.description && (
                                <span className="text-muted-foreground text-xs ml-1">- {item.description}</span>
                              )}
                              {item.weight_kg && (
                                <span className="text-muted-foreground text-xs ml-1">({item.weight_kg} kg)</span>
                              )}
                            </TableCell>
                            <TableCell className="py-1.5 text-center text-xs">{item.quantity}</TableCell>
                            <TableCell className="py-1.5 text-right text-xs">
                              {CURRENCY_SYMBOLS[item.currency] || '$'}{Number(item.unit_price).toFixed(2)}
                              {item.unit_type === 'kg' && '/kg'}
                            </TableCell>
                            <TableCell className="py-1.5 text-right font-medium text-xs">
                              {CURRENCY_SYMBOLS[item.currency] || '$'}{Number(item.amount).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow className="text-sm">
                          <TableCell className="py-1.5">
                            Shipping Charges
                            {invoice.shipments?.total_weight_kg && (
                              <span className="text-muted-foreground text-xs ml-1">({invoice.shipments.total_weight_kg} kg)</span>
                            )}
                          </TableCell>
                          <TableCell className="py-1.5 text-center text-xs">1</TableCell>
                          <TableCell className="py-1.5 text-right text-xs">
                            {currencySymbol}{totalAmount.toFixed(2)}
                          </TableCell>
                          <TableCell className="py-1.5 text-right font-medium text-xs">
                            {currencySymbol}{totalAmount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow className="bg-muted/30 font-semibold text-sm">
                        <TableCell colSpan={3} className="py-1.5 text-right">Total</TableCell>
                        <TableCell className="py-1.5 text-right">
                          {currencySymbol}{totalAmount.toFixed(2)} {invoice.currency}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Payment History - Inline if exists */}
                {payments.length > 0 && (
                  <div className="rounded-lg border overflow-hidden">
                    <div className="bg-muted/30 px-3 py-1.5 text-xs font-medium flex items-center gap-1.5">
                      <CreditCard className="h-3 w-3" />
                      Payment History
                    </div>
                    <Table>
                      <TableBody>
                        {payments.map((payment) => (
                          <TableRow key={payment.id} className="text-xs">
                            <TableCell className="py-1">
                              {payment.paid_at ? format(new Date(payment.paid_at), 'MMM dd, yyyy') : '—'}
                            </TableCell>
                            <TableCell className="py-1 capitalize">
                              {payment.payment_method?.replace('_', ' ') || '—'}
                            </TableCell>
                            <TableCell className="py-1 font-mono text-[10px]">
                              {payment.stripe_payment_id || '—'}
                            </TableCell>
                            <TableCell className="py-1 text-right font-medium">
                              {CURRENCY_SYMBOLS[payment.currency || 'USD']}{Number(payment.amount).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Notes - Compact */}
                {invoice.notes && (
                  <div className="p-2 rounded-lg bg-muted/30 border text-xs">
                    <span className="text-muted-foreground">Notes:</span> {invoice.notes}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <FileText className="h-6 w-6 mx-auto mb-1 opacity-50" />
                <p className="text-sm">No invoice found for this shipment</p>
              </div>
            )}

            {/* Already Released Warning */}
            {parcelData?.picked_up_at && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <div className="text-sm">
                  <span className="font-medium text-amber-700">Already Released:</span>{' '}
                  <span className="text-amber-600">{format(new Date(parcelData.picked_up_at), 'PPp')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex justify-between items-center pt-3 border-t">
            <div className="flex gap-2">
              {invoice && (
                <Button variant="outline" size="sm" onClick={() => handlePrint()}>
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={closeDialog}>
                Close
              </Button>
              {invoice && !isPaid && (
                <Button variant="outline" size="sm" onClick={() => setPaymentDialogOpen(true)}>
                  <CreditCard className="h-4 w-4 mr-1" />
                  Record Payment
                </Button>
              )}
              {parcelData && parcelData.allParcels.some(p => !p.picked_up_at) && selectedParcelIds.size > 0 && (
                <Button 
                  size="sm"
                  onClick={releaseSelectedParcels} 
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={isLoading}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Release {selectedParcelIds.size > 1 ? `(${selectedParcelIds.size})` : 'Parcel'}
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
