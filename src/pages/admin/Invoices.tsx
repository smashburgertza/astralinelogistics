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
  const [invoiceType, setInvoiceType] = useState('all');

  const debouncedSearch = useDebounce(search, 300);

  const filters = useMemo(() => ({
    search: debouncedSearch,
    status,
  }), [debouncedSearch, status]);

  const { data: invoices, isLoading } = useInvoices(filters);

  // Filter by invoice type locally
  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    if (invoiceType === 'all') return invoices;
    return invoices.filter(inv => inv.invoice_type === invoiceType);
  }, [invoices, invoiceType]);

  const clearFilters = () => {
    setSearch('');
    setStatus('all');
    setInvoiceType('all');
  };

  // Calculate totals in TZS from filtered invoices
  const totalAmount = filteredInvoices.reduce((sum, inv) => sum + Number(inv.amount_in_tzs || inv.amount), 0);
  const paidAmount = filteredInvoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + Number(inv.amount_in_tzs || inv.amount), 0);
  const pendingAmount = filteredInvoices.filter(i => i.status === 'pending').reduce((sum, inv) => sum + Number(inv.amount_in_tzs || inv.amount), 0);
  const overdueAmount = filteredInvoices.filter(i => i.status === 'overdue').reduce((sum, inv) => sum + Number(inv.amount_in_tzs || inv.amount), 0);

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
          invoiceType={invoiceType}
          onSearchChange={setSearch}
          onStatusChange={setStatus}
          onTypeChange={setInvoiceType}
          onClear={clearFilters}
        />

        {/* Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total (TZS)', amount: totalAmount, color: 'text-primary' },
            { label: 'Paid (TZS)', amount: paidAmount, color: 'text-emerald-600' },
            { label: 'Pending (TZS)', amount: pendingAmount, color: 'text-amber-600' },
            { label: 'Overdue (TZS)', amount: overdueAmount, color: 'text-red-600' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground">{stat.label}</div>
              <div className={`text-2xl font-bold mt-1 ${stat.color}`}>
                TZS {stat.amount.toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <InvoiceTable invoices={filteredInvoices} isLoading={isLoading} />
      </div>
    </AdminLayout>
  );
}
