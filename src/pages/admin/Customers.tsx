import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { CustomerFilters } from '@/components/admin/CustomerFilters';
import { CustomerTable } from '@/components/admin/CustomerTable';
import { CustomerDialog } from '@/components/admin/CustomerDialog';
import { BulkCustomerImport } from '@/components/admin/BulkCustomerImport';
import { useCustomersList } from '@/hooks/useCustomers';
import { useDebounce } from '@/hooks/useDebounce';

export default function AdminCustomersPage() {
  const [search, setSearch] = useState('');

  const debouncedSearch = useDebounce(search, 300);

  const filters = useMemo(() => ({
    search: debouncedSearch,
  }), [debouncedSearch]);

  const { data: customers, isLoading } = useCustomersList(filters);

  const clearFilters = () => {
    setSearch('');
  };

  return (
    <AdminLayout title="Customer Management" subtitle="Manage your customer database">
      <div className="space-y-6">
        {/* Header with Actions */}
        <div className="flex justify-end gap-3">
          <BulkCustomerImport />
          <CustomerDialog />
        </div>

        {/* Filters */}
        <CustomerFilters
          search={search}
          onSearchChange={setSearch}
          onClear={clearFilters}
        />

        {/* Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Customers', count: customers?.length || 0, color: 'text-primary' },
            { label: 'With Company', count: customers?.filter(c => c.company_name).length || 0, color: 'text-blue-600' },
            { label: 'With Email', count: customers?.filter(c => c.email).length || 0, color: 'text-emerald-600' },
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
        <CustomerTable customers={customers} isLoading={isLoading} />
      </div>
    </AdminLayout>
  );
}
