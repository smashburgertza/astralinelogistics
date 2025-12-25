import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { InvoiceFilters } from '@/components/admin/InvoiceFilters';
import { InvoiceTable } from '@/components/admin/InvoiceTable';
import { CreateInvoiceDialog } from '@/components/admin/CreateInvoiceDialog';
import { useInvoices } from '@/hooks/useInvoices';
import { useDebounce } from '@/hooks/useDebounce';
import { useExchangeRates, convertToTZS } from '@/hooks/useExchangeRates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins } from 'lucide-react';
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
  const { data: exchangeRates } = useExchangeRates();

  // Filter by invoice type locally
  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    if (invoiceType === 'all') return invoices;
    return invoices.filter(inv => inv.invoice_type === invoiceType);
  }, [invoices, invoiceType]);

  // Calculate currency breakdown from paid invoices
  const currencyBreakdown = useMemo(() => {
    if (!filteredInvoices || !exchangeRates) return [];
    
    const paidInvoices = filteredInvoices.filter(i => i.status === 'paid');
    const byCurrency: Record<string, number> = {};
    
    paidInvoices.forEach(invoice => {
      const currency = invoice.currency || 'USD';
      byCurrency[currency] = (byCurrency[currency] || 0) + Number(invoice.amount);
    });

    return Object.entries(byCurrency).map(([currency, amount]) => ({
      currency,
      amount,
      amountInTzs: convertToTZS(amount, currency, exchangeRates),
      symbol: CURRENCY_SYMBOLS[currency] || currency,
    })).sort((a, b) => b.amountInTzs - a.amountInTzs);
  }, [filteredInvoices, exchangeRates]);

  const totalRevenueInTzs = currencyBreakdown.reduce((sum, item) => sum + item.amountInTzs, 0);

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

        {/* Currency Breakdown Widget */}
        {currencyBreakdown.length > 0 && (
          <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Coins className="h-5 w-5 text-emerald-600" />
                Revenue by Currency (Paid Invoices)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {currencyBreakdown.map(({ currency, amount, amountInTzs, symbol }) => (
                  <div 
                    key={currency} 
                    className="bg-background/80 rounded-lg p-3 border shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs font-mono">
                        {currency}
                      </Badge>
                    </div>
                    <p className="text-lg font-bold">
                      {symbol}{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ≈ TZS {amountInTzs.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Revenue in TZS</span>
                <span className="text-xl font-bold text-emerald-600">
                  TZS {totalRevenueInTzs.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Table */}
        <InvoiceTable invoices={filteredInvoices} isLoading={isLoading} />
      </div>
    </AdminLayout>
  );
}
