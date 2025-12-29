import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO } from 'date-fns';
import { BarChart3, TrendingUp, Users, Package, DollarSign, ArrowUpRight, ArrowDownRight, Wallet, TrendingDown, Scale } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { EXPENSE_CATEGORIES } from '@/hooks/useExpenses';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, ComposedChart
} from 'recharts';

// Platform base currency
const PLATFORM_BASE_CURRENCY = 'TZS';

const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  accent: 'hsl(var(--accent))',
  muted: 'hsl(var(--muted))',
};

const PIE_COLORS = ['#D4AF37', '#1E3A5F', '#4A90A4', '#7C9885', '#8B6914', '#2C5282'];

export default function ReportsPage() {
  // Fetch shipments data
  const { data: shipments, isLoading: shipmentsLoading } = useQuery({
    queryKey: ['reports-shipments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipments')
        .select('id, status, origin_region, total_weight_kg, created_at, collected_at, delivered_at')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch invoices data
  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['reports-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, amount, status, created_at, paid_at, currency')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch customers data
  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ['reports-customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, created_at')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch APPROVED expenses data for P&L (only approved expenses count towards P&L)
  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ['reports-expenses-approved'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('id, amount, category, created_at, status, currency')
        .eq('status', 'approved')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch exchange rates
  const { data: exchangeRates } = useExchangeRates();
  
  // Build rate map for currency conversion to TZS
  const rateMap = useMemo(() => {
    const map = new Map<string, number>();
    map.set('TZS', 1);
    exchangeRates?.forEach(r => map.set(r.currency_code, r.rate_to_tzs));
    return map;
  }, [exchangeRates]);
  
  // Helper to convert amount to base currency (TZS)
  const convertToBaseCurrency = (amount: number, currency: string): number => {
    const rate = rateMap.get(currency) || 1;
    return amount * rate;
  };
  
  // Format TZS with thousands separator
  const formatTZS = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isLoading = shipmentsLoading || invoicesLoading || customersLoading || expensesLoading;

  // Calculate monthly data for charts including P&L (all amounts in TZS)
  const monthlyData = useMemo(() => {
    if (!shipments || !invoices || !customers || !expenses) return [];

    const now = new Date();
    const sixMonthsAgo = subMonths(now, 5);
    const months = eachMonthOfInterval({
      start: startOfMonth(sixMonthsAgo),
      end: endOfMonth(now),
    });

    return months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthShipments = shipments.filter((s) => {
        const date = parseISO(s.created_at || '');
        return date >= monthStart && date <= monthEnd;
      });

      const monthInvoices = invoices.filter((i) => {
        const date = parseISO(i.created_at || '');
        return date >= monthStart && date <= monthEnd;
      });

      const monthCustomers = customers.filter((c) => {
        const date = parseISO(c.created_at || '');
        return date >= monthStart && date <= monthEnd;
      });

      const monthExpenses = expenses.filter((e) => {
        const date = parseISO(e.created_at || '');
        return date >= monthStart && date <= monthEnd;
      });

      // Convert all amounts to TZS
      const revenue = monthInvoices
        .filter((i) => i.status === 'paid')
        .reduce((sum, i) => sum + convertToBaseCurrency(i.amount || 0, i.currency || 'USD'), 0);

      const pending = monthInvoices
        .filter((i) => i.status === 'pending')
        .reduce((sum, i) => sum + convertToBaseCurrency(i.amount || 0, i.currency || 'USD'), 0);

      const totalExpenses = monthExpenses.reduce((sum, e) => 
        sum + convertToBaseCurrency(e.amount || 0, e.currency || 'USD'), 0);
      const netProfit = revenue - totalExpenses;

      return {
        month: format(month, 'MMM'),
        fullMonth: format(month, 'MMMM yyyy'),
        shipments: monthShipments.length,
        weight: monthShipments.reduce((sum, s) => sum + (s.total_weight_kg || 0), 0),
        revenue,
        pending,
        expenses: totalExpenses,
        netProfit,
        customers: monthCustomers.length,
        delivered: monthShipments.filter((s) => s.status === 'delivered').length,
      };
    });
  }, [shipments, invoices, customers, expenses, rateMap]);

  // Expenses by category for P&L breakdown (in TZS)
  const expensesByCategory = useMemo(() => {
    if (!expenses) return [];
    const categoryCounts: Record<string, number> = {};
    expenses.forEach((e) => {
      const category = e.category || 'other';
      const amountInTZS = convertToBaseCurrency(e.amount || 0, e.currency || 'USD');
      categoryCounts[category] = (categoryCounts[category] || 0) + amountInTZS;
    });
    return Object.entries(categoryCounts)
      .map(([key, value]) => ({
        name: EXPENSE_CATEGORIES.find(c => c.value === key)?.label || key.charAt(0).toUpperCase() + key.slice(1),
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses, rateMap]);

  // Status distribution for pie chart
  const statusDistribution = useMemo(() => {
    if (!shipments) return [];
    const statusCounts: Record<string, number> = {};
    shipments.forEach((s) => {
      const status = s.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    return Object.entries(statusCounts).map(([name, value]) => ({
      name: name.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      value,
    }));
  }, [shipments]);

  // Region distribution
  const regionDistribution = useMemo(() => {
    if (!shipments) return [];
    const regionCounts: Record<string, number> = {};
    shipments.forEach((s) => {
      const region = s.origin_region || 'unknown';
      regionCounts[region] = (regionCounts[region] || 0) + 1;
    });
    return Object.entries(regionCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  }, [shipments]);

  // Summary stats including P&L (all amounts in TZS)
  const stats = useMemo(() => {
    const totalShipments = shipments?.length || 0;
    const totalRevenue = invoices?.filter((i) => i.status === 'paid')
      .reduce((sum, i) => sum + convertToBaseCurrency(i.amount || 0, i.currency || 'USD'), 0) || 0;
    const totalExpenses = expenses?.reduce((sum, e) => 
      sum + convertToBaseCurrency(e.amount || 0, e.currency || 'USD'), 0) || 0;
    const totalCustomers = customers?.length || 0;
    const totalWeight = shipments?.reduce((sum, s) => sum + (s.total_weight_kg || 0), 0) || 0;
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Calculate growth (comparing last 2 months)
    const currentMonth = monthlyData[monthlyData.length - 1];
    const previousMonth = monthlyData[monthlyData.length - 2];

    const shipmentGrowth = previousMonth?.shipments
      ? ((currentMonth?.shipments - previousMonth.shipments) / previousMonth.shipments) * 100
      : 0;
    const revenueGrowth = previousMonth?.revenue
      ? ((currentMonth?.revenue - previousMonth.revenue) / previousMonth.revenue) * 100
      : 0;
    const customerGrowth = previousMonth?.customers
      ? ((currentMonth?.customers - previousMonth.customers) / previousMonth.customers) * 100
      : 0;
    const profitGrowth = previousMonth?.netProfit
      ? ((currentMonth?.netProfit - previousMonth.netProfit) / Math.abs(previousMonth.netProfit)) * 100
      : 0;

    return {
      totalShipments,
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      totalCustomers,
      totalWeight,
      shipmentGrowth,
      revenueGrowth,
      customerGrowth,
      profitGrowth,
    };
  }, [shipments, invoices, customers, expenses, monthlyData, rateMap]);

  if (isLoading) {
    return (
      <AdminLayout title="Reports" subtitle="Analytics and business insights">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-[400px]" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Reports" subtitle="Analytics and business insights">
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Shipments</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalShipments.toLocaleString()}</div>
              <div className="flex items-center text-xs">
                {stats.shipmentGrowth >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                )}
                <span className={stats.shipmentGrowth >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {Math.abs(stats.shipmentGrowth).toFixed(1)}%
                </span>
                <span className="text-muted-foreground ml-1">vs last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">TZS {formatTZS(stats.totalRevenue)}</div>
              <div className="flex items-center text-xs">
                {stats.revenueGrowth >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                )}
                <span className={stats.revenueGrowth >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {Math.abs(stats.revenueGrowth).toFixed(1)}%
                </span>
                <span className="text-muted-foreground ml-1">vs last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCustomers.toLocaleString()}</div>
              <div className="flex items-center text-xs">
                {stats.customerGrowth >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                )}
                <span className={stats.customerGrowth >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {Math.abs(stats.customerGrowth).toFixed(1)}%
                </span>
                <span className="text-muted-foreground ml-1">vs last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Weight</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalWeight.toLocaleString()} kg</div>
              <p className="text-xs text-muted-foreground">Across all shipments</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Tabs */}
        <Tabs defaultValue="pnl" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pnl">P&L Report</TabsTrigger>
            <TabsTrigger value="shipments">Shipments</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
          </TabsList>

          {/* P&L Tab */}
          <TabsContent value="pnl" className="space-y-4">
            {/* P&L Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10 border-emerald-200 dark:border-emerald-800">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Total Revenue</CardTitle>
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">TZS {formatTZS(stats.totalRevenue)}</div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">From paid invoices</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10 border-red-200 dark:border-red-800">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">Total Expenses</CardTitle>
                  <Wallet className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-700 dark:text-red-300">TZS {formatTZS(stats.totalExpenses)}</div>
                  <p className="text-xs text-red-600 dark:text-red-400">Approved expenses only</p>
                </CardContent>
              </Card>

              <Card className={`bg-gradient-to-br ${stats.netProfit >= 0 ? 'from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-800' : 'from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10 border-orange-200 dark:border-orange-800'}`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className={`text-sm font-medium ${stats.netProfit >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'}`}>
                    Net {stats.netProfit >= 0 ? 'Profit' : 'Loss'}
                  </CardTitle>
                  {stats.netProfit >= 0 ? <TrendingUp className="h-4 w-4 text-blue-600" /> : <TrendingDown className="h-4 w-4 text-orange-600" />}
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'}`}>
                    TZS {formatTZS(Math.abs(stats.netProfit))}
                  </div>
                  <div className="flex items-center text-xs">
                    {stats.profitGrowth >= 0 ? (
                      <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                    )}
                    <span className={stats.profitGrowth >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {Math.abs(stats.profitGrowth).toFixed(1)}%
                    </span>
                    <span className="text-muted-foreground ml-1">vs last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10 border-purple-200 dark:border-purple-800">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Profit Margin</CardTitle>
                  <Scale className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.profitMargin.toFixed(1)}%</div>
                  <p className="text-xs text-purple-600 dark:text-purple-400">Revenue retained</p>
                </CardContent>
              </Card>
            </div>

            {/* P&L Charts */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Revenue vs Expenses Trend</CardTitle>
                  <CardDescription>Monthly comparison with net profit line</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis className="text-xs" tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number) => [`TZS ${formatTZS(value)}`, '']}
                        />
                        <Legend />
                        <Bar dataKey="revenue" name="Revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
                        <Line 
                          type="monotone" 
                          dataKey="netProfit" 
                          name="Net Profit" 
                          stroke="#3B82F6" 
                          strokeWidth={3}
                          dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Expense Breakdown</CardTitle>
                  <CardDescription>By category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {expensesByCategory.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={expensesByCategory}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            labelLine={false}
                          >
                            {expensesByCategory.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--background))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number) => [`TZS ${formatTZS(value)}`, '']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        No expense data yet
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Expense Details</CardTitle>
                  <CardDescription>Top expense categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {expensesByCategory.slice(0, 6).map((category, index) => (
                      <div key={category.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                          />
                          <span className="text-sm font-medium">{category.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">TZS {formatTZS(category.value)}</p>
                          <p className="text-xs text-muted-foreground">
                            {stats.totalExpenses > 0 ? ((category.value / stats.totalExpenses) * 100).toFixed(1) : 0}%
                          </p>
                        </div>
                      </div>
                    ))}
                    {expensesByCategory.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        No expense data yet
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Shipments Tab */}
          <TabsContent value="shipments" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Shipments</CardTitle>
                  <CardDescription>Number of shipments created per month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Bar dataKey="shipments" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Weight Trend</CardTitle>
                  <CardDescription>Total weight shipped per month (kg)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="weight"
                          stroke={CHART_COLORS.primary}
                          fill={CHART_COLORS.primary}
                          fillOpacity={0.2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Revenue Overview</CardTitle>
                  <CardDescription>Paid vs pending invoices per month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis className="text-xs" tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number) => [`TZS ${formatTZS(value)}`, '']}
                        />
                        <Legend />
                        <Bar dataKey="revenue" name="Paid" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="pending" name="Pending" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Customer Growth</CardTitle>
                <CardDescription>New customers acquired per month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="customers"
                        stroke={CHART_COLORS.primary}
                        strokeWidth={2}
                        dot={{ fill: CHART_COLORS.primary, strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Distribution Tab */}
          <TabsContent value="distribution" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Shipment Status</CardTitle>
                  <CardDescription>Distribution by current status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          labelLine={false}
                        >
                          {statusDistribution.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Regional Distribution</CardTitle>
                  <CardDescription>Shipments by origin region</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={regionDistribution} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" className="text-xs" />
                        <YAxis dataKey="name" type="category" className="text-xs" width={80} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Bar dataKey="value" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
