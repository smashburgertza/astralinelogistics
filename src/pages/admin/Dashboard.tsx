import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  PackageSearch, UsersRound, BadgeDollarSign, TrendingUp, 
  Plane, ArrowRight, AlertTriangle, MapPinned, ReceiptText,
  ArrowUpRight, Sparkles, ScanBarcode, Clock, Landmark, Wallet
} from 'lucide-react';
import { useBankAccounts } from '@/hooks/useAccounting';
import { supabase } from '@/integrations/supabase/client';
import { SHIPMENT_STATUSES, type ShipmentStatus } from '@/lib/constants';
import { useRegions } from '@/hooks/useRegions';
import { format, subMonths, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { EmployeePerformanceInsights } from '@/components/admin/EmployeePerformanceInsights';
import { EmployeeLeaderboard } from '@/components/admin/EmployeeLeaderboard';
import { LiveActivityFeed } from '@/components/admin/LiveActivityFeed';
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
  Area,
  AreaChart,
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
  todayScannedParcels: number;
  pendingPickups: number;
}

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#6366F1', '#14B8A6'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur-md border border-border/50 rounded-xl p-3 shadow-xl">
        <p className="font-medium text-sm mb-1">{label}</p>
        {payload.map((item: any, index: number) => (
          <p key={index} className="text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-muted-foreground">{item.name}:</span>
            <span className="font-semibold">
              {item.dataKey === 'revenue' || item.dataKey === 'expenses' 
                ? `TZS ${item.value.toLocaleString()}` 
                : item.value}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const { data: regions = [] } = useRegions();
  const { data: bankAccounts = [] } = useBankAccounts();
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
    todayScannedParcels: 0,
    pendingPickups: 0,
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

      const todayStart = startOfDay(now).toISOString();
      const todayEnd = endOfDay(now).toISOString();

      // Fetch all data in parallel
      const [shipmentsRes, customersRes, invoicesRes, expensesRes, parcelsRes, arrivedShipmentsRes] = await Promise.all([
        supabase.from('shipments').select('id, origin_region, status, tracking_number, total_weight_kg, created_at'),
        supabase.from('customers').select('id', { count: 'exact' }),
        supabase.from('invoices').select('amount, amount_in_tzs, status, paid_at, created_at'),
        supabase.from('expenses').select('amount, category, created_at'),
        supabase.from('parcels').select('id, picked_up_at'),
        supabase.from('shipments').select('id').eq('status', 'arrived'),
      ]);

      const shipments = shipmentsRes.data || [];
      const invoices = invoicesRes.data || [];
      const expenses = expensesRes.data || [];
      const parcels = parcelsRes.data || [];
      const arrivedShipmentIds = (arrivedShipmentsRes.data || []).map(s => s.id);

      // Calculate today's scanned parcels
      const todayScannedParcels = parcels.filter(p => {
        if (!p.picked_up_at) return false;
        const pickedUpDate = new Date(p.picked_up_at);
        return pickedUpDate >= new Date(todayStart) && pickedUpDate <= new Date(todayEnd);
      }).length;

      // Calculate pending pickups (parcels not picked up from arrived shipments)
      const pendingPickups = parcels.filter(p => !p.picked_up_at).length;

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

      // Calculate totals in TZS
      const revenue = paidInvoices.reduce((sum, i) => sum + Number(i.amount_in_tzs || i.amount), 0);
      const thisMonthRevenueAmount = thisMonthPaidInvoices.reduce((sum, i) => sum + Number(i.amount_in_tzs || i.amount), 0);
      
      // Calculate expenses
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
        }).reduce((sum, i) => sum + Number(i.amount_in_tzs || i.amount), 0);

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
        todayScannedParcels,
        pendingPickups,
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

  const regionChartData = Object.entries(stats.shipmentsByRegion).map(([key, value]) => {
    const regionInfo = regions.find(r => r.code === key);
    return {
      name: regionInfo?.name || key,
      shipments: value,
    };
  });

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
          title="Revenue (TZS)"
          value={`TZS ${stats.revenue.toLocaleString()}`}
          subtitle={`TZS ${stats.thisMonthRevenue.toLocaleString()} this month`}
          icon={BadgeDollarSign}
          variant="success"
        />
        <StatCard
          title="Expenses (TZS)"
          value={`TZS ${stats.totalExpenses.toLocaleString()}`}
          subtitle={`TZS ${stats.thisMonthExpenses.toLocaleString()} this month`}
          icon={ReceiptText}
          variant="warning"
        />
      </div>

      {/* Parcel Scanning Widget */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="shadow-xl border-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg">
                  <ScanBarcode className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Today's Scanned Parcels</p>
                  <p className="text-3xl font-bold tracking-tight">{stats.todayScannedParcels}</p>
                  <p className="text-xs text-muted-foreground mt-1">Parcels checked out today</p>
                </div>
              </div>
              <Link to="/admin/shipments">
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-cyan-500/20">
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xl border-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                  <Clock className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Pending Pickups</p>
                  <p className="text-3xl font-bold tracking-tight">{stats.pendingPickups}</p>
                  <p className="text-xs text-muted-foreground mt-1">Parcels awaiting collection</p>
                </div>
              </div>
              <Link to="/admin/shipments">
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-amber-500/20">
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bank Accounts */}
      {bankAccounts.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Landmark className="w-5 h-5 text-primary" />
              Bank Accounts
            </h2>
            <Link to="/admin/accounting">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {bankAccounts.map((account) => (
              <Card key={account.id} className="shadow-lg border-0 bg-gradient-to-br from-primary/5 to-primary/10 backdrop-blur-sm overflow-hidden hover:shadow-xl transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
                      <Wallet className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <Badge variant="outline" className={account.is_active ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-muted text-muted-foreground'}>
                      {account.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground truncate">{account.account_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{account.bank_name}</p>
                    {account.account_number && (
                      <p className="text-xs text-muted-foreground">••••{account.account_number.slice(-4)}</p>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mb-1">Current Balance</p>
                    <p className="text-xl font-bold text-foreground">
                      {account.currency || 'TZS'} {(account.current_balance || 0).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue & Expenses Trend */}
        <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  Revenue & Expenses
                </CardTitle>
                <CardDescription className="mt-1">6-month performance trend</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-accent">
                <ArrowUpRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {stats.monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={stats.monthlyData}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="circle"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10B981" 
                    strokeWidth={2.5}
                    fill="url(#revenueGradient)"
                    name="Revenue"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="expenses" 
                    stroke="#F59E0B" 
                    strokeWidth={2.5}
                    fill="url(#expensesGradient)"
                    name="Expenses"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground">
                <Sparkles className="w-12 h-12 mb-3 text-muted-foreground/30" />
                <p className="text-sm">No data available yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shipments by Month */}
        <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                    <PackageSearch className="w-4 h-4 text-white" />
                  </div>
                  Monthly Shipments
                </CardTitle>
                <CardDescription className="mt-1">Volume over time</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {stats.monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.monthlyData} barCategoryGap="20%">
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6"/>
                      <stop offset="100%" stopColor="#6366F1"/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="shipments" 
                    fill="url(#barGradient)"
                    radius={[8, 8, 0, 0]}
                    name="Shipments"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground">
                <Sparkles className="w-12 h-12 mb-3 text-muted-foreground/30" />
                <p className="text-sm">No data available yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Shipments by Status */}
        <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Status Overview</CardTitle>
            <CardDescription>Current distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {statusChartData.length > 0 ? (
              <div>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <defs>
                      {CHART_COLORS.map((color, index) => (
                        <linearGradient key={`gradient-${index}`} id={`pieGradient${index}`} x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity={1}/>
                          <stop offset="100%" stopColor={color} stopOpacity={0.7}/>
                        </linearGradient>
                      ))}
                    </defs>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {statusChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={`url(#pieGradient${index % CHART_COLORS.length})`} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {statusChartData.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[220px] flex flex-col items-center justify-center text-muted-foreground">
                <PackageSearch className="w-10 h-10 mb-2 text-muted-foreground/30" />
                <p className="text-sm">No shipments yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expenses by Category */}
        <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Expense Breakdown</CardTitle>
            <CardDescription>By category</CardDescription>
          </CardHeader>
          <CardContent>
            {expenseChartData.length > 0 ? (
              <div>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={expenseChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {expenseChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={`url(#pieGradient${index % CHART_COLORS.length})`} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {expenseChartData.slice(0, 4).map((item, index) => (
                    <div key={item.name} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                      <span className="text-muted-foreground truncate max-w-[60px]">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[220px] flex flex-col items-center justify-center text-muted-foreground">
                <ReceiptText className="w-10 h-10 mb-2 text-muted-foreground/30" />
                <p className="text-sm">No expenses yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shipments by Region */}
        <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">By Region</CardTitle>
            <CardDescription>Shipment origins</CardDescription>
          </CardHeader>
          <CardContent>
            {regionChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={regionChartData} layout="vertical" barCategoryGap="25%">
                  <defs>
                    <linearGradient id="regionBarGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#F59E0B"/>
                      <stop offset="100%" stopColor="#FBBF24"/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} horizontal={false} />
                  <XAxis 
                    type="number" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={55}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="shipments" 
                    fill="url(#regionBarGradient)"
                    radius={[0, 6, 6, 0]}
                    name="Shipments"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex flex-col items-center justify-center text-muted-foreground">
                <MapPinned className="w-10 h-10 mb-2 text-muted-foreground/30" />
                <p className="text-sm">No data yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Employee Performance & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <EmployeePerformanceInsights />
        <EmployeeLeaderboard />
      </div>

      {/* Live Activity Feed */}
      <div className="mb-8">
        <LiveActivityFeed />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Shipments */}
        <Card className="lg:col-span-2 shadow-xl border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-semibold">Recent Shipments</CardTitle>
              <CardDescription>Latest activity</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-accent hover:text-accent/80" asChild>
              <Link to="/admin/shipments">
                View all
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {stats.recentShipments.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <PackageSearch className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground font-medium">No shipments yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Your shipments will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentShipments.map((shipment: any) => (
                  <div 
                    key={shipment.id} 
                    className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all duration-200 border border-transparent hover:border-border/50 group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Plane className="w-6 h-6 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{shipment.tracking_number}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="text-base">{regions.find(r => r.code === shipment.origin_region)?.flag_emoji}</span>
                        <span>{shipment.total_weight_kg}kg</span>
                        <span className="text-muted-foreground/50">•</span>
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
        <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Quick Stats</CardTitle>
            <CardDescription>Key metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between p-3 rounded-xl bg-orange-500/5 border border-orange-500/10 hover:bg-orange-500/10 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Pending Invoices</p>
                  <p className="text-2xl font-bold">{stats.pendingInvoices}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700 hover:bg-orange-500/10" asChild>
                <Link to="/admin/billing">View</Link>
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Net Profit (Est.)</p>
                  <p className="text-2xl font-bold">
                    TZS {(stats.revenue - stats.totalExpenses).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 hover:bg-blue-500/10 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <MapPinned className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Active Regions</p>
                  <p className="text-2xl font-bold">{Object.keys(stats.shipmentsByRegion).length}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        <Button 
          variant="outline" 
          className="h-auto py-5 flex-col gap-3 bg-card/50 border-border/50 hover:bg-accent/5 hover:border-accent/50 hover:shadow-lg transition-all duration-300 group" 
          asChild
        >
          <Link to="/admin/shipments">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <PackageSearch className="w-6 h-6 text-accent" />
            </div>
            <span className="font-medium">View Shipments</span>
          </Link>
        </Button>
        <Button 
          variant="outline" 
          className="h-auto py-5 flex-col gap-3 bg-card/50 border-border/50 hover:bg-accent/5 hover:border-accent/50 hover:shadow-lg transition-all duration-300 group" 
          asChild
        >
          <Link to="/admin/customers">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <UsersRound className="w-6 h-6 text-violet-600" />
            </div>
            <span className="font-medium">Manage Customers</span>
          </Link>
        </Button>
        <Button 
          variant="outline" 
          className="h-auto py-5 flex-col gap-3 bg-card/50 border-border/50 hover:bg-accent/5 hover:border-accent/50 hover:shadow-lg transition-all duration-300 group" 
          asChild
        >
          <Link to="/admin/billing">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BadgeDollarSign className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="font-medium">View Invoices</span>
          </Link>
        </Button>
        <Button 
          variant="outline" 
          className="h-auto py-5 flex-col gap-3 bg-card/50 border-border/50 hover:bg-accent/5 hover:border-accent/50 hover:shadow-lg transition-all duration-300 group" 
          asChild
        >
          <Link to="/admin/expenses">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ReceiptText className="w-6 h-6 text-orange-600" />
            </div>
            <span className="font-medium">Track Expenses</span>
          </Link>
        </Button>
      </div>
    </AdminLayout>
  );
}
