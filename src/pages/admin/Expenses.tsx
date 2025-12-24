import { useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';
import { ExpenseFilters } from '@/components/admin/ExpenseFilters';
import { ExpenseTable } from '@/components/admin/ExpenseTable';
import { useAllExpenses, useExpenseStats, usePendingExpenses } from '@/hooks/useExpenses';
import { useDebounce } from '@/hooks/useDebounce';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';

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
          title="Approved Expenses"
          value={`$${(stats?.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
          variant="default"
        />
        <StatCard
          title="This Month (Approved)"
          value={`$${(stats?.thisMonthAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
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
