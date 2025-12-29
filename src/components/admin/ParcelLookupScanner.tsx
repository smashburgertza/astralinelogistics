import { useState, useRef, useEffect } from 'react';
import { Scan, Package, Camera, Keyboard, User, MapPin, Calendar, Weight, FileText, Phone, Mail, Truck, Box, X, QrCode } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CameraBarcodeScanner } from './CameraBarcodeScanner';
import { playSuccessBeep, playErrorBeep } from '@/lib/audioFeedback';
import { SHIPMENT_STATUSES, CURRENCY_SYMBOLS } from '@/lib/constants';
import { format } from 'date-fns';

interface ParcelDetails {
  id: string;
  barcode: string;
  weight_kg: number;
  description: string | null;
  dimensions: string | null;
  picked_up_at: string | null;
  picked_up_by: string | null;
  created_at: string;
}

interface ShipmentDetails {
  id: string;
  tracking_number: string;
  status: string;
  origin_region: string;
  total_weight_kg: number;
  description: string | null;
  warehouse_location: string | null;
  created_at: string;
  in_transit_at: string | null;
  arrived_at: string | null;
  delivered_at: string | null;
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company_name: string | null;
    customer_code: string | null;
  } | null;
  parcels: ParcelDetails[];
  invoices: {
    id: string;
    invoice_number: string;
    amount: number;
    currency: string;
    status: string;
  }[];
}

