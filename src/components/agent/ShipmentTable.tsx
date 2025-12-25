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
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Copy, Eye, Pencil, Plane, MapPin, CheckCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SHIPMENT_STATUSES } from '@/lib/constants';
import { useUpdateShipmentStatus } from '@/hooks/useShipments';
import { format } from 'date-fns';
import { ShipmentStatusBadge } from '@/components/admin/ShipmentStatusBadge';
import { ShipmentDetailDrawer } from '@/components/admin/ShipmentDetailDrawer';
import { EditShipmentDialog } from './EditShipmentDialog';
import { Shipment } from '@/hooks/useShipments';
import { REGIONS } from '@/lib/constants';
import { toast } from 'sonner';

interface AgentShipmentTableProps {
  shipments: Shipment[] | undefined;
  isLoading: boolean;
}

export function AgentShipmentTable({ shipments, isLoading }: AgentShipmentTableProps) {
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const updateStatus = useUpdateShipmentStatus();

  const copyTrackingNumber = (trackingNumber: string) => {
    navigator.clipboard.writeText(trackingNumber);
    toast.success('Tracking number copied to clipboard');
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Tracking #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
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
          Upload your first shipment or adjust your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="font-semibold">Tracking #</TableHead>
            <TableHead className="font-semibold">Customer</TableHead>
            <TableHead className="font-semibold">Weight</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Date</TableHead>
            <TableHead className="font-semibold text-right">Quick Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shipments.map((shipment) => {
            const region = REGIONS[shipment.origin_region as keyof typeof REGIONS];
            return (
              <TableRow key={shipment.id} className="group">
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
                    
                    {/* Edit button - only for collected status */}
                    {shipment.status === 'collected' && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditingShipment(shipment);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Edit Shipment</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    
                    {/* View details button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
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
      <EditShipmentDialog
        shipment={editingShipment}
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setEditingShipment(null);
        }}
      />
    </div>
  );
}
