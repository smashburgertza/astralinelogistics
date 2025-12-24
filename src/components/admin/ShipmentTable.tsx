import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { MoreHorizontal, Package, Plane, MapPin, CheckCircle, Eye, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { ShipmentStatusBadge } from './ShipmentStatusBadge';
import { ShipmentDetailDrawer } from './ShipmentDetailDrawer';
import { Shipment, useUpdateShipmentStatus } from '@/hooks/useShipments';
import { REGIONS, SHIPMENT_STATUSES } from '@/lib/constants';
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
            <TableHead className="font-semibold">Weight</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Date</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shipments.map((shipment) => {
            const region = REGIONS[shipment.origin_region as keyof typeof REGIONS];
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
                    <div className="font-medium">{shipment.customers?.name || 'N/A'}</div>
                    {shipment.customers?.company_name && (
                      <div className="text-xs text-muted-foreground">
                        {shipment.customers.company_name}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5">
                    <span>{region?.flag}</span>
                    <span>{region?.label}</span>
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedShipment(shipment);
                          setDrawerOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs text-muted-foreground">
                        Update Status
                      </DropdownMenuLabel>
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
                          <DropdownMenuItem
                            key={key}
                            disabled={isCurrentStatus || updateStatus.isPending}
                            onClick={() => updateStatus.mutate({ id: shipment.id, status: key })}
                            className={isCurrentStatus ? 'bg-muted' : ''}
                          >
                            <Icon className="h-4 w-4 mr-2" />
                            {label}
                            {isCurrentStatus && <span className="ml-auto text-xs">(current)</span>}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
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
