import { CheckCircle2, Circle, Package, Plane, MapPin, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type ShipmentStatus = 'collected' | 'in_transit' | 'arrived' | 'delivered';

interface TimelineStep {
  status: ShipmentStatus;
  label: string;
  description: string;
  icon: React.ElementType;
  timestamp: string | null;
}

interface ShipmentTimelineProps {
  currentStatus: ShipmentStatus;
  collectedAt: string | null;
  inTransitAt: string | null;
  arrivedAt: string | null;
  deliveredAt: string | null;
}

export function ShipmentTimeline({
  currentStatus,
  collectedAt,
  inTransitAt,
  arrivedAt,
  deliveredAt,
}: ShipmentTimelineProps) {
  const statusOrder: ShipmentStatus[] = ['collected', 'in_transit', 'arrived', 'delivered'];
  const currentIndex = statusOrder.indexOf(currentStatus);

  const steps: TimelineStep[] = [
    {
      status: 'collected',
      label: 'Collected',
      description: 'Package picked up from sender',
      icon: Package,
      timestamp: collectedAt,
    },
    {
      status: 'in_transit',
      label: 'In Transit',
      description: 'Shipment on the way to destination',
      icon: Plane,
      timestamp: inTransitAt,
    },
    {
      status: 'arrived',
      label: 'Arrived',
      description: 'Arrived at local facility',
      icon: MapPin,
      timestamp: arrivedAt,
    },
    {
      status: 'delivered',
      label: 'Delivered',
      description: 'Successfully delivered',
      icon: Truck,
      timestamp: deliveredAt,
    },
  ];

  return (
    <div className="space-y-0">
      {steps.map((step, index) => {
        const isCompleted = index <= currentIndex;
        const isCurrent = index === currentIndex;
        const Icon = step.icon;

        return (
          <div key={step.status} className="relative flex gap-4">
            {/* Vertical line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'absolute left-5 top-10 w-0.5 h-full -translate-x-1/2',
                  index < currentIndex ? 'bg-primary' : 'bg-border'
                )}
              />
            )}

            {/* Icon */}
            <div
              className={cn(
                'relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 shrink-0',
                isCompleted
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'bg-background border-border text-muted-foreground'
              )}
            >
              {isCompleted ? (
                isCurrent ? (
                  <Icon className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )
              ) : (
                <Circle className="w-5 h-5" />
              )}
            </div>

            {/* Content */}
            <div className={cn('pb-8', index === steps.length - 1 && 'pb-0')}>
              <div className="flex items-center gap-2">
                <h4
                  className={cn(
                    'font-semibold',
                    isCompleted ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </h4>
                {isCurrent && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                    Current
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{step.description}</p>
              {step.timestamp && (
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(step.timestamp), 'MMM d, yyyy • h:mm a')}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
