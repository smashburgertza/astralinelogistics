import { useState, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { 
  ChevronDown, 
  ChevronRight, 
  Package, 
  Plane, 
  Ship,
  Eye, 
  Copy,
  MoreHorizontal
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { ShipmentStatusBadge } from './ShipmentStatusBadge';
import { ShipmentDetailDrawer } from './ShipmentDetailDrawer';
import { Shipment, useUpdateShipmentStatus } from '@/hooks/useShipments';
import { SHIPMENT_STATUSES, ShipmentStatus } from '@/lib/constants';
import { useRegions } from '@/hooks/useRegions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface BatchGroup {
  batch_id: string | null;
  batch_number: string | null;
  origin_region: string;
  cargo_type: string;
  arrival_week_start: string | null;
  status: string;
  shipments: Shipment[];
  total_weight: number;
}

interface BatchGroupedShipmentTableProps {
  shipments: Shipment[] | undefined;
  isLoading: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function BatchGroupedShipmentTable({ 
  shipments, 
  isLoading, 
  selectedIds, 
  onSelectionChange 
}: BatchGroupedShipmentTableProps) {
  const updateStatus = useUpdateShipmentStatus();
  const queryClient = useQueryClient();
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const { data: regions = [] } = useRegions();

  // Group shipments by batch
  const batchGroups = useMemo(() => {
    if (!shipments) return [];
    
    const groups: Record<string, BatchGroup> = {};
    
    shipments.forEach(shipment => {
      const key = shipment.batch_id || `unbatched-${shipment.origin_region}`;
      
      if (!groups[key]) {
        groups[key] = {
          batch_id: shipment.batch_id,
          batch_number: null, // We'll fetch this if needed
          origin_region: shipment.origin_region,
          cargo_type: 'air', // Default
          arrival_week_start: null,
          status: shipment.status || 'collected',
          shipments: [],
          total_weight: 0,
        };
      }
      
      groups[key].shipments.push(shipment);
      groups[key].total_weight += shipment.total_weight_kg || 0;
    });
    
    // Sort batches by most recent shipment
    return Object.values(groups).sort((a, b) => {
      const aDate = a.shipments[0]?.created_at || '';
      const bDate = b.shipments[0]?.created_at || '';
      return bDate.localeCompare(aDate);
    });
  }, [shipments]);

  const toggleBatch = (batchKey: string) => {
    setExpandedBatches(prev => {
      const next = new Set(prev);
      if (next.has(batchKey)) {
        next.delete(batchKey);
      } else {
        next.add(batchKey);
      }
      return next;
    });
  };

  const copyTrackingNumber = (trackingNumber: string) => {
    navigator.clipboard.writeText(trackingNumber);
    toast.success('Tracking number copied to clipboard');
  };

  const handleBatchStatusChange = async (batch: BatchGroup, newStatus: ShipmentStatus) => {
    try {
      // Update all shipments in the batch
      const shipmentIds = batch.shipments.map(s => s.id);
      
      const updateData: Record<string, any> = { status: newStatus };
      if (newStatus === 'in_transit') updateData.in_transit_at = new Date().toISOString();
      if (newStatus === 'arrived') updateData.arrived_at = new Date().toISOString();
      if (newStatus === 'delivered') updateData.delivered_at = new Date().toISOString();
      
      const { error } = await supabase
        .from('shipments')
        .update(updateData)
        .in('id', shipmentIds);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast.success(`Updated ${shipmentIds.length} shipments to ${newStatus}`);
    } catch (error: any) {
      toast.error(`Failed to update batch: ${error.message}`);
    }
  };

  const handleSelectBatch = (batch: BatchGroup, checked: boolean) => {
    const batchShipmentIds = batch.shipments.map(s => s.id);
    if (checked) {
      onSelectionChange([...new Set([...selectedIds, ...batchShipmentIds])]);
    } else {
      onSelectionChange(selectedIds.filter(id => !batchShipmentIds.includes(id)));
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter(i => i !== id));
    }
  };

  const getRegionDisplay = (regionCode: string) => {
    const region = regions.find(r => r.code === regionCode);
    return region ? `${region.flag_emoji || ''} ${region.name}` : regionCode;
  };

  const getBatchKey = (batch: BatchGroup) => batch.batch_id || `unbatched-${batch.origin_region}`;

  const isBatchFullySelected = (batch: BatchGroup) => {
    return batch.shipments.every(s => selectedIds.includes(s.id));
  };

  const isBatchPartiallySelected = (batch: BatchGroup) => {
    return batch.shipments.some(s => selectedIds.includes(s.id)) && !isBatchFullySelected(batch);
  };

  // Get the most common status in a batch
  const getBatchStatus = (batch: BatchGroup) => {
    const statusCounts: Record<string, number> = {};
    batch.shipments.forEach(s => {
      const status = s.status || 'collected';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    return Object.entries(statusCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'collected';
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!batchGroups.length) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No shipments found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {batchGroups.map((batch) => {
        const batchKey = getBatchKey(batch);
        const isExpanded = expandedBatches.has(batchKey);
        const batchStatus = getBatchStatus(batch);
        
        return (
          <Collapsible
            key={batchKey}
            open={isExpanded}
            onOpenChange={() => toggleBatch(batchKey)}
          >
            {/* Batch Header Row */}
            <div className="rounded-lg border bg-card overflow-hidden">
              <div className="flex items-center gap-3 p-4 bg-muted/30 hover:bg-muted/50 transition-colors">
                <Checkbox
                  checked={isBatchFullySelected(batch)}
                  onCheckedChange={(checked) => handleSelectBatch(batch, !!checked)}
                  className={isBatchPartiallySelected(batch) ? 'opacity-50' : ''}
                />
                
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                
                <div className="flex items-center gap-2">
                  {batch.cargo_type === 'sea' ? (
                    <Ship className="h-5 w-5 text-blue-500" />
                  ) : (
                    <Plane className="h-5 w-5 text-primary" />
                  )}
                </div>
                
                <div className="flex-1 grid grid-cols-5 gap-4 items-center">
                  <div>
                    <p className="font-medium text-sm">
                      {batch.batch_id ? `Batch Upload` : 'Individual Shipments'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {batch.shipments.length} shipment{batch.shipments.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  
                  <div>
                    <Badge variant="outline" className="capitalize">
                      {getRegionDisplay(batch.origin_region)}
                    </Badge>
                  </div>
                  
                  <div className="text-sm">
                    <span className="font-medium">{batch.total_weight.toFixed(2)}</span>
                    <span className="text-muted-foreground ml-1">kg total</span>
                  </div>
                  
                  <div>
                    <ShipmentStatusBadge status={batchStatus as any} />
                  </div>
                  
                  <div className="flex items-center gap-2 justify-end">
                    <Select
                      value={batchStatus}
                      onValueChange={(value) => handleBatchStatusChange(batch, value as ShipmentStatus)}
                    >
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue placeholder="Update status" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(SHIPMENT_STATUSES).map(([value, config]) => (
                          <SelectItem key={value} value={value}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              {/* Expanded Shipment List */}
              <CollapsibleContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Tracking #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batch.shipments.map((shipment) => (
                      <TableRow key={shipment.id} className="hover:bg-muted/30">
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(shipment.id)}
                            onCheckedChange={(checked) => handleSelectOne(shipment.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                              {shipment.tracking_number}
                            </code>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => copyTrackingNumber(shipment.tracking_number)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copy tracking number</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">
                              {shipment.customers?.name || shipment.customer_name || 'N/A'}
                            </p>
                            {shipment.customers?.company_name && (
                              <p className="text-xs text-muted-foreground">
                                {shipment.customers.company_name}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm truncate max-w-[200px]">
                            {shipment.description || '-'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{shipment.total_weight_kg}</span>
                          <span className="text-muted-foreground ml-1 text-xs">kg</span>
                        </TableCell>
                        <TableCell>
                          <ShipmentStatusBadge status={shipment.status as any} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {shipment.created_at
                            ? format(new Date(shipment.created_at), 'MMM d, yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedShipment(shipment);
                              setDrawerOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}

      {selectedShipment && (
        <ShipmentDetailDrawer
          shipment={selectedShipment}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
        />
      )}
    </div>
  );
}
