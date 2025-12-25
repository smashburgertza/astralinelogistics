import { useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';
import { ExpenseFilters } from '@/components/admin/ExpenseFilters';
import { ExpenseTable } from '@/components/admin/ExpenseTable';
import { useAllExpenses, useExpenseStats, usePendingExpenses } from '@/hooks/useExpenses';
import { useDebounce } from '@/hooks/useDebounce';
import { useExchangeRates, convertToTZS } from '@/hooks/useExchangeRates';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Clock, CheckCircle, AlertCircle, Coins } from 'lucide-react';
import { CURRENCY_SYMBOLS } from '@/lib/constants';

export default function AdminExpensesPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [region, setRegion] = useState('all');
  const [status, setStatus] = useState('all');

  const debouncedSearch = useDebounce(search, 300);

  const filters = useMemo(() => ({
    category,
    region,
    search: debouncedSearch,
    status,
  }), [category, region, debouncedSearch, status]);

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
  };

  const pendingCount = (stats?.pendingCount || 0) + (stats?.needsClarificationCount || 0);

  return (
    <AdminLayout 
      title="Expenses" 
      subtitle="Track and manage all operational expenses across shipments"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
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

      {/* Currency Summary Widget */}
      {currencyBreakdown.length > 0 && (
        <Card className="mb-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              Currency Breakdown (Approved Expenses)
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
            onSearchChange={setSearch}
            onCategoryChange={setCategory}
            onRegionChange={setRegion}
            onStatusChange={setStatus}
            onClear={clearFilters}
          />

          {/* Table */}
          <ExpenseTable expenses={expenses} isLoading={isLoading} showActions={false} />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
