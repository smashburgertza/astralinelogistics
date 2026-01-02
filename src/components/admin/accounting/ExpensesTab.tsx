import { useMemo, useState } from 'react';
import { StatCard } from '@/components/admin/StatCard';
import { ExpenseFilters } from '@/components/admin/ExpenseFilters';
import { ExpenseTable } from '@/components/admin/ExpenseTable';
import { ExpenseDialog } from '@/components/admin/ExpenseDialog';
import { useAllExpenses, useExpenseStats, usePendingExpenses } from '@/hooks/useExpenses';
import { useDebounce } from '@/hooks/useDebounce';
import { useExchangeRates, convertToTZS } from '@/hooks/useExchangeRates';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Clock, CheckCircle, AlertCircle, Coins, Plus } from 'lucide-react';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

const CurrencyTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background/95 backdrop-blur-md border rounded-lg p-3 shadow-xl">
        <p className="font-semibold">{data.currency}</p>
        <p className="text-sm text-muted-foreground">
          {data.symbol}{data.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
        <p className="text-xs text-primary font-medium">
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

export function ExpensesTab() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [region, setRegion] = useState('all');
  const [status, setStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const filters = useMemo(() => ({
    category,
    region,
    search: debouncedSearch,
    status,
    dateFrom: dateFrom ? dateFrom.toISOString().split('T')[0] : undefined,
    dateTo: dateTo ? dateTo.toISOString().split('T')[0] : undefined,
  }), [category, region, debouncedSearch, status, dateFrom, dateTo]);

  const { data: expenses, isLoading } = useAllExpenses(filters);
  const { data: pendingExpenses, isLoading: pendingLoading } = usePendingExpenses();
  const { data: stats } = useExpenseStats();
  const { data: exchangeRates } = useExchangeRates();

  // Calculate currency breakdown from all approved expenses
  const currencyBreakdown = useMemo(() => {
    if (!expenses || !exchangeRates) return [];
    
    const approvedExpenses = expenses.filter(e => e.status === 'approved');
    const byCurrency: Record<string, number> = {};
    
    approvedExpenses.forEach(expense => {
      const currency = expense.currency || 'USD';
      byCurrency[currency] = (byCurrency[currency] || 0) + Number(expense.amount);
    });

    return Object.entries(byCurrency).map(([currency, amount]) => ({
      currency,
      amount,
      amountInTzs: convertToTZS(amount, currency, exchangeRates),
      symbol: CURRENCY_SYMBOLS[currency] || currency,
    })).sort((a, b) => b.amountInTzs - a.amountInTzs);
  }, [expenses, exchangeRates]);

  const totalInTzs = currencyBreakdown.reduce((sum, item) => sum + item.amountInTzs, 0);

  const clearFilters = () => {
    setSearch('');
    setCategory('all');
    setRegion('all');
    setStatus('all');
    setDateFrom(null);
    setDateTo(null);
  };

  const pendingCount = (stats?.pendingCount || 0) + (stats?.needsClarificationCount || 0);

  return (
    <div className="space-y-6">
      <ExpenseDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Expense Management</h2>
          <p className="text-sm text-muted-foreground">
            Track, approve, and manage all operational expenses
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          title="Approved (TZS)"
          value={`TZS ${totalInTzs.toLocaleString()}`}
          icon={DollarSign}
          variant="default"
        />
        <StatCard
          title="This Month (TZS)"
          value={`TZS ${(stats?.thisMonthAmount || 0).toLocaleString()}`}
          icon={TrendingUp}
          variant="primary"
        />
        <StatCard
          title="Pending Approval"
          value={stats?.pendingCount ?? 0}
          icon={Clock}
          variant="navy"
        />
        <StatCard
          title="Needs Clarification"
          value={stats?.needsClarificationCount ?? 0}
          icon={AlertCircle}
          variant="default"
        />
        <StatCard
          title="Total Approved"
          value={stats?.approvedCount ?? 0}
          icon={CheckCircle}
          variant="success"
        />
      </div>

      {/* Currency Summary Widget with Pie Chart */}
      {currencyBreakdown.length > 0 && (
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              Currency Breakdown (Approved Expenses)
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
                        percentage: (item.amountInTzs / totalInTzs) * 100,
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
                        {((amountInTzs / totalInTzs) * 100).toFixed(1)}%
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
              <span className="text-sm text-muted-foreground">Total in TZS</span>
              <span className="text-xl font-bold text-primary">
                TZS {totalInTzs.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for Approval Queue and All Expenses */}
      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queue" className="relative">
            Approval Queue
            {pendingCount > 0 && (
              <Badge 
                variant="destructive" 
                className="ml-2 h-5 min-w-[20px] px-1.5 text-xs"
              >
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 border">
            <h3 className="font-medium mb-1">Pending Approval</h3>
            <p className="text-sm text-muted-foreground">
              Review and approve or deny expenses submitted by employees. Use "Request Clarification" to ask for more information.
            </p>
          </div>
          <ExpenseTable expenses={pendingExpenses} isLoading={pendingLoading} showActions />
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {/* Filters */}
          <ExpenseFilters
            search={search}
            category={category}
            region={region}
            status={status}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onSearchChange={setSearch}
            onCategoryChange={setCategory}
            onRegionChange={setRegion}
            onStatusChange={setStatus}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onClear={clearFilters}
          />

          {/* Table */}
          <ExpenseTable expenses={expenses} isLoading={isLoading} showActions={false} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
