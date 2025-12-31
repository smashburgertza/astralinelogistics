import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ParcelLabel } from './ParcelLabel';
import { Printer, ArrowLeft, CheckCircle, Package } from 'lucide-react';
import { useRegions } from '@/hooks/useRegions';

interface ParcelData {
  id: string;
  barcode: string;
  weight_kg: number;
  description?: string;
}

interface ShipmentData {
  tracking_number: string;
  customer_name: string;
  customer_phone?: string;
  origin_region: string;
  created_at: string;
  parcels: ParcelData[];
}

interface PrintableLabelsProps {
  shipments: ShipmentData[];
  onBack: () => void;
}

export function PrintableLabels({ shipments, onBack }: PrintableLabelsProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { data: regions } = useRegions();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Labels-${shipments.map(s => s.tracking_number).join('-')}`,
  });

  // Calculate totals across all shipments
  const totalParcels = shipments.reduce((sum, s) => sum + s.parcels.length, 0);
  const totalWeight = shipments.reduce((sum, s) => 
    sum + s.parcels.reduce((pSum, p) => pSum + p.weight_kg, 0), 0
  );

  // Get region info from first shipment (assuming all are same region)
  const firstShipment = shipments[0];
  const regionInfo = regions?.find(r => r.code === firstShipment?.origin_region);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Success Header */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
        <CardContent className="py-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-green-800 dark:text-green-200">
                {shipments.length} Shipment{shipments.length > 1 ? 's' : ''} Created Successfully!
              </h2>
              <p className="text-green-600 dark:text-green-400">
                {shipments.length === 1 ? (
                  <>Tracking: <span className="font-mono font-bold">{firstShipment.tracking_number}</span></>
                ) : (
                  <>{totalParcels} parcels ready to print</>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipments Summary */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Shipment Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Shipments</p>
              <p className="font-semibold">{shipments.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Origin</p>
              <p className="font-semibold">{regionInfo?.flag_emoji} {regionInfo?.name}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Total Parcels</p>
              <p className="font-semibold">{totalParcels}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Total Weight</p>
              <p className="font-semibold">{totalWeight.toFixed(2)} kg</p>
            </div>
          </div>

          {/* Individual shipment breakdown */}
          {shipments.length > 1 && (
            <div className="border-t pt-4 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Breakdown by customer:</p>
              <div className="grid gap-2">
                {shipments.map((shipment) => (
                  <div key={shipment.tracking_number} className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{shipment.customer_name}</span>
                      <span className="text-muted-foreground font-mono text-xs">
                        {shipment.tracking_number}
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      {shipment.parcels.length} parcel{shipment.parcels.length > 1 ? 's' : ''} • 
                      {shipment.parcels.reduce((sum, p) => sum + p.weight_kg, 0).toFixed(2)} kg
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          onClick={() => handlePrint()} 
          size="lg" 
          className="flex-1 h-14 text-lg gap-2"
        >
          <Printer className="w-5 h-5" />
          Print All Labels ({totalParcels})
        </Button>
        <Button 
          onClick={onBack} 
          variant="outline" 
          size="lg" 
          className="h-14 gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Create Another Shipment
        </Button>
      </div>

      {/* Labels Preview */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Label Preview</CardTitle>
          <CardDescription>
            These labels will be printed. Each parcel gets its own label.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 rounded-lg p-4 overflow-x-auto">
            <div 
              ref={printRef}
              className="flex flex-wrap gap-4 justify-center print:block"
            >
              {shipments.map((shipment) => 
                shipment.parcels.map((parcel, index) => (
                  <div key={parcel.id} className="bg-white shadow-md print:shadow-none">
                    <ParcelLabel
                      parcel={parcel}
                      shipmentInfo={{
                        tracking_number: shipment.tracking_number,
                        customer_name: shipment.customer_name,
                        customer_phone: shipment.customer_phone,
                        origin_region: shipment.origin_region,
                        created_at: shipment.created_at,
                        parcel_index: index + 1,
                        total_parcels: shipment.parcels.length,
                      }}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-labels, #printable-labels * {
            visibility: visible;
          }
          #printable-labels {
            position: absolute;
            left: 0;
            top: 0;
          }
        }
      `}</style>
    </div>
  );
}
