import { useState } from 'react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Package, Plane, MapPin, CheckCircle, Clock, ExternalLink, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useCustomerShipments } from '@/hooks/useCustomerPortal';
import { useParcels } from '@/hooks/useParcels';
import { SHIPMENT_STATUSES } from '@/lib/constants';
import { useRegions } from '@/hooks/useRegions';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

function ShipmentParcels({ shipmentId }: { shipmentId: string }) {
  const { data: parcels, isLoading } = useParcels(shipmentId);

  if (isLoading) {
    return (
      <div className="space-y-2 p-4 pt-0">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!parcels?.length) {
    return (
      <div className="p-4 pt-0 text-sm text-muted-foreground text-center">
        No parcels in this shipment
      </div>
    );
  }

  const collectedCount = parcels.filter(p => p.picked_up_at).length;

  return (
    <div className="p-4 pt-0 space-y-2">
      <div className="flex items-center justify-between text-sm mb-3">
        <span className="text-muted-foreground">Parcels in shipment</span>
        <Badge 
          variant="outline" 
          className={cn(
            "text-xs",
            collectedCount === parcels.length 
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
              : collectedCount > 0 
                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                : "bg-muted text-muted-foreground"
          )}
        >
          {collectedCount}/{parcels.length} Collected
        </Badge>
      </div>
      {parcels.map((parcel, index) => (
        <div 
          key={parcel.id} 
          className={cn(
            "flex items-center justify-between p-3 rounded-lg text-sm border",
            parcel.picked_up_at 
              ? "bg-emerald-500/5 border-emerald-500/20" 
              : "bg-muted/50 border-transparent"
          )}
        >
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-xs">#{index + 1}</Badge>
            <div>
              <code className="font-mono text-xs">{parcel.barcode}</code>
              {parcel.description && (
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">{parcel.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground text-xs">{parcel.weight_kg} kg</span>
            {parcel.picked_up_at ? (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 text-xs">
                <CheckCircle2 className="w-3 h-3" />
                Collected
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                Pending
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CustomerShipmentsPage() {
  const navigate = useNavigate();
  const { data: shipments, isLoading } = useCustomerShipments();
  const { data: regions } = useRegions();
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      collected: Package,
      in_transit: Plane,
      arrived: MapPin,
      delivered: CheckCircle,
    };
    return icons[status as keyof typeof icons] || Package;
  };

  const getRegionInfo = (regionCode: string) => {
    return regions?.find(r => r.code === regionCode);
  };

  return (
    <CustomerLayout title="My Shipments" subtitle="View and track all your shipments">
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : !shipments?.length ? (
        <Card className="shadow-lg border-0">
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No shipments yet</h3>
            <p className="text-muted-foreground mb-6">
              Once you have shipments, they'll appear here for easy tracking.
            </p>
            <Button onClick={() => navigate('/')}>
              Get Started
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {shipments.map((shipment) => {
            const StatusIcon = getStatusIcon(shipment.status || 'collected');
            const statusConfig = SHIPMENT_STATUSES[shipment.status as keyof typeof SHIPMENT_STATUSES];
            const region = getRegionInfo(shipment.origin_region);
            const isExpanded = expandedIds.includes(shipment.id);

            return (
              <Collapsible 
                key={shipment.id} 
                open={isExpanded} 
                onOpenChange={() => toggleExpanded(shipment.id)}
              >
                <Card className="shadow-lg border-0 overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* Status indicator */}
                      <div className={`w-full md:w-2 ${
                        shipment.status === 'delivered' ? 'bg-green-500' :
                        shipment.status === 'in_transit' ? 'bg-blue-500' :
                        shipment.status === 'arrived' ? 'bg-purple-500' :
                        'bg-amber-500'
                      }`} />

                      <div className="flex-1 p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                              <StatusIcon className="w-6 h-6 text-brand-navy" />
                            </div>
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <code className="font-mono text-lg font-bold text-brand-gold">
                                  {shipment.tracking_number}
                                </code>
                                <Badge variant="outline" className={statusConfig?.color}>
                                  {statusConfig?.label}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  {region?.flag_emoji} {region?.name}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Package className="h-3 w-3" />
                                  {shipment.total_weight_kg} kg
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(shipment.created_at || ''), 'MMM d, yyyy')}
                                </span>
                              </div>
                              {shipment.description && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  {shipment.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Package className="h-4 w-4 mr-2" />
                                Parcels
                                <ChevronDown className={cn(
                                  "h-4 w-4 ml-1 transition-transform duration-200",
                                  isExpanded && "rotate-180"
                                )} />
                              </Button>
                            </CollapsibleTrigger>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/tracking?number=${shipment.tracking_number}`)}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Track
                            </Button>
                          </div>
                        </div>

                        {/* Timeline preview */}
                        <div className="mt-6 flex items-center gap-2">
                          {['collected', 'in_transit', 'arrived', 'delivered'].map((step, index) => {
                            const stepIndex = ['collected', 'in_transit', 'arrived', 'delivered'].indexOf(shipment.status || 'collected');
                            const isCompleted = index <= stepIndex;
                            const isCurrent = index === stepIndex;

                            return (
                              <div key={step} className="flex items-center flex-1">
                                <div className={`w-3 h-3 rounded-full ${
                                  isCompleted ? 'bg-primary' : 'bg-muted-foreground/30'
                                } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`} />
                                {index < 3 && (
                                  <div className={`flex-1 h-0.5 ${
                                    index < stepIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                                  }`} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                          <span>Collected</span>
                          <span>In Transit</span>
                          <span>Arrived</span>
                          <span>Delivered</span>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Parcels Section */}
                    <CollapsibleContent>
                      <div className="border-t">
                        <ShipmentParcels shipmentId={shipment.id} />
                      </div>
                    </CollapsibleContent>
                  </CardContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}
    </CustomerLayout>
  );
}
