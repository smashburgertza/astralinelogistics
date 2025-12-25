import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';
import { EmployeeExpensesClarification } from '@/components/admin/EmployeeExpensesClarification';
import { RoleBasedWidgets } from '@/components/admin/RoleBasedWidgets';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, Receipt, BadgeDollarSign, TrendingUp, 
  Package, DollarSign, Clock, CheckCircle2 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmployeeCommissions } from '@/hooks/useCommissions';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface EmployeeMetrics {
  estimatesCreated: number;
  estimatesThisMonth: number;
  invoicesIssued: number;
  invoicesThisMonth: number;
  revenueGenerated: number;
  revenueThisMonth: number;
  shipmentsHandled: number;
  shipmentsThisMonth: number;
  monthlyData: Array<{ month: string; estimates: number; invoices: number; revenue: number }>;
  invoicesByStatus: Record<string, number>;
}

const CHART_COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6B7280'];

export default function EmployeeDashboard() {
  const { user, profile } = useAuth();
  const [metrics, setMetrics] = useState<EmployeeMetrics>({
    estimatesCreated: 0,
    estimatesThisMonth: 0,
    invoicesIssued: 0,
    invoicesThisMonth: 0,
    revenueGenerated: 0,
    revenueThisMonth: 0,
    shipmentsHandled: 0,
    shipmentsThisMonth: 0,
    monthlyData: [],
    invoicesByStatus: {},
  });
  const [loading, setLoading] = useState(true);
  const [employeeRole, setEmployeeRole] = useState<string | null>(null);

  const { data: commissions, isLoading: commissionsLoading } = useEmployeeCommissions(user?.id);

  useEffect(() => {
    if (user?.id) {
      fetchMetrics();
      fetchEmployeeRole();
    }
  }, [user?.id]);

  const fetchEmployeeRole = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('user_roles')
      .select('employee_role')
      .eq('user_id', user.id)
      .in('role', ['employee', 'super_admin'])
      .maybeSingle();
    
    setEmployeeRole(data?.employee_role || null);
  };

  const fetchMetrics = async () => {
    if (!user?.id) return;

    try {
      const now = new Date();
      const thisMonthStart = startOfMonth(now);
      const thisMonthEnd = endOfMonth(now);

      // Fetch all data in parallel
      const [estimatesRes, invoicesRes, shipmentsRes] = await Promise.all([
        supabase
          .from('estimates')
          .select('id, created_at, total, status')
          .eq('created_by', user.id),
        supabase
          .from('invoices')
          .select('id, amount, status, paid_at, created_at')
          .eq('created_by', user.id),
        supabase
          .from('shipments')
          .select('id, created_at')
          .eq('created_by', user.id),
      ]);

      const estimates = estimatesRes.data || [];
      const invoices = invoicesRes.data || [];
      const shipments = shipmentsRes.data || [];

      // This month filters
      const thisMonthEstimates = estimates.filter(e => {
        const date = new Date(e.created_at || '');
        return date >= thisMonthStart && date <= thisMonthEnd;
      });

      const thisMonthInvoices = invoices.filter(i => {
        const date = new Date(i.created_at || '');
        return date >= thisMonthStart && date <= thisMonthEnd;
      });

      const thisMonthShipments = shipments.filter(s => {
        const date = new Date(s.created_at || '');
        return date >= thisMonthStart && date <= thisMonthEnd;
      });

      // Calculate revenue from paid invoices
      const paidInvoices = invoices.filter(i => i.status === 'paid');
      const revenueGenerated = paidInvoices.reduce((sum, i) => sum + Number(i.amount), 0);

      const thisMonthPaidInvoices = paidInvoices.filter(i => {
        const date = new Date(i.paid_at || i.created_at || '');
        return date >= thisMonthStart && date <= thisMonthEnd;
      });
      const revenueThisMonth = thisMonthPaidInvoices.reduce((sum, i) => sum + Number(i.amount), 0);

      // Invoices by status
      const invoicesByStatus: Record<string, number> = {};
      invoices.forEach(i => {
        invoicesByStatus[i.status || 'pending'] = (invoicesByStatus[i.status || 'pending'] || 0) + 1;
      });

      // Monthly data for last 6 months
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);

        const monthEstimates = estimates.filter(e => {
          const date = new Date(e.created_at || '');
          return date >= monthStart && date <= monthEnd;
        }).length;

        const monthInvoices = invoices.filter(inv => {
          const date = new Date(inv.created_at || '');
          return date >= monthStart && date <= monthEnd;
        }).length;

        const monthRevenue = paidInvoices.filter(inv => {
          const date = new Date(inv.paid_at || inv.created_at || '');
          return date >= monthStart && date <= monthEnd;
        }).reduce((sum, i) => sum + Number(i.amount), 0);

        monthlyData.push({
          month: format(monthDate, 'MMM'),
          estimates: monthEstimates,
          invoices: monthInvoices,
          revenue: monthRevenue,
        });
      }

      setMetrics({
        estimatesCreated: estimates.length,
        estimatesThisMonth: thisMonthEstimates.length,
        invoicesIssued: invoices.length,
        invoicesThisMonth: thisMonthInvoices.length,
        revenueGenerated,
        revenueThisMonth,
        shipmentsHandled: shipments.length,
        shipmentsThisMonth: thisMonthShipments.length,
        monthlyData,
        invoicesByStatus,
      });
    } catch (error) {
      console.error('Error fetching employee metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Commission stats
  const totalCommissions = commissions?.reduce((sum, c) => sum + c.amount, 0) || 0;
  const pendingCommissions = commissions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0) || 0;
  const paidCommissions = commissions?.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0) || 0;

  const invoiceStatusData = Object.entries(metrics.invoicesByStatus).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value,
  }));

  if (loading) {
    return (
      <AdminLayout title="My Dashboard" subtitle="Loading your performance metrics...">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="My Dashboard" 
      subtitle={`Welcome back, ${profile?.full_name || 'Employee'}! Here's your performance overview.`}
    >
      {/* Primary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Estimates Created"
          value={metrics.estimatesCreated}
          subtitle={`${metrics.estimatesThisMonth} this month`}
          icon={FileText}
          variant="primary"
        />
        <StatCard
          title="Invoices Issued"
          value={metrics.invoicesIssued}
          subtitle={`${metrics.invoicesThisMonth} this month`}
          icon={Receipt}
          variant="navy"
        />
        <StatCard
          title="Revenue Generated"
          value={`$${metrics.revenueGenerated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={`$${metrics.revenueThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} this month`}
          icon={BadgeDollarSign}
          variant="success"
        />
        <StatCard
          title="Shipments Handled"
          value={metrics.shipmentsHandled}
          subtitle={`${metrics.shipmentsThisMonth} this month`}
          icon={Package}
          variant="warning"
        />
      </div>

      {/* Role-Based Widget */}
      {user?.id && (
        <RoleBasedWidgets employeeRole={employeeRole} userId={user.id} />
      )}

      {/* Commission Stats */}
      <Card className="mb-8 shadow-lg border-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            My Commissions
          </CardTitle>
          <CardDescription>Your earnings from commissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-background rounded-lg border">
              <p className="text-sm text-muted-foreground mb-1">Total Earned</p>
              <p className="text-2xl font-bold text-foreground">
                ${totalCommissions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-center p-4 bg-background rounded-lg border">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="h-4 w-4 text-amber-500" />
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
              <p className="text-2xl font-bold text-amber-600">
                ${pendingCommissions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-center p-4 bg-background rounded-lg border">
              <div className="flex items-center justify-center gap-1 mb-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <p className="text-sm text-muted-foreground">Paid Out</p>
              </div>
              <p className="text-2xl font-bold text-emerald-600">
                ${paidCommissions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Needing Clarification */}
      {user?.id && (
        <div className="mb-8">
          <EmployeeExpensesClarification userId={user.id} />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Activity Trend */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Activity Trend</CardTitle>
            <CardDescription>Your estimates & invoices over time</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={metrics.monthlyData}>
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
                  <Legend />
                  <Bar 
                    dataKey="estimates" 
                    fill="#1F8ECE" 
                    radius={[6, 6, 0, 0]}
                    name="Estimates"
                  />
                  <Bar 
                    dataKey="invoices" 
                    fill="#F7BB3A" 
                    radius={[6, 6, 0, 0]}
                    name="Invoices"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                No activity data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue Trend */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Revenue Generated</CardTitle>
            <CardDescription>Your revenue contribution over time</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={metrics.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(value) => `$${value}`} />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={{ fill: '#10B981' }}
                    name="Revenue"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                No revenue data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Status Distribution */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Invoice Status</CardTitle>
            <CardDescription>Distribution of your invoices</CardDescription>
          </CardHeader>
          <CardContent>
            {invoiceStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={invoiceStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {invoiceStatusData.map((_, index) => (
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
                No invoices yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Commissions */}
        <Card className="lg:col-span-2 shadow-lg border-0">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Recent Commissions</CardTitle>
            <CardDescription>Your latest commission earnings</CardDescription>
          </CardHeader>
          <CardContent>
            {commissionsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : commissions && commissions.length > 0 ? (
              <div className="space-y-3">
                {commissions.slice(0, 5).map((commission) => (
                  <div 
                    key={commission.id} 
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {commission.invoices?.invoice_number || 'Commission'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {commission.invoices?.customers?.name || 'Customer'}
                        {' • '}
                        {format(new Date(commission.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        ${commission.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <Badge 
                        variant={commission.status === 'paid' ? 'default' : 'secondary'}
                        className={commission.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}
                      >
                        {commission.status === 'paid' ? 'Paid' : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No commissions yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
