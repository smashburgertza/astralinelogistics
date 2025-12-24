import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  PackageSearch, UsersRound, BadgeDollarSign, TrendingUp, 
  Plane, ArrowRight, AlertTriangle, MapPinned, ReceiptText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { REGIONS, SHIPMENT_STATUSES, type Region, type ShipmentStatus } from '@/lib/constants';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { EXPENSE_CATEGORIES } from '@/hooks/useExpenses';

interface DashboardStats {
  totalShipments: number;
  thisMonthShipments: number;
  activeCustomers: number;
  revenue: number;
  thisMonthRevenue: number;
  pendingInvoices: number;
  totalExpenses: number;
  thisMonthExpenses: number;
  shipmentsByRegion: Record<string, number>;
  shipmentsByStatus: Record<string, number>;
  expensesByCategory: Record<string, number>;
  recentShipments: any[];
  monthlyData: Array<{ month: string; shipments: number; revenue: number; expenses: number }>;
}

const CHART_COLORS = ['#F7BB3A', '#1F8ECE', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#6B7280'];

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalShipments: 0,
    thisMonthShipments: 0,
    activeCustomers: 0,
    revenue: 0,
    thisMonthRevenue: 0,
    pendingInvoices: 0,
    totalExpenses: 0,
    thisMonthExpenses: 0,
    shipmentsByRegion: {},
    shipmentsByStatus: {},
    expensesByCategory: {},
    recentShipments: [],
    monthlyData: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const now = new Date();
      const thisMonthStart = startOfMonth(now);
      const thisMonthEnd = endOfMonth(now);

      // Fetch all data in parallel
      const [shipmentsRes, customersRes, invoicesRes, expensesRes] = await Promise.all([
        supabase.from('shipments').select('id, origin_region, status, tracking_number, total_weight_kg, created_at'),
        supabase.from('customers').select('id', { count: 'exact' }),
        supabase.from('invoices').select('amount, status, paid_at, created_at'),
        supabase.from('expenses').select('amount, category, created_at'),
      ]);

      const shipments = shipmentsRes.data || [];
      const invoices = invoicesRes.data || [];
      const expenses = expensesRes.data || [];

      // This month filters
      const thisMonthShipments = shipments.filter(s => {
        const date = new Date(s.created_at || '');
        return date >= thisMonthStart && date <= thisMonthEnd;
      });

      const paidInvoices = invoices.filter(i => i.status === 'paid');
      const pendingInvoices = invoices.filter(i => i.status === 'pending');
      
      const thisMonthPaidInvoices = paidInvoices.filter(i => {
        const date = new Date(i.paid_at || i.created_at || '');
        return date >= thisMonthStart && date <= thisMonthEnd;
      });

      const thisMonthExpenses = expenses.filter(e => {
        const date = new Date(e.created_at || '');
        return date >= thisMonthStart && date <= thisMonthEnd;
      });

      // Calculate totals
      const revenue = paidInvoices.reduce((sum, i) => sum + Number(i.amount), 0);
      const thisMonthRevenueAmount = thisMonthPaidInvoices.reduce((sum, i) => sum + Number(i.amount), 0);
      const totalExpensesAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const thisMonthExpensesAmount = thisMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

      // Shipments by region
      const shipmentsByRegion: Record<string, number> = {};
      shipments.forEach((s: any) => {
        shipmentsByRegion[s.origin_region] = (shipmentsByRegion[s.origin_region] || 0) + 1;
      });

      // Shipments by status
      const shipmentsByStatus: Record<string, number> = {};
      shipments.forEach((s: any) => {
        shipmentsByStatus[s.status] = (shipmentsByStatus[s.status] || 0) + 1;
      });

      // Expenses by category
      const expensesByCategory: Record<string, number> = {};
      expenses.forEach((e: any) => {
        expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + Number(e.amount);
      });

      // Monthly data for last 6 months
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);

        const monthShipments = shipments.filter(s => {
          const date = new Date(s.created_at || '');
          return date >= monthStart && date <= monthEnd;
        }).length;

        const monthRevenue = paidInvoices.filter(inv => {
          const date = new Date(inv.paid_at || inv.created_at || '');
          return date >= monthStart && date <= monthEnd;
        }).reduce((sum, i) => sum + Number(i.amount), 0);

        const monthExpenses = expenses.filter(e => {
          const date = new Date(e.created_at || '');
          return date >= monthStart && date <= monthEnd;
        }).reduce((sum, e) => sum + Number(e.amount), 0);

        monthlyData.push({
          month: format(monthDate, 'MMM'),
          shipments: monthShipments,
          revenue: monthRevenue,
          expenses: monthExpenses,
        });
      }

      setStats({
        totalShipments: shipments.length,
        thisMonthShipments: thisMonthShipments.length,
        activeCustomers: customersRes.count || 0,
        revenue,
        thisMonthRevenue: thisMonthRevenueAmount,
        pendingInvoices: pendingInvoices.length,
        totalExpenses: totalExpensesAmount,
        thisMonthExpenses: thisMonthExpensesAmount,
        shipmentsByRegion,
        shipmentsByStatus,
        expensesByCategory,
        recentShipments: shipments.slice(0, 5),
        monthlyData,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: ShipmentStatus) => {
    const config = SHIPMENT_STATUSES[status];
    return (
      <Badge variant="outline" className={`status-badge ${config.color}`}>
        {config.label}
      </Badge>
    );
  };

  // Prepare chart data
  const statusChartData = Object.entries(stats.shipmentsByStatus).map(([key, value]) => ({
    name: SHIPMENT_STATUSES[key as ShipmentStatus]?.label || key,
    value,
  }));

  const expenseChartData = Object.entries(stats.expensesByCategory)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({
      name: EXPENSE_CATEGORIES.find(c => c.value === key)?.label || key,
      value,
    }));

  const regionChartData = Object.entries(stats.shipmentsByRegion).map(([key, value]) => ({
    name: REGIONS[key as Region]?.label || key,
    shipments: value,
  }));

  return (
    <AdminLayout title="Dashboard" subtitle="Welcome back! Here's what's happening with your logistics.">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Shipments"
          value={stats.totalShipments}
          subtitle={`${stats.thisMonthShipments} this month`}
          icon={PackageSearch}
          variant="navy"
        />
        <StatCard
          title="Active Customers"
          value={stats.activeCustomers}
          subtitle="Registered"
          icon={UsersRound}
          variant="primary"
        />
        <StatCard
          title="Revenue"
          value={`$${stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={`$${stats.thisMonthRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} this month`}
          icon={BadgeDollarSign}
          variant="success"
        />
        <StatCard
          title="Total Expenses"
          value={`$${stats.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={`$${stats.thisMonthExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} this month`}
          icon={ReceiptText}
          variant="warning"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue & Expenses Trend */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Revenue & Expenses Trend</CardTitle>
            <CardDescription>Last 6 months performance</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={stats.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(value) => `$${value}`} />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={{ fill: '#10B981' }}
                    name="Revenue"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="expenses" 
                    stroke="#F59E0B" 
                    strokeWidth={2}
                    dot={{ fill: '#F59E0B' }}
                    name="Expenses"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shipments by Month */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Monthly Shipments</CardTitle>
            <CardDescription>Shipment volume over time</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="shipments" 
                    fill="#1F8ECE" 
                    radius={[6, 6, 0, 0]}
                    name="Shipments"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Shipments by Status */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Shipment Status</CardTitle>
            <CardDescription>Current distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                No shipments yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expenses by Category */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Expenses Breakdown</CardTitle>
            <CardDescription>By category</CardDescription>
          </CardHeader>
          <CardContent>
            {expenseChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={expenseChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {expenseChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                No expenses yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shipments by Region */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="font-heading text-lg">By Region</CardTitle>
            <CardDescription>Shipment origins</CardDescription>
          </CardHeader>
          <CardContent>
            {regionChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={regionChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" className="text-xs" width={60} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="shipments" 
                    fill="#F7BB3A" 
                    radius={[0, 6, 6, 0]}
                    name="Shipments"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                No data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Shipments */}
        <Card className="lg:col-span-2 shadow-lg border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="font-heading text-lg">Recent Shipments</CardTitle>
              <CardDescription>Latest shipment activity</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/shipments">
                View all
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {stats.recentShipments.length === 0 ? (
              <div className="text-center py-12">
                <PackageSearch className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No shipments yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.recentShipments.map((shipment: any) => (
                  <div 
                    key={shipment.id} 
                    className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-brand-navy/10 flex items-center justify-center">
                      <Plane className="w-5 h-5 text-brand-navy" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{shipment.tracking_number}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <span>{REGIONS[shipment.origin_region as Region]?.flag}</span>
                        <span>{shipment.total_weight_kg}kg</span>
                        <span>•</span>
                        <span>{format(new Date(shipment.created_at), 'MMM d')}</span>
                      </p>
                    </div>
                    {getStatusBadge(shipment.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Quick Stats</CardTitle>
            <CardDescription>Key metrics at a glance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Invoices</p>
                  <p className="text-xl font-bold">{stats.pendingInvoices}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/invoices">View</Link>
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Net Profit (Est.)</p>
                  <p className="text-xl font-bold">
                    ${(stats.revenue - stats.totalExpenses).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <MapPinned className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Regions</p>
                  <p className="text-xl font-bold">{Object.keys(stats.shipmentsByRegion).length}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
        <Button variant="outline" className="h-auto py-4 flex-col gap-2 hover:bg-accent/5 hover:border-accent" asChild>
          <Link to="/admin/shipments">
            <PackageSearch className="w-6 h-6 text-accent" />
            <span>View Shipments</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex-col gap-2 hover:bg-accent/5 hover:border-accent" asChild>
          <Link to="/admin/customers">
            <UsersRound className="w-6 h-6 text-accent" />
            <span>Manage Customers</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex-col gap-2 hover:bg-accent/5 hover:border-accent" asChild>
          <Link to="/admin/invoices">
            <BadgeDollarSign className="w-6 h-6 text-accent" />
            <span>View Invoices</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex-col gap-2 hover:bg-accent/5 hover:border-accent" asChild>
          <Link to="/admin/expenses">
            <ReceiptText className="w-6 h-6 text-accent" />
            <span>Track Expenses</span>
          </Link>
        </Button>
      </div>
    </AdminLayout>
  );
}
