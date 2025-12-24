import { useState } from 'react';
import { Search, Package, MapPin, Weight, Calendar, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ShipmentTimeline } from '@/components/tracking/ShipmentTimeline';
import { ParcelList } from '@/components/tracking/ParcelList';
import { useTrackShipment } from '@/hooks/useTrackShipment';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  collected: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  in_transit: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  arrived: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  delivered: 'bg-green-500/10 text-green-600 border-green-500/20',
};

const regionLabels: Record<string, string> = {
  europe: 'Europe',
  dubai: 'Dubai',
  china: 'China',
  india: 'India',
};

export default function TrackingPage() {
  const [inputValue, setInputValue] = useState('');
  const [searchedTracking, setSearchedTracking] = useState<string | null>(null);

  const { data: shipment, isLoading, error } = useTrackShipment(searchedTracking);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setSearchedTracking(inputValue.trim().toUpperCase());
    }
  };

  const handleReset = () => {
    setSearchedTracking(null);
    setInputValue('');
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Track Your Shipment</h1>
          <p className="text-muted-foreground">
            Enter your tracking number to see real-time status updates and shipment details.
          </p>
        </div>

        {/* Search Form */}
        <Card className="max-w-xl mx-auto mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Shipment Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTrack} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Enter tracking number (e.g., AST241224ABC123)"
                  className="pl-10"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                />
              </div>
              <Button type="submit" disabled={!inputValue.trim()}>
                Track
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="max-w-3xl mx-auto space-y-6">
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-8 w-64 mb-4" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              </CardContent>
            </Card>
            <div className="grid md:grid-cols-2 gap-6">
              <Skeleton className="h-80" />
              <Skeleton className="h-80" />
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="max-w-xl mx-auto">
            <CardContent className="p-6 text-center">
              <p className="text-destructive">An error occurred while tracking your shipment.</p>
              <Button variant="outline" onClick={handleReset} className="mt-4">
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Not Found State */}
        {searchedTracking && !isLoading && !error && !shipment && (
          <Card className="max-w-xl mx-auto">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Package className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Shipment Not Found</h3>
              <p className="text-muted-foreground mb-4">
                No shipment found with tracking number{' '}
                <span className="font-mono font-medium text-foreground">{searchedTracking}</span>
              </p>
              <Button variant="outline" onClick={handleReset}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Try Another Number
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Shipment Found */}
        {shipment && !isLoading && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Shipment Overview */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Tracking Number</p>
                    <h2 className="text-2xl font-bold font-mono">{shipment.tracking_number}</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={statusColors[shipment.status || 'collected']}
                    >
                      {shipment.status?.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={handleReset}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      New Search
                    </Button>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <MapPin className="w-4 h-4" />
                      <span className="text-xs">Origin</span>
                    </div>
                    <p className="font-semibold">{regionLabels[shipment.origin_region]}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Weight className="w-4 h-4" />
                      <span className="text-xs">Total Weight</span>
                    </div>
                    <p className="font-semibold">{shipment.total_weight_kg} kg</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Package className="w-4 h-4" />
                      <span className="text-xs">Parcels</span>
                    </div>
                    <p className="font-semibold">{shipment.parcels.length}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs">Created</span>
                    </div>
                    <p className="font-semibold">
                      {shipment.created_at
                        ? format(new Date(shipment.created_at), 'MMM d, yyyy')
                        : '-'}
                    </p>
                  </div>
                </div>

                {/* Description */}
                {shipment.description && (
                  <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{shipment.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Timeline and Parcels */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Status Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Shipment Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <ShipmentTimeline
                    currentStatus={shipment.status || 'collected'}
                    collectedAt={shipment.collected_at}
                    inTransitAt={shipment.in_transit_at}
                    arrivedAt={shipment.arrived_at}
                    deliveredAt={shipment.delivered_at}
                  />
                </CardContent>
              </Card>

              {/* Parcels */}
              <ParcelList parcels={shipment.parcels} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
