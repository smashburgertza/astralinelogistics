import { Package, Ruler, Weight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Parcel } from '@/hooks/useParcels';

interface ParcelListProps {
  parcels: Parcel[];
}

export function ParcelList({ parcels }: ParcelListProps) {
  if (parcels.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="w-5 h-5" />
            Parcels
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No parcel details available for this shipment.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="w-5 h-5" />
          Parcels ({parcels.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {parcels.map((parcel, index) => (
          <div
            key={parcel.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/50 rounded-lg gap-3"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">#{index + 1}</Badge>
                <span className="font-mono text-sm">{parcel.barcode}</span>
              </div>
              {parcel.description && (
                <p className="text-sm text-muted-foreground">{parcel.description}</p>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Weight className="w-4 h-4" />
                <span>{parcel.weight_kg} kg</span>
              </div>
              {parcel.dimensions && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Ruler className="w-4 h-4" />
                  <span>{parcel.dimensions}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
