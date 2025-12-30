import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Plane, MapPin, CheckCircle, Eye, Copy } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { ShipmentStatusBadge } from './ShipmentStatusBadge';
import { ShipmentDetailDrawer } from './ShipmentDetailDrawer';
import { Shipment, useUpdateShipmentStatus } from '@/hooks/useShipments';
import { SHIPMENT_STATUSES } from '@/lib/constants';
import { useRegions } from '@/hooks/useRegions';
import { toast } from 'sonner';

interface ShipmentTableProps {
  shipments: Shipment[] | undefined;
  isLoading: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function ShipmentTable({ 
  shipments, 
  isLoading, 
  selectedIds, 
  onSelectionChange 
}: ShipmentTableProps) {
  const updateStatus = useUpdateShipmentStatus();
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data: regions = [] } = useRegions();

  const copyTrackingNumber = (trackingNumber: string) => {
    navigator.clipboard.writeText(trackingNumber);
    toast.success('Tracking number copied to clipboard');
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && shipments) {
      onSelectionChange(shipments.map(s => s.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter(i => i !== id));
    }
  };

  const allSelected = shipments && shipments.length > 0 && selectedIds.length === shipments.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
          <TableRow className="bg-muted/50">
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Tracking #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Origin</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!shipments?.length) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-1">No shipments found</h3>
        <p className="text-muted-foreground">
          Create your first shipment or adjust your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-[50px]">
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el) {
                    (el as any).indeterminate = someSelected;
                  }
                }}
                onCheckedChange={handleSelectAll}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead className="font-semibold">Tracking #</TableHead>
            <TableHead className="font-semibold">Customer</TableHead>
            <TableHead className="font-semibold">Origin</TableHead>
            <TableHead className="font-semibold">Batch</TableHead>
            <TableHead className="font-semibold">Weight</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Date</TableHead>
            <TableHead className="font-semibold text-right">Quick Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shipments.map((shipment) => {
            const regionInfo = regions.find(r => r.code === shipment.origin_region);
            const isSelected = selectedIds.includes(shipment.id);
            
            return (
              <TableRow 
                key={shipment.id} 
                className={`group ${isSelected ? 'bg-primary/5' : ''}`}
              >
                <TableCell>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handleSelectOne(shipment.id, !!checked)}
                    aria-label={`Select shipment ${shipment.tracking_number}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm font-medium text-brand-gold">
                      {shipment.tracking_number}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => copyTrackingNumber(shipment.tracking_number)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {shipment.customers?.name || shipment.customer_name || 'N/A'}
                    </div>
                    {shipment.customers?.company_name && (
                      <div className="text-xs text-muted-foreground">
                        {shipment.customers.company_name}
                      </div>
                    )}
                    {!shipment.customers && shipment.customer_name && (
                      <div className="text-xs text-muted-foreground">(Not in DB)</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5">
                    <span>{regionInfo?.flag_emoji}</span>
                    <span>{regionInfo?.name}</span>
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs text-muted-foreground">
                    {shipment.cargo_batches?.batch_number || '-'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{shipment.total_weight_kg} kg</span>
                </TableCell>
                <TableCell>
                  <ShipmentStatusBadge status={shipment.status || 'collected'} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(shipment.created_at || ''), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    {/* Quick status buttons */}
                    {Object.entries(SHIPMENT_STATUSES).map(([key, { label }]) => {
                      const icons = {
                        collected: Package,
                        in_transit: Plane,
                        arrived: MapPin,
                        delivered: CheckCircle,
                      };
                      const Icon = icons[key as keyof typeof icons];
                      const isCurrentStatus = shipment.status === key;
                      
                      return (
                        <Tooltip key={key}>
                          <TooltipTrigger asChild>
                            <Button
                              variant={isCurrentStatus ? "default" : "outline"}
                              size="icon"
                              className={`h-7 w-7 ${isCurrentStatus ? '' : 'opacity-50 hover:opacity-100'}`}
                              disabled={isCurrentStatus || updateStatus.isPending}
                              onClick={() => updateStatus.mutate({ id: shipment.id, status: key })}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{isCurrentStatus ? `Current: ${label}` : `Set to ${label}`}</p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                    
                    {/* View details button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 ml-1"
                          onClick={() => {
                            setSelectedShipment(shipment);
                            setDrawerOpen(true);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View Details</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <ShipmentDetailDrawer
        shipment={selectedShipment}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
