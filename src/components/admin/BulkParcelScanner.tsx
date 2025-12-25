import { useState, useRef, useEffect } from 'react';
import { Scan, Check, X, Package, Trash2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface ScannedParcel {
  id: string;
  barcode: string;
  weight_kg: number;
  description: string | null;
  shipment_id: string;
  tracking_number: string;
  customer_name: string;
  already_picked_up: boolean;
}

interface BulkParcelScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkParcelScanner({ open, onOpenChange }: BulkParcelScannerProps) {
  const [barcode, setBarcode] = useState('');
  const [scannedParcels, setScannedParcels] = useState<ScannedParcel[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Focus input when dialog opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (!open) {
      setScannedParcels([]);
      setBarcode('');
    }
  }, [open]);

  const handleScan = async () => {
    if (!barcode.trim()) return;

    const trimmedBarcode = barcode.trim().toUpperCase();
    
    // Check if already scanned
    if (scannedParcels.some(p => p.barcode.toUpperCase() === trimmedBarcode)) {
      toast.warning('Parcel already scanned', {
        description: `Barcode ${trimmedBarcode} is already in the list`,
      });
      setBarcode('');
      inputRef.current?.focus();
      return;
    }

    setIsScanning(true);

    try {
      // Find parcel by barcode with shipment info
      const { data: parcel, error } = await supabase
        .from('parcels')
        .select(`
          id,
          barcode,
          weight_kg,
          description,
          shipment_id,
          picked_up_at,
          shipments!inner (
            tracking_number,
            customers (
              name
            )
          )
        `)
        .ilike('barcode', trimmedBarcode)
        .single();

      if (error || !parcel) {
        toast.error('Parcel not found', {
          description: `No parcel found with barcode ${trimmedBarcode}`,
        });
        setBarcode('');
        inputRef.current?.focus();
        return;
      }

      const shipment = parcel.shipments as { tracking_number: string; customers: { name: string } | null };

      setScannedParcels(prev => [
        {
          id: parcel.id,
          barcode: parcel.barcode,
          weight_kg: parcel.weight_kg,
          description: parcel.description,
          shipment_id: parcel.shipment_id,
          tracking_number: shipment.tracking_number,
          customer_name: shipment.customers?.name || 'Unknown',
          already_picked_up: !!parcel.picked_up_at,
        },
        ...prev,
      ]);

      toast.success('Parcel scanned', {
        description: `${parcel.barcode} added to queue`,
      });
    } catch (err) {
      toast.error('Scan failed', {
        description: 'An error occurred while scanning the parcel',
      });
    } finally {
      setIsScanning(false);
      setBarcode('');
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScan();
    }
  };

  const removeParcel = (id: string) => {
    setScannedParcels(prev => prev.filter(p => p.id !== id));
  };

  const clearAll = () => {
    setScannedParcels([]);
    inputRef.current?.focus();
  };

  const processPickups = async () => {
    const parcelsToProcess = scannedParcels.filter(p => !p.already_picked_up);
    
    if (parcelsToProcess.length === 0) {
      toast.info('No parcels to process', {
        description: 'All scanned parcels have already been picked up',
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await supabase
        .from('parcels')
        .update({
          picked_up_at: new Date().toISOString(),
        })
        .in('id', parcelsToProcess.map(p => p.id));

      if (error) throw error;

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['parcels'] });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });

      toast.success('Parcels processed', {
        description: `${parcelsToProcess.length} parcel(s) marked as picked up`,
      });

      setScannedParcels([]);
      onOpenChange(false);
    } catch (err) {
      toast.error('Processing failed', {
        description: 'Failed to mark parcels as picked up',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const pendingCount = scannedParcels.filter(p => !p.already_picked_up).length;
  const alreadyPickedUpCount = scannedParcels.filter(p => p.already_picked_up).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Bulk Parcel Scanner
          </DialogTitle>
          <DialogDescription>
            Scan parcel barcodes to quickly mark multiple parcels as picked up
          </DialogDescription>
        </DialogHeader>

        {/* Scanner Input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Scan className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Scan or enter barcode..."
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 font-mono"
              disabled={isScanning}
            />
          </div>
          <Button onClick={handleScan} disabled={isScanning || !barcode.trim()}>
            {isScanning ? 'Scanning...' : 'Add'}
          </Button>
        </div>

        {/* Stats */}
        {scannedParcels.length > 0 && (
          <div className="flex items-center gap-4 py-2 text-sm">
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">{scannedParcels.length}</span> scanned
            </span>
            {pendingCount > 0 && (
              <Badge variant="default" className="gap-1">
                <Package className="h-3 w-3" />
                {pendingCount} pending pickup
              </Badge>
            )}
            {alreadyPickedUpCount > 0 && (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {alreadyPickedUpCount} already collected
              </Badge>
            )}
          </div>
        )}

        {/* Scanned Parcels List */}
        <ScrollArea className="flex-1 min-h-[200px] max-h-[400px] border rounded-lg">
          {scannedParcels.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <Scan className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-sm">No parcels scanned yet</p>
              <p className="text-xs mt-1">Scan a barcode to begin</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {scannedParcels.map((parcel) => (
                <div
                  key={parcel.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    parcel.already_picked_up
                      ? 'bg-muted/30 border-muted'
                      : 'bg-background border-border'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono font-medium">
                        {parcel.barcode}
                      </code>
                      {parcel.already_picked_up ? (
                        <Badge variant="secondary" className="text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          Already Collected
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Pending
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{parcel.tracking_number}</span>
                      <span>•</span>
                      <span>{parcel.customer_name}</span>
                      <span>•</span>
                      <span>{parcel.weight_kg} kg</span>
                    </div>
                    {parcel.description && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {parcel.description}
                      </p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeParcel(parcel.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={clearAll}
            disabled={scannedParcels.length === 0 || isProcessing}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
          <Button
            onClick={processPickups}
            disabled={pendingCount === 0 || isProcessing}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            {isProcessing
              ? 'Processing...'
              : `Mark ${pendingCount} as Picked Up`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
