import { useState, useMemo } from 'react';
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
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const CHART_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

const CurrencyTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background/95 backdrop-blur-md border rounded-lg p-3 shadow-xl">
        <p className="font-semibold">{data.currency}</p>
        <p className="text-sm text-muted-foreground">
          {data.symbol}{data.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
        <p className="text-xs text-emerald-600 font-medium">
          ≈ TZS {data.amountInTzs.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {data.percentage.toFixed(1)}% of total
        </p>
      </div>
    );
  }
  return null;
};

export function InvoicesTabContent() {
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
    <>
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

      {/* Currency Breakdown Widget with Pie Chart */}
      {currencyBreakdown.length > 0 && (
        <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Coins className="h-5 w-5 text-emerald-600" />
              Revenue by Currency (Paid Invoices)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Pie Chart */}
              <div className="flex-shrink-0 flex flex-col items-center">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie
                      data={currencyBreakdown.map((item, index) => ({
                        ...item,
                        percentage: (item.amountInTzs / totalRevenueInTzs) * 100,
                        fill: CHART_COLORS[index % CHART_COLORS.length],
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="amountInTzs"
                      strokeWidth={0}
                    >
                      {currencyBreakdown.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CurrencyTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {currencyBreakdown.map((item, index) => (
                    <div key={item.currency} className="flex items-center gap-1.5 text-xs">
                      <span 
                        className="w-2.5 h-2.5 rounded-full" 
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} 
                      />
                      <span className="font-medium">{item.currency}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Currency Cards */}
              <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-3">
                {currencyBreakdown.map(({ currency, amount, amountInTzs, symbol }, index) => (
                  <div 
                    key={currency} 
                    className="bg-background/80 rounded-lg p-3 border shadow-sm relative overflow-hidden"
                  >
                    <div 
                      className="absolute top-0 left-0 h-1 w-full" 
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs font-mono">
                        {currency}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {((amountInTzs / totalRevenueInTzs) * 100).toFixed(1)}%
                      </span>
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
    </>
  );
}
