import { useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';
import { ExpenseFilters } from '@/components/admin/ExpenseFilters';
import { ExpenseTable } from '@/components/admin/ExpenseTable';
import { useAllExpenses, useExpenseStats } from '@/hooks/useExpenses';
import { useDebounce } from '@/hooks/useDebounce';
import { DollarSign, TrendingUp, Calendar, PieChart } from 'lucide-react';

export default function AdminExpensesPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [region, setRegion] = useState('all');

  const debouncedSearch = useDebounce(search, 300);

  const filters = useMemo(() => ({
    category,
    region,
    search: debouncedSearch,
  }), [category, region, debouncedSearch]);

  const { data: expenses, isLoading } = useAllExpenses(filters);
  const { data: stats } = useExpenseStats();

  const clearFilters = () => {
    setSearch('');
    setCategory('all');
    setRegion('all');
  };

  return (
    <AdminLayout 
      title="Expenses" 
      subtitle="Track and manage all operational expenses across shipments"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Expenses"
          value={`$${(stats?.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
          variant="default"
        />
        <StatCard
          title="This Month"
          value={`$${(stats?.thisMonthAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={Calendar}
          variant="primary"
        />
        <StatCard
          title="Transactions"
          value={stats?.total ?? 0}
          icon={TrendingUp}
          variant="navy"
        />
        <StatCard
          title="This Month Count"
          value={stats?.thisMonth ?? 0}
          icon={PieChart}
          variant="success"
        />
      </div>

      {/* Filters */}
      <div className="mb-6">
        <ExpenseFilters
          search={search}
          category={category}
          region={region}
          onSearchChange={setSearch}
          onCategoryChange={setCategory}
          onRegionChange={setRegion}
          onClear={clearFilters}
        />
      </div>

      {/* Table */}
      <ExpenseTable expenses={expenses} isLoading={isLoading} />
    </AdminLayout>
  );
}
