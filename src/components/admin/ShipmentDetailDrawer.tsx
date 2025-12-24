import { format } from 'date-fns';
import { Package, MapPin, Weight, Clock, User, Copy, Check, Box } from 'lucide-react';
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Shipment } from '@/hooks/useShipments';
import { useParcels } from '@/hooks/useParcels';
import { ShipmentStatusBadge } from './ShipmentStatusBadge';

interface ShipmentDetailDrawerProps {
  shipment: Shipment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusSteps = [
  { key: 'collected', label: 'Collected', field: 'collected_at' },
  { key: 'in_transit', label: 'In Transit', field: 'in_transit_at' },
  { key: 'arrived', label: 'Arrived', field: 'arrived_at' },
  { key: 'delivered', label: 'Delivered', field: 'delivered_at' },
] as const;

export function ShipmentDetailDrawer({ shipment, open, onOpenChange }: ShipmentDetailDrawerProps) {
  const [copied, setCopied] = useState(false);
  const { data: parcels, isLoading: parcelsLoading } = useParcels(shipment?.id ?? null);

  const copyTrackingNumber = () => {
    if (shipment?.tracking_number) {
      navigator.clipboard.writeText(shipment.tracking_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusIndex = (status: string) => {
    return statusSteps.findIndex(step => step.key === status);
  };

  const currentStatusIndex = shipment ? getStatusIndex(shipment.status || 'collected') : -1;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {shipment ? (
          <>
            <SheetHeader className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <SheetTitle className="text-xl">Shipment Details</SheetTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {shipment.tracking_number}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={copyTrackingNumber}
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
                <ShipmentStatusBadge status={shipment.status || 'collected'} />
              </div>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Status Timeline */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Status Timeline
                </h3>
                <div className="relative">
                  {statusSteps.map((step, index) => {
                    const timestamp = shipment[step.field as keyof typeof shipment] as string | null;
                    const isCompleted = index <= currentStatusIndex;
                    const isCurrent = index === currentStatusIndex;

                    return (
                      <div key={step.key} className="flex gap-4 pb-6 last:pb-0">
                        {/* Timeline line and dot */}
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-3 h-3 rounded-full border-2 ${
                              isCompleted
                                ? 'bg-primary border-primary'
                                : 'bg-background border-muted-foreground/30'
                            } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
                          />
                          {index < statusSteps.length - 1 && (
                            <div
                              className={`w-0.5 flex-1 mt-1 ${
                                index < currentStatusIndex
                                  ? 'bg-primary'
                                  : 'bg-muted-foreground/30'
                              }`}
                            />
                          )}
                        </div>

                        {/* Status content */}
                        <div className="flex-1 -mt-0.5">
                          <p
                            className={`font-medium ${
                              isCompleted ? 'text-foreground' : 'text-muted-foreground'
                            }`}
                          >
                            {step.label}
                          </p>
                          {timestamp ? (
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(timestamp), 'MMM d, yyyy h:mm a')}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground/50">Pending</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Shipment Info */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Shipment Information
                </h3>
                <div className="grid gap-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Origin Region</p>
                      <p className="font-medium capitalize">{shipment.origin_region}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Weight className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Weight</p>
                      <p className="font-medium">{shipment.total_weight_kg} kg</p>
                    </div>
                  </div>
                  {shipment.warehouse_location && (
                    <div className="flex items-start gap-3">
                      <Box className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Warehouse Location</p>
                        <p className="font-medium">{shipment.warehouse_location}</p>
                      </div>
                    </div>
                  )}
                  {shipment.description && (
                    <div className="flex items-start gap-3">
                      <Package className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Description</p>
                        <p className="font-medium">{shipment.description}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Info */}
              {shipment.customers && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Customer
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="font-medium">{shipment.customers.name}</p>
                      {shipment.customers.company_name && (
                        <p className="text-sm text-muted-foreground">{shipment.customers.company_name}</p>
                      )}
                      {shipment.customers.email && (
                        <p className="text-sm text-muted-foreground">{shipment.customers.email}</p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Parcels */}
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                  <Box className="h-4 w-4" />
                  Parcels ({parcels?.length || 0})
                </h3>
                {parcelsLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : parcels && parcels.length > 0 ? (
                  <div className="space-y-3">
                    {parcels.map((parcel) => (
                      <div
                        key={parcel.id}
                        className="bg-muted/50 rounded-lg p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <code className="text-sm font-mono">{parcel.barcode}</code>
                          <Badge variant="outline">{parcel.weight_kg} kg</Badge>
                        </div>
                        {parcel.description && (
                          <p className="text-sm text-muted-foreground">{parcel.description}</p>
                        )}
                        {parcel.dimensions && (
                          <p className="text-xs text-muted-foreground">
                            Dimensions: {parcel.dimensions}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No parcels recorded for this shipment
                  </p>
                )}
              </div>

              {/* Dates */}
              <Separator />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Created: {format(new Date(shipment.created_at), 'MMM d, yyyy h:mm a')}</p>
                <p>Last updated: {format(new Date(shipment.updated_at), 'MMM d, yyyy h:mm a')}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No shipment selected</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
