import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Plane, MapPin, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import { useCustomerShipments } from '@/hooks/useCustomerPortal';
import { SHIPMENT_STATUSES, REGIONS } from '@/lib/constants';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function CustomerShipmentsPage() {
  const navigate = useNavigate();
  const { data: shipments, isLoading } = useCustomerShipments();

  const getStatusIcon = (status: string) => {
    const icons = {
      collected: Package,
      in_transit: Plane,
      arrived: MapPin,
      delivered: CheckCircle,
    };
    return icons[status as keyof typeof icons] || Package;
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
            const region = REGIONS[shipment.origin_region as keyof typeof REGIONS];

            return (
              <Card key={shipment.id} className="shadow-lg border-0 overflow-hidden">
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
                                {region?.flag} {region?.label}
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </CustomerLayout>
  );
}
