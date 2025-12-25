import { Package, Ruler, Weight, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Parcel } from '@/hooks/useParcels';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ParcelListProps {
  parcels: Parcel[];
  showPickupStatus?: boolean;
}

export function ParcelList({ parcels, showPickupStatus = true }: ParcelListProps) {
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

  const collectedCount = parcels.filter(p => p.picked_up_at).length;
  const totalCount = parcels.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="w-5 h-5" />
            Parcels ({parcels.length})
          </CardTitle>
          {showPickupStatus && (
            <Badge 
              variant="outline" 
              className={cn(
                collectedCount === totalCount 
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                  : collectedCount > 0 
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {collectedCount === totalCount 
                ? "All Collected" 
                : `${collectedCount}/${totalCount} Collected`}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {parcels.map((parcel, index) => (
          <div
            key={parcel.id}
            className={cn(
              "flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg gap-3 border",
              parcel.picked_up_at 
                ? "bg-emerald-500/5 border-emerald-500/20" 
                : "bg-muted/50 border-transparent"
            )}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">#{index + 1}</Badge>
                <span className="font-mono text-sm">{parcel.barcode}</span>
                {showPickupStatus && parcel.picked_up_at && (
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Collected
                  </Badge>
                )}
                {showPickupStatus && !parcel.picked_up_at && (
                  <Badge variant="outline" className="gap-1 text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    Pending
                  </Badge>
                )}
              </div>
              {parcel.description && (
                <p className="text-sm text-muted-foreground">{parcel.description}</p>
              )}
              {showPickupStatus && parcel.picked_up_at && (
                <p className="text-xs text-emerald-600">
                  Collected on {format(new Date(parcel.picked_up_at), 'MMM d, yyyy \'at\' h:mm a')}
                </p>
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
