import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package, Plane, MapPin, CheckCircle, Loader2, X, Printer } from 'lucide-react';
import { useBulkUpdateShipmentStatus } from '@/hooks/useShipments';
import { SHIPMENT_STATUSES } from '@/lib/constants';
import { BulkPrintLabelsDialog } from './BulkPrintLabelsDialog';

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  selectedIds: string[];
}

export function BulkActionsBar({ selectedCount, onClearSelection, selectedIds }: BulkActionsBarProps) {
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const bulkUpdate = useBulkUpdateShipmentStatus();

  const handleBulkUpdate = () => {
    if (!selectedStatus) return;
    
    bulkUpdate.mutate(
      { ids: selectedIds, status: selectedStatus },
      {
        onSuccess: () => {
          setStatusDialogOpen(false);
          setSelectedStatus('');
          onClearSelection();
        },
      }
    );
  };

  const statusIcons = {
    collected: Package,
    in_transit: Plane,
    arrived: MapPin,
    delivered: CheckCircle,
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="flex items-center gap-4 p-4 bg-primary/10 border border-primary/20 rounded-lg animate-in slide-in-from-top-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-primary">
            {selectedCount} shipment{selectedCount !== 1 ? 's' : ''} selected
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClearSelection}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPrintDialogOpen(true)}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Print Labels
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setStatusDialogOpen(true)}
          >
            Update Status
          </Button>
        </div>
      </div>

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Update Status</DialogTitle>
            <DialogDescription>
              Update the status for {selectedCount} selected shipment{selectedCount !== 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SHIPMENT_STATUSES).map(([key, { label }]) => {
                  const Icon = statusIcons[key as keyof typeof statusIcons];
                  return (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setStatusDialogOpen(false);
                setSelectedStatus('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkUpdate}
              disabled={!selectedStatus || bulkUpdate.isPending}
            >
              {bulkUpdate.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update {selectedCount} Shipment{selectedCount !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Labels Dialog */}
      <BulkPrintLabelsDialog
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        shipmentIds={selectedIds}
      />
    </>
  );
}
