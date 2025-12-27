import { useState } from 'react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Package } from 'lucide-react';
import { useTrackShipment } from '@/hooks/useTrackShipment';
import { ShipmentTimeline } from '@/components/tracking/ShipmentTimeline';
import { ParcelList } from '@/components/tracking/ParcelList';
import { SHIPMENT_STATUSES } from '@/lib/constants';
import { useRegions } from '@/hooks/useRegions';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function CustomerTrackPage() {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [searchedNumber, setSearchedNumber] = useState('');
  const { data: regions = [] } = useRegions();
  
  const { data: shipment, isLoading, error } = useTrackShipment(searchedNumber);

  const handleSearch = () => {
    if (trackingNumber.trim()) {
      setSearchedNumber(trackingNumber.trim().toUpperCase());
    }
  };

  const statusConfig = shipment?.status 
    ? SHIPMENT_STATUSES[shipment.status as keyof typeof SHIPMENT_STATUSES]
    : null;

  const region = shipment?.origin_region
    ? regions.find(r => r.code === shipment.origin_region)
    : null;

  return (
    <CustomerLayout title="Track Shipment" subtitle="Enter a tracking number to see shipment status">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Search Card */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Track Your Shipment
            </CardTitle>
            <CardDescription>
              Enter your tracking number to view the current status and location
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="Enter tracking number (e.g., AST241224XXXXXX)"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="font-mono"
              />
              <Button onClick={handleSearch} disabled={isLoading}>
                {isLoading ? 'Searching...' : 'Track'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {isLoading && (
          <Card className="shadow-lg border-0">
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        )}

        {error && searchedNumber && (
          <Card className="shadow-lg border-0">
            <CardContent className="p-6 text-center">
              <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Shipment not found</p>
              <p className="text-sm text-muted-foreground mt-1">
                No shipment found with tracking number "{searchedNumber}"
              </p>
            </CardContent>
          </Card>
        )}

        {shipment && (
          <>
            {/* Shipment Info */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-mono text-brand-gold">
                      {shipment.tracking_number}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      {region?.flag_emoji} From {region?.name}
                      <span>•</span>
                      {shipment.total_weight_kg} kg
                    </CardDescription>
                  </div>
                  {statusConfig && (
                    <Badge variant="outline" className={statusConfig.color}>
                      {statusConfig.label}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {shipment.description && (
                  <p className="text-sm text-muted-foreground mb-4">{shipment.description}</p>
                )}
                <ShipmentTimeline 
                  currentStatus={shipment.status as 'collected' | 'in_transit' | 'arrived' | 'delivered'}
                  collectedAt={shipment.collected_at}
                  inTransitAt={shipment.in_transit_at}
                  arrivedAt={shipment.arrived_at}
                  deliveredAt={shipment.delivered_at}
                />
              </CardContent>
            </Card>

            {/* Parcels */}
            {shipment.parcels && shipment.parcels.length > 0 && (
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-lg">Parcels ({shipment.parcels.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <ParcelList parcels={shipment.parcels} />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </CustomerLayout>
  );
}
