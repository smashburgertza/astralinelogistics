import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { CustomerFilters } from '@/components/admin/CustomerFilters';
import { CustomerTable } from '@/components/admin/CustomerTable';
import { CustomerDialog } from '@/components/admin/CustomerDialog';
import { BulkCustomerImport } from '@/components/admin/BulkCustomerImport';
import { GenericBulkActionsBar } from '@/components/admin/shared/GenericBulkActionsBar';
import { useCustomersList, useBulkDeleteCustomers } from '@/hooks/useCustomers';
import { useDebounce } from '@/hooks/useDebounce';

export default function AdminCustomersPage() {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const debouncedSearch = useDebounce(search, 300);

  const filters = useMemo(() => ({
    search: debouncedSearch,
  }), [debouncedSearch]);

  const { data: customers, isLoading } = useCustomersList(filters);
  const bulkDelete = useBulkDeleteCustomers();

  const clearFilters = () => {
    setSearch('');
  };

  const handleBulkDelete = async () => {
    await bulkDelete.mutateAsync(selectedIds);
    setSelectedIds([]);
  };

  return (
    <AdminLayout title="Customer Management" subtitle="Manage your customer database">
      <div className="space-y-6">
        {/* Header with Actions */}
        <div className="flex justify-end gap-3">
          <BulkCustomerImport />
          <CustomerDialog />
        </div>

        {/* Bulk Actions Bar */}
        <GenericBulkActionsBar
          selectedCount={selectedIds.length}
          onClearSelection={() => setSelectedIds([])}
          onDelete={handleBulkDelete}
          itemLabel="customer"
          isDeleting={bulkDelete.isPending}
          deleteWarning="This will permanently delete the selected customers. Related shipments and invoices may be affected."
        />

        {/* Filters */}
        <CustomerFilters
          search={search}
          onSearchChange={setSearch}
          onClear={clearFilters}
        />

        {/* Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Customers', count: customers?.length || 0, color: 'text-primary' },
            { label: 'Corporate', count: customers?.filter(c => (c as any).customer_type === 'corporate').length || 0, color: 'text-blue-600' },
            { label: 'Individual', count: customers?.filter(c => (c as any).customer_type !== 'corporate').length || 0, color: 'text-emerald-600' },
            { label: 'With Portal Access', count: customers?.filter(c => c.user_id).length || 0, color: 'text-purple-600' },
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
        <CustomerTable 
          customers={customers} 
          isLoading={isLoading}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      </div>
    </AdminLayout>
  );
}
