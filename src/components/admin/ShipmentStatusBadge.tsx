import { Badge } from '@/components/ui/badge';
import { Package, Plane, MapPin, CheckCircle } from 'lucide-react';
import { SHIPMENT_STATUSES } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface ShipmentStatusBadgeProps {
  status: string;
  className?: string;
}

const iconMap = {
  Package,
  Plane,
  MapPin,
  CheckCircle,
};

export function ShipmentStatusBadge({ status, className }: ShipmentStatusBadgeProps) {
  const statusConfig = SHIPMENT_STATUSES[status as keyof typeof SHIPMENT_STATUSES];
  
  if (!statusConfig) {
    return <Badge variant="outline">{status}</Badge>;
  }

  const Icon = iconMap[statusConfig.icon as keyof typeof iconMap];
  
  const variants: Record<string, string> = {
    collected: 'bg-amber-500/20 text-amber-600 border-amber-500/30',
    in_transit: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
    arrived: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
    delivered: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30',
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(
        'gap-1.5 font-medium',
        variants[status] || '',
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {statusConfig.label}
    </Badge>
  );
}
