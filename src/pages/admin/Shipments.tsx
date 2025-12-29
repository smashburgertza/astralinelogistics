import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ShipmentFilters } from '@/components/admin/ShipmentFilters';
import { BatchGroupedShipmentTable } from '@/components/admin/BatchGroupedShipmentTable';
import { BulkActionsBar } from '@/components/admin/BulkActionsBar';
import { CreateShipmentDialog } from '@/components/admin/CreateShipmentDialog';
import { ParcelCheckout } from '@/components/admin/ParcelCheckout';
import { BulkParcelScanner } from '@/components/admin/BulkParcelScanner';
import { ParcelLookupScanner } from '@/components/admin/ParcelLookupScanner';
import { useShipments } from '@/hooks/useShipments';
import { useDebounce } from '@/hooks/useDebounce';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PackageSearch, ScanLine, Scan, QrCode } from 'lucide-react';

export default function AdminShipmentsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [region, setRegion] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const filters = useMemo(() => ({
    search: debouncedSearch,
    status,
    region,
  }), [debouncedSearch, status, region]);

  const { data: shipments, isLoading } = useShipments(filters);

  const clearFilters = () => {
    setSearch('');
    setStatus('all');
    setRegion('all');
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  return (
    <AdminLayout title="Shipment Management" subtitle="Track and manage all shipments across regions">
      <Tabs defaultValue="shipments" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="shipments" className="flex items-center gap-2 data-[state=active]:bg-background">
            <PackageSearch className="h-4 w-4" />
            Shipments
          </TabsTrigger>
          <TabsTrigger value="lookup" className="flex items-center gap-2 data-[state=active]:bg-background">
            <QrCode className="h-4 w-4" />
            Parcel Lookup
          </TabsTrigger>
          <TabsTrigger value="checkout" className="flex items-center gap-2 data-[state=active]:bg-background">
            <ScanLine className="h-4 w-4" />
            Parcel Checkout
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shipments" className="space-y-6 mt-0">
          {/* Header with Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setScannerOpen(true)}>
              <Scan className="h-4 w-4 mr-2" />
              Bulk Scanner
            </Button>
            <CreateShipmentDialog />
          </div>

          {/* Filters */}
          <ShipmentFilters
            search={search}
            status={status}
            region={region}
            onSearchChange={setSearch}
            onStatusChange={setStatus}
            onRegionChange={setRegion}
            onClear={clearFilters}
          />

          {/* Bulk Actions Bar */}
          <BulkActionsBar
            selectedCount={selectedIds.length}
            selectedIds={selectedIds}
            onClearSelection={clearSelection}
          />

          {/* Stats Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total', count: shipments?.length || 0, color: 'text-primary' },
              { label: 'Collected', count: shipments?.filter(s => s.status === 'collected').length || 0, color: 'text-amber-600' },
              { label: 'In Transit', count: shipments?.filter(s => s.status === 'in_transit').length || 0, color: 'text-blue-600' },
              { label: 'Delivered', count: shipments?.filter(s => s.status === 'delivered').length || 0, color: 'text-emerald-600' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg border bg-card p-4">
                <div className="text-sm text-muted-foreground">{stat.label}</div>
                <div className={`text-2xl font-bold mt-1 ${stat.color}`}>
                  {stat.count}
                </div>
              </div>
            ))}
          </div>

          {/* Batch-Grouped Table */}
          <BatchGroupedShipmentTable 
            shipments={shipments} 
            isLoading={isLoading}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        </TabsContent>

        <TabsContent value="lookup" className="mt-0">
          <ParcelLookupScanner />
        </TabsContent>

        <TabsContent value="checkout" className="mt-0">
          <ParcelCheckout />
        </TabsContent>
      </Tabs>

      <BulkParcelScanner open={scannerOpen} onOpenChange={setScannerOpen} />
    </AdminLayout>
  );
}