export function ParcelLookupScanner() {
  const [barcode, setBarcode] = useState('');
  const [scanMode, setScanMode] = useState<'scanner' | 'camera'>('scanner');
  const [isSearching, setIsSearching] = useState(false);
  const [shipmentDetails, setShipmentDetails] = useState<ShipmentDetails | null>(null);
  const [scannedParcel, setScannedParcel] = useState<ParcelDetails | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep input focused for scanner mode
  useEffect(() => {
    if (scanMode === 'scanner' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [scanMode]);

  // Handle scanner input via the input field
  // Handheld scanners type rapidly and usually send Enter at the end
  useEffect(() => {
    if (scanMode !== 'scanner') return;

    // Auto-search after rapid input stops (for scanners that don't send Enter)
    if (barcode.length >= 3) {
      if (scannerTimeoutRef.current) {
        clearTimeout(scannerTimeoutRef.current);
      }
      scannerTimeoutRef.current = setTimeout(() => {
        if (barcode.length >= 3 && !isSearching) {
          handleSearch(barcode);
        }
      }, 150); // Wait 150ms after last input
    }

    return () => {
      if (scannerTimeoutRef.current) {
        clearTimeout(scannerTimeoutRef.current);
      }
    };
  }, [barcode, scanMode, isSearching]);

  const handleSearch = async (searchBarcode?: string) => {
    let barcodeToSearch = (searchBarcode || barcode).trim();
    if (!barcodeToSearch) return;

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

    barcodeToSearch = barcodeToSearch.toUpperCase();

    setIsSearching(true);
    setShipmentDetails(null);
    setScannedParcel(null);

    try {
      // First, find the parcel by barcode
      const { data: parcel, error: parcelError } = await supabase
        .from('parcels')
        .select('*')
        .ilike('barcode', barcodeToSearch)
        .maybeSingle();

      if (parcelError || !parcel) {
        playErrorBeep();
        toast.error('Parcel not found', {
          description: `No parcel found with barcode "${barcodeToSearch}"`,
        });
        setIsSearching(false);
        return;
      }

      setScannedParcel(parcel);

      // Get the shipment with all related data
      const { data: shipment, error: shipmentError } = await supabase
        .from('shipments')
        .select(`
          *,
          customers (
            id,
            name,
            email,
            phone,
            company_name,
            customer_code
          ),
          parcels (
            id,
            barcode,
            weight_kg,
            description,
            dimensions,
            picked_up_at,
            picked_up_by,
            created_at
          ),
          invoices (
            id,
            invoice_number,
            amount,
            currency,
            status
          )
        `)
        .eq('id', parcel.shipment_id)
        .single();

      if (shipmentError || !shipment) {
        playErrorBeep();
        toast.error('Shipment not found', {
          description: 'Could not find the associated shipment',
        });
        setIsSearching(false);
        return;
      }

      setShipmentDetails({
        id: shipment.id,
        tracking_number: shipment.tracking_number,
        status: shipment.status || 'pending',
        origin_region: shipment.origin_region,
        total_weight_kg: shipment.total_weight_kg,
        description: shipment.description,
        warehouse_location: shipment.warehouse_location,
        created_at: shipment.created_at,
        in_transit_at: shipment.in_transit_at,
        arrived_at: shipment.arrived_at,
        delivered_at: shipment.delivered_at,
        customer: shipment.customers,
        parcels: shipment.parcels || [],
        invoices: shipment.invoices || [],
      });

      playSuccessBeep();
      toast.success('Parcel found', {
        description: `Found shipment ${shipment.tracking_number}`,
      });
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Search failed', {
        description: 'An error occurred while searching',
      });
    } finally {
      setIsSearching(false);
      setBarcode('');
      if (scanMode === 'scanner') {
        inputRef.current?.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleCameraScan = (scannedBarcode: string) => {
    handleSearch(scannedBarcode);
  };

  const clearResults = () => {
    setShipmentDetails(null);
    setScannedParcel(null);
    setBarcode('');
    if (scanMode === 'scanner') {
      inputRef.current?.focus();
    }
  };

  const statusConfig = shipmentDetails 
    ? SHIPMENT_STATUSES[shipmentDetails.status as keyof typeof SHIPMENT_STATUSES] 
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Parcel Lookup
        </CardTitle>
        <CardDescription>
          Use a handheld scanner, camera, or type manually to lookup parcel details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scanner Mode Tabs */}
        <Tabs value={scanMode} onValueChange={(v) => setScanMode(v as 'scanner' | 'camera')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scanner" className="gap-2">
              <Scan className="h-4 w-4" />
              Barcode Scanner
            </TabsTrigger>
            <TabsTrigger value="camera" className="gap-2">
              <Camera className="h-4 w-4" />
              Camera Scan
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scanner" className="mt-4 space-y-4">
            <div className="p-4 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 text-center">
              <Scan className="h-8 w-8 mx-auto mb-2 text-primary animate-pulse" />
              <p className="text-sm font-medium">Ready for Scanner</p>
              <p className="text-xs text-muted-foreground mt-1">
                Use your handheld barcode scanner or type manually
              </p>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Scan className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  placeholder="Scan barcode or type here..."
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-10 font-mono text-lg"
                  disabled={isSearching}
                  autoFocus
                />
              </div>
              <Button onClick={() => handleSearch()} disabled={isSearching || !barcode.trim()}>
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="camera" className="mt-4">
            <CameraBarcodeScanner 
              onScan={handleCameraScan} 
              isActive={scanMode === 'camera'} 
            />
          </TabsContent>
        </Tabs>

        {/* Loading State */}
        {isSearching && (
          <div className="space-y-4 pt-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {/* Results */}
        {shipmentDetails && !isSearching && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Shipment Details</h3>
              <Button variant="ghost" size="sm" onClick={clearResults}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>

            {/* Shipment Header */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-bold">{shipmentDetails.tracking_number}</span>
                    {statusConfig && (
                      <Badge variant="outline">
                        {statusConfig.label}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Origin: {shipmentDetails.origin_region}
                    {shipmentDetails.warehouse_location && ` • Warehouse: ${shipmentDetails.warehouse_location}`}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <Weight className="h-4 w-4" />
                    {shipmentDetails.total_weight_kg} kg
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {shipmentDetails.parcels.length} parcel(s)
                  </p>
                </div>
              </div>

              {shipmentDetails.description && (
                <p className="text-sm mt-3 p-2 bg-muted/50 rounded">
                  {shipmentDetails.description}
                </p>
              )}

              {/* Timeline */}
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Created: {format(new Date(shipmentDetails.created_at), 'MMM dd, yyyy HH:mm')}</span>
                {shipmentDetails.in_transit_at && (
                  <>
                    <span>•</span>
                    <span>In Transit: {format(new Date(shipmentDetails.in_transit_at), 'MMM dd')}</span>
                  </>
                )}
                {shipmentDetails.arrived_at && (
                  <>
                    <span>•</span>
                    <span>Arrived: {format(new Date(shipmentDetails.arrived_at), 'MMM dd')}</span>
                  </>
                )}
                {shipmentDetails.delivered_at && (
                  <>
                    <span>•</span>
                    <span>Delivered: {format(new Date(shipmentDetails.delivered_at), 'MMM dd')}</span>
                  </>
                )}
              </div>
            </div>

            {/* Customer Info */}
            {shipmentDetails.customer && (
              <div className="p-4 rounded-lg border bg-card">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{shipmentDetails.customer.name}</span>
                    {shipmentDetails.customer.customer_code && (
                      <Badge variant="outline" className="font-mono">
                        {shipmentDetails.customer.customer_code}
                      </Badge>
                    )}
                  </div>
                  {shipmentDetails.customer.company_name && (
                    <p className="text-sm text-muted-foreground">{shipmentDetails.customer.company_name}</p>
                  )}
                  <div className="flex flex-wrap gap-4 text-sm">
                    {shipmentDetails.customer.phone && (
                      <a href={`tel:${shipmentDetails.customer.phone}`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                        <Phone className="h-3 w-3" />
                        {shipmentDetails.customer.phone}
                      </a>
                    )}
                    {shipmentDetails.customer.email && (
                      <a href={`mailto:${shipmentDetails.customer.email}`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                        <Mail className="h-3 w-3" />
                        {shipmentDetails.customer.email}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Parcels List */}
            <div className="p-4 rounded-lg border bg-card">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-3 flex items-center gap-2">
                <Box className="h-4 w-4" />
                Parcels ({shipmentDetails.parcels.length})
              </h4>
              <div className="space-y-2">
                {shipmentDetails.parcels.map((parcel) => (
                  <div
                    key={parcel.id}
                    className={`p-3 rounded-lg border ${
                      scannedParcel?.id === parcel.id 
                        ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                        : 'bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono font-medium">{parcel.barcode}</code>
                        {scannedParcel?.id === parcel.id && (
                          <Badge variant="default" className="text-xs">Scanned</Badge>
                        )}
                        {parcel.picked_up_at && (
                          <Badge variant="secondary" className="text-xs">Collected</Badge>
                        )}
                      </div>
                      <span className="text-sm font-medium">{parcel.weight_kg} kg</span>
                    </div>
                    {parcel.description && (
                      <p className="text-xs text-muted-foreground mt-1">{parcel.description}</p>
                    )}
                    {parcel.dimensions && (
                      <p className="text-xs text-muted-foreground">Dimensions: {parcel.dimensions}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Invoices */}
            {shipmentDetails.invoices.length > 0 && (
              <div className="p-4 rounded-lg border bg-card">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Invoices ({shipmentDetails.invoices.length})
                </h4>
                <div className="space-y-2">
                  {shipmentDetails.invoices.map((invoice) => {
                    const currencySymbol = CURRENCY_SYMBOLS[invoice.currency] || '$';
                    return (
                      <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div>
                          <span className="font-mono text-sm">{invoice.invoice_number}</span>
                          <p className="text-sm font-medium mt-0.5">
                            {currencySymbol}{Number(invoice.amount).toFixed(2)}
                          </p>
                        </div>
                        <Badge 
                          variant="outline"
                          className={
                            invoice.status === 'paid' 
                              ? 'bg-emerald-100 text-emerald-800 border-0' 
                              : invoice.status === 'overdue'
                              ? 'bg-red-100 text-red-800 border-0'
                              : 'bg-amber-100 text-amber-800 border-0'
                          }
                        >
                          {invoice.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!shipmentDetails && !isSearching && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Package className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-sm">Scan a parcel barcode to view details</p>
            <p className="text-xs mt-1">Use the camera or enter manually</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}