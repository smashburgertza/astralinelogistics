import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ShipmentFilters } from '@/components/admin/ShipmentFilters';
import { ShipmentTable } from '@/components/admin/ShipmentTable';
import { BulkActionsBar } from '@/components/admin/BulkActionsBar';
import { CreateShipmentDialog } from '@/components/admin/CreateShipmentDialog';
import { useShipments } from '@/hooks/useShipments';
import { useDebounce } from '@/hooks/useDebounce';

export default function AdminShipmentsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [region, setRegion] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
      <div className="space-y-6">
        {/* Header with Action */}
        <div className="flex justify-end">
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

        {/* Table */}
        <ShipmentTable 
          shipments={shipments} 
          isLoading={isLoading}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      </div>
    </AdminLayout>
  );
}
