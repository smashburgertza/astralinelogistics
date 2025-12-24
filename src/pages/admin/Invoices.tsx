import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { InvoiceFilters } from '@/components/admin/InvoiceFilters';
import { InvoiceTable } from '@/components/admin/InvoiceTable';
import { CreateInvoiceDialog } from '@/components/admin/CreateInvoiceDialog';
import { useInvoices } from '@/hooks/useInvoices';
import { useDebounce } from '@/hooks/useDebounce';
import { CURRENCY_SYMBOLS } from '@/lib/constants';

export default function AdminInvoicesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const debouncedSearch = useDebounce(search, 300);

  const filters = useMemo(() => ({
    search: debouncedSearch,
    status,
  }), [debouncedSearch, status]);

  const { data: invoices, isLoading } = useInvoices(filters);

  const clearFilters = () => {
    setSearch('');
    setStatus('all');
  };

  // Calculate totals
  const totalAmount = invoices?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;
  const paidAmount = invoices?.filter(i => i.status === 'paid').reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;
  const pendingAmount = invoices?.filter(i => i.status === 'pending').reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;
  const overdueAmount = invoices?.filter(i => i.status === 'overdue').reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;

  return (
    <AdminLayout title="Invoice Management" subtitle="Create, manage, and track all invoices">
      <div className="space-y-6">
        {/* Header with Action */}
        <div className="flex justify-end">
          <CreateInvoiceDialog />
        </div>

        {/* Filters */}
        <InvoiceFilters
          search={search}
          status={status}
          onSearchChange={setSearch}
          onStatusChange={setStatus}
          onClear={clearFilters}
        />

        {/* Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total', amount: totalAmount, color: 'text-primary' },
            { label: 'Paid', amount: paidAmount, color: 'text-emerald-600' },
            { label: 'Pending', amount: pendingAmount, color: 'text-amber-600' },
            { label: 'Overdue', amount: overdueAmount, color: 'text-red-600' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground">{stat.label}</div>
              <div className={`text-2xl font-bold mt-1 ${stat.color}`}>
                {CURRENCY_SYMBOLS.USD}{stat.amount.toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <InvoiceTable invoices={invoices} isLoading={isLoading} />
      </div>
    </AdminLayout>
  );
}
