import { useRef, useState, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer, Loader2, Package } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ParcelLabel } from '@/components/agent/ParcelLabel';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type Shipment = Tables<'shipments'> & {
  customers?: { name: string; email: string | null; phone: string | null; company_name: string | null } | null;
};

type Parcel = Tables<'parcels'>;

interface ShipmentWithParcels extends Shipment {
  parcels: Parcel[];
}

interface BulkPrintLabelsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipmentIds: string[];
}

export function BulkPrintLabelsDialog({ open, onOpenChange, shipmentIds }: BulkPrintLabelsDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [shipmentsWithParcels, setShipmentsWithParcels] = useState<ShipmentWithParcels[]>([]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Bulk-Labels-${new Date().toISOString().split('T')[0]}`,
  });

  // Fetch shipments and their parcels when dialog opens
  useEffect(() => {
    if (!open || shipmentIds.length === 0) {
      setShipmentsWithParcels([]);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch shipments with customer info
        const { data: shipments, error: shipmentsError } = await supabase
          .from('shipments')
          .select('*, customers(name, email, phone, company_name)')
          .in('id', shipmentIds);

        if (shipmentsError) throw shipmentsError;

        // Fetch all parcels for these shipments
        const { data: parcels, error: parcelsError } = await supabase
          .from('parcels')
          .select('*')
          .in('shipment_id', shipmentIds)
          .order('created_at', { ascending: true });

        if (parcelsError) throw parcelsError;

        // Group parcels by shipment
        const parcelsMap = new Map<string, Parcel[]>();
        parcels?.forEach(parcel => {
          const existing = parcelsMap.get(parcel.shipment_id) || [];
          parcelsMap.set(parcel.shipment_id, [...existing, parcel]);
        });

        // Combine shipments with their parcels
        const combined: ShipmentWithParcels[] = (shipments || []).map(shipment => ({
          ...shipment,
          parcels: parcelsMap.get(shipment.id) || [],
        }));

        setShipmentsWithParcels(combined);
      } catch (error) {
        console.error('Failed to fetch shipments and parcels:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [open, shipmentIds]);

  const totalParcels = shipmentsWithParcels.reduce((sum, s) => sum + s.parcels.length, 0);
  const shipmentsWithParcelsCount = shipmentsWithParcels.filter(s => s.parcels.length > 0).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Bulk Print Labels
          </DialogTitle>
          <DialogDescription>
            Print labels for all parcels across {shipmentIds.length} selected shipment(s)
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading parcels...</span>
          </div>
        ) : totalParcels === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">No parcels found</p>
            <p className="text-sm">Selected shipments have no parcels to print.</p>
          </div>
        ) : (
          <>
            {/* Summary Bar */}
            <div className="flex items-center justify-between py-4 border-b">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-sm">
                  {shipmentsWithParcelsCount} shipment(s)
                </Badge>
                <Badge variant="default" className="text-sm">
                  {totalParcels} label(s)
                </Badge>
              </div>
              <Button onClick={() => handlePrint()} className="gap-2">
                <Printer className="h-4 w-4" />
                Print All Labels
              </Button>
            </div>

            {/* Labels Preview - Scrollable */}
            <ScrollArea className="flex-1 min-h-[300px]">
              <div className="bg-muted/30 rounded-lg p-4">
                <div 
                  ref={printRef}
                  className="flex flex-wrap gap-4 justify-center print:block"
                >
                  {shipmentsWithParcels.map((shipment) => 
                    shipment.parcels.map((parcel, index) => (
                      <div 
                        key={parcel.id} 
                        className="bg-white shadow-md print:shadow-none scale-[0.45] origin-top-left print:scale-100"
                      >
                        <ParcelLabel
                          parcel={{
                            barcode: parcel.barcode,
                            weight_kg: parcel.weight_kg,
                            description: parcel.description || undefined,
                          }}
                          shipmentInfo={{
                            tracking_number: shipment.tracking_number,
                            customer_name: shipment.customers?.name || 'Unknown Customer',
                            customer_phone: shipment.customers?.phone || undefined,
                            origin_region: shipment.origin_region,
                            created_at: shipment.created_at || new Date().toISOString(),
                            parcel_index: index + 1,
                            total_parcels: shipment.parcels.length,
                          }}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </ScrollArea>
          </>
        )}

        {/* Print Styles */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            [data-print-content], [data-print-content] * {
              visibility: visible;
            }
            [data-print-content] {
              position: absolute;
              left: 0;
              top: 0;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
