import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ParcelLabel } from '@/components/agent/ParcelLabel';
import { Parcel } from '@/hooks/useParcels';
import { Shipment } from '@/hooks/useShipments';

interface PrintLabelsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipment: Shipment;
  parcels: Parcel[];
}

export function PrintLabelsDialog({ open, onOpenChange, shipment, parcels }: PrintLabelsDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Labels-${shipment.tracking_number}`,
  });

  if (!parcels.length) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print Parcel Labels
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between py-4 border-b">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{parcels.length}</span> label(s) ready to print
          </div>
          <Button onClick={() => handlePrint()} className="gap-2">
            <Printer className="h-4 w-4" />
            Print All Labels
          </Button>
        </div>

        {/* Labels Preview - Scrollable */}
        <div className="flex-1 overflow-auto py-4">
          <div className="bg-muted/30 rounded-lg p-4">
            <div 
              ref={printRef}
              className="flex flex-wrap gap-4 justify-center print:block"
            >
              {parcels.map((parcel, index) => (
                <div key={parcel.id} className="bg-white shadow-md print:shadow-none scale-75 origin-top-left">
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
                      created_at: shipment.created_at,
                      parcel_index: index + 1,
                      total_parcels: parcels.length,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

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
