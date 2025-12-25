import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, subMonths, startOfDay, endOfDay, parseISO, isWithinInterval, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { 
  Download, Calendar, TrendingUp, Package, DollarSign, Users, 
  FileSpreadsheet, ArrowUpRight, ArrowDownRight, Filter, RefreshCw,
  BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon, MapPin
} from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { REGIONS, type Region } from '@/lib/constants';
import { EXPENSE_CATEGORIES } from '@/hooks/useExpenses';
import { toast } from 'sonner';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, ComposedChart
} from 'recharts';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

const DATE_PRESETS = [
  { label: 'Last 7 days', value: '7d', days: 7 },
  { label: 'Last 30 days', value: '30d', days: 30 },
  { label: 'Last 90 days', value: '90d', days: 90 },
  { label: 'Last 6 months', value: '6m', days: 180 },
  { label: 'Last 12 months', value: '12m', days: 365 },
  { label: 'Custom', value: 'custom', days: 0 },
];

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
              {item.dataKey === 'revenue' || item.dataKey === 'expenses' || item.dataKey === 'profit'
                ? `$${item.value?.toLocaleString() ?? 0}` 
                : item.value?.toLocaleString() ?? 0}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const [datePreset, setDatePreset] = useState('30d');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day');

  // Calculate date range based on preset
  const effectiveDateRange = useMemo(() => {
    if (datePreset === 'custom' && dateRange?.from && dateRange?.to) {
      return { from: startOfDay(dateRange.from), to: endOfDay(dateRange.to) };
    }
    const preset = DATE_PRESETS.find(p => p.value === datePreset);
    const days = preset?.days || 30;
    return {
      from: startOfDay(subDays(new Date(), days)),
      to: endOfDay(new Date()),
    };
  }, [datePreset, dateRange]);

  // Fetch all data
  const { data: shipments, isLoading: shipmentsLoading } = useQuery({
    queryKey: ['analytics-shipments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipments')
        .select('id, status, origin_region, total_weight_kg, created_at, collected_at, delivered_at, customer_id')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['analytics-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, amount, status, created_at, paid_at, currency, invoice_type, customer_id')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ['analytics-customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, created_at')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ['analytics-expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('id, amount, category, created_at, status, region')
        .eq('status', 'approved')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: parcels, isLoading: parcelsLoading } = useQuery({
    queryKey: ['analytics-parcels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parcels')
        .select('id, weight_kg, created_at, picked_up_at, shipment_id')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const isLoading = shipmentsLoading || invoicesLoading || customersLoading || expensesLoading || parcelsLoading;

  // Filter data by date range
  const filteredData = useMemo(() => {
    const filterByDate = <T extends { created_at?: string | null }>(items: T[] | null | undefined) => {
      if (!items) return [];
      return items.filter(item => {
        if (!item.created_at) return false;
        const date = parseISO(item.created_at);
        return isWithinInterval(date, { start: effectiveDateRange.from, end: effectiveDateRange.to });
      });
    };

    return {
      shipments: filterByDate(shipments),
      invoices: filterByDate(invoices),
      customers: filterByDate(customers),
      expenses: filterByDate(expenses),
      parcels: filterByDate(parcels),
    };
  }, [shipments, invoices, customers, expenses, parcels, effectiveDateRange]);

  // Calculate time series data
  const timeSeriesData = useMemo(() => {
    const { from, to } = effectiveDateRange;
    
    let intervals: Date[];
    let formatStr: string;
    
    if (granularity === 'day') {
      intervals = eachDayOfInterval({ start: from, end: to });
      formatStr = 'MMM d';
    } else if (granularity === 'week') {
      intervals = eachWeekOfInterval({ start: from, end: to });
      formatStr = "'W'w MMM";
    } else {
      intervals = eachMonthOfInterval({ start: from, end: to });
      formatStr = 'MMM yyyy';
    }

    return intervals.map(interval => {
      let periodStart: Date;
      let periodEnd: Date;

      if (granularity === 'day') {
        periodStart = startOfDay(interval);
        periodEnd = endOfDay(interval);
      } else if (granularity === 'week') {
        periodStart = startOfWeek(interval);
        periodEnd = endOfWeek(interval);
      } else {
        periodStart = startOfMonth(interval);
        periodEnd = endOfMonth(interval);
      }

      const periodShipments = filteredData.shipments.filter(s => {
        const date = parseISO(s.created_at || '');
        return isWithinInterval(date, { start: periodStart, end: periodEnd });
      });

      const periodInvoices = filteredData.invoices.filter(i => {
        const date = parseISO(i.paid_at || i.created_at || '');
        return isWithinInterval(date, { start: periodStart, end: periodEnd });
      });

      const periodExpenses = filteredData.expenses.filter(e => {
        const date = parseISO(e.created_at || '');
        return isWithinInterval(date, { start: periodStart, end: periodEnd });
      });

      const periodCustomers = filteredData.customers.filter(c => {
        const date = parseISO(c.created_at || '');
        return isWithinInterval(date, { start: periodStart, end: periodEnd });
      });

      const revenue = periodInvoices
        .filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + (i.amount || 0), 0);

      const expenseTotal = periodExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

      return {
        period: format(interval, formatStr),
        fullDate: format(interval, 'PPP'),
        shipments: periodShipments.length,
        weight: periodShipments.reduce((sum, s) => sum + (s.total_weight_kg || 0), 0),
        revenue,
        expenses: expenseTotal,
        profit: revenue - expenseTotal,
        customers: periodCustomers.length,
        delivered: periodShipments.filter(s => s.status === 'delivered').length,
      };
    });
  }, [filteredData, effectiveDateRange, granularity]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalShipments = filteredData.shipments.length;
    const totalWeight = filteredData.shipments.reduce((sum, s) => sum + (s.total_weight_kg || 0), 0);
    const totalRevenue = filteredData.invoices
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + (i.amount || 0), 0);
    const totalExpenses = filteredData.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalCustomers = filteredData.customers.length;
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const avgRevenuePerShipment = totalShipments > 0 ? totalRevenue / totalShipments : 0;
    const deliveredShipments = filteredData.shipments.filter(s => s.status === 'delivered').length;
    const deliveryRate = totalShipments > 0 ? (deliveredShipments / totalShipments) * 100 : 0;

    return {
      totalShipments,
      totalWeight,
      totalRevenue,
      totalExpenses,
      totalCustomers,
      netProfit,
      profitMargin,
      avgRevenuePerShipment,
      deliveredShipments,
      deliveryRate,
    };
  }, [filteredData]);

  // Region breakdown
  const regionData = useMemo(() => {
    const regionCounts: Record<string, { shipments: number; weight: number; revenue: number }> = {};
    
    filteredData.shipments.forEach(s => {
      const region = s.origin_region || 'unknown';
      if (!regionCounts[region]) {
        regionCounts[region] = { shipments: 0, weight: 0, revenue: 0 };
      }
      regionCounts[region].shipments += 1;
      regionCounts[region].weight += s.total_weight_kg || 0;
    });

    // Add revenue by matching shipments to invoices
    filteredData.invoices
      .filter(i => i.status === 'paid')
      .forEach(invoice => {
        const shipment = filteredData.shipments.find(s => s.customer_id === invoice.customer_id);
        if (shipment) {
          const region = shipment.origin_region || 'unknown';
          if (regionCounts[region]) {
            regionCounts[region].revenue += invoice.amount || 0;
          }
        }
      });

    return Object.entries(regionCounts).map(([key, value]) => ({
      name: REGIONS[key as Region]?.label || key.charAt(0).toUpperCase() + key.slice(1),
      region: key,
      ...value,
    }));
  }, [filteredData]);

  // Expense breakdown
  const expenseBreakdown = useMemo(() => {
    const categoryCounts: Record<string, number> = {};
    filteredData.expenses.forEach(e => {
      const category = e.category || 'other';
      categoryCounts[category] = (categoryCounts[category] || 0) + (e.amount || 0);
    });
    return Object.entries(categoryCounts)
      .map(([key, value]) => ({
        name: EXPENSE_CATEGORIES.find(c => c.value === key)?.label || key,
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  // Status breakdown
  const statusBreakdown = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    filteredData.shipments.forEach(s => {
      const status = s.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    return Object.entries(statusCounts).map(([name, value]) => ({
      name: name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value,
    }));
  }, [filteredData]);

  // Export to CSV
  const exportToCSV = (type: 'shipments' | 'revenue' | 'expenses' | 'summary') => {
    let csvContent = '';
    let filename = '';

    if (type === 'shipments') {
      csvContent = 'Period,Shipments,Weight (kg),Delivered\n';
      timeSeriesData.forEach(row => {
        csvContent += `"${row.period}",${row.shipments},${row.weight.toFixed(2)},${row.delivered}\n`;
      });
      filename = `shipments-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    } else if (type === 'revenue') {
      csvContent = 'Period,Revenue ($),Expenses ($),Profit ($)\n';
      timeSeriesData.forEach(row => {
        csvContent += `"${row.period}",${row.revenue.toFixed(2)},${row.expenses.toFixed(2)},${row.profit.toFixed(2)}\n`;
      });
      filename = `revenue-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    } else if (type === 'expenses') {
      csvContent = 'Category,Amount ($)\n';
      expenseBreakdown.forEach(row => {
        csvContent += `"${row.name}",${row.value.toFixed(2)}\n`;
      });
      filename = `expenses-breakdown-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    } else {
      csvContent = 'Metric,Value\n';
      csvContent += `Total Shipments,${stats.totalShipments}\n`;
      csvContent += `Total Weight (kg),${stats.totalWeight.toFixed(2)}\n`;
      csvContent += `Total Revenue ($),${stats.totalRevenue.toFixed(2)}\n`;
      csvContent += `Total Expenses ($),${stats.totalExpenses.toFixed(2)}\n`;
      csvContent += `Net Profit ($),${stats.netProfit.toFixed(2)}\n`;
      csvContent += `Profit Margin (%),${stats.profitMargin.toFixed(2)}\n`;
      csvContent += `Total Customers,${stats.totalCustomers}\n`;
      csvContent += `Delivery Rate (%),${stats.deliveryRate.toFixed(2)}\n`;
      filename = `analytics-summary-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    toast.success(`Exported ${filename}`);
  };

  if (isLoading) {
    return (
      <AdminLayout title="Analytics" subtitle="Detailed reports with date range filters">
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
    <AdminLayout title="Analytics" subtitle="Detailed reports with date range filters and export">
      <div className="space-y-6">
        {/* Filters Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Date Range:</span>
                </div>
                
                <Select value={datePreset} onValueChange={setDatePreset}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_PRESETS.map(preset => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {datePreset === 'custom' && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Calendar className="w-4 h-4" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, 'LLL dd')} - {format(dateRange.to, 'LLL dd, y')}
                            </>
                          ) : (
                            format(dateRange.from, 'LLL dd, y')
                          )
                        ) : (
                          'Pick dates'
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="range"
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                )}

                <Select value={granularity} onValueChange={(v: 'day' | 'week' | 'month') => setGranularity(v)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Daily</SelectItem>
                    <SelectItem value="week">Weekly</SelectItem>
                    <SelectItem value="month">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => exportToCSV('summary')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export Summary
                </Button>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <Badge variant="secondary" className="text-xs">
                {format(effectiveDateRange.from, 'MMM d, yyyy')} - {format(effectiveDateRange.to, 'MMM d, yyyy')}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {timeSeriesData.length} data points
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Shipments</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalShipments.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalWeight.toLocaleString()} kg total weight
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                ${stats.avgRevenuePerShipment.toFixed(2)} avg per shipment
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", stats.netProfit >= 0 ? "text-green-600" : "text-red-600")}>
                ${Math.abs(stats.netProfit).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.profitMargin.toFixed(1)}% profit margin
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCustomers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {stats.deliveryRate.toFixed(1)}% delivery rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="overview" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="overview" className="gap-2">
                <LineChartIcon className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="shipments" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Shipments
              </TabsTrigger>
              <TabsTrigger value="revenue" className="gap-2">
                <DollarSign className="w-4 h-4" />
                Revenue
              </TabsTrigger>
              <TabsTrigger value="regions" className="gap-2">
                <MapPin className="w-4 h-4" />
                Regions
              </TabsTrigger>
              <TabsTrigger value="breakdown" className="gap-2">
                <PieChartIcon className="w-4 h-4" />
                Breakdown
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Performance Overview</CardTitle>
                  <CardDescription>Revenue, expenses, and profit trends</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => exportToCSV('revenue')}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={timeSeriesData}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis 
                      dataKey="period" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      fill="url(#revenueGrad)"
                      name="Revenue"
                    />
                    <Bar dataKey="expenses" fill="#F59E0B" name="Expenses" radius={[4, 4, 0, 0]} />
                    <Line 
                      type="monotone" 
                      dataKey="profit" 
                      stroke="#3B82F6" 
                      strokeWidth={2.5}
                      dot={{ fill: '#3B82F6', r: 4 }}
                      name="Profit"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shipments Tab */}
          <TabsContent value="shipments" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Shipment Volume</CardTitle>
                  <CardDescription>Number of shipments and weight over time</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => exportToCSV('shipments')}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis 
                      dataKey="period" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <YAxis 
                      yAxisId="left"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      tickFormatter={(value) => `${value}kg`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="shipments" fill="#3B82F6" name="Shipments" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="weight" stroke="#8B5CF6" strokeWidth={2} name="Weight (kg)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Revenue generated over the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={timeSeriesData}>
                    <defs>
                      <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis 
                      dataKey="period" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#10B981" 
                      strokeWidth={2.5}
                      fill="url(#revGradient)"
                      name="Revenue"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Regions Tab */}
          <TabsContent value="regions" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Shipments by Region</CardTitle>
                  <CardDescription>Distribution across origin regions</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={regionData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis type="number" />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={80}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="shipments" fill="#3B82F6" name="Shipments" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Weight by Region</CardTitle>
                  <CardDescription>Total weight shipped from each region</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={regionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="weight"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {regionData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value.toFixed(2)} kg`} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Breakdown Tab */}
          <TabsContent value="breakdown" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Expense Breakdown</CardTitle>
                    <CardDescription>Approved expenses by category</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => exportToCSV('expenses')}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={expenseBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                      >
                        {expenseBreakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Shipment Status</CardTitle>
                  <CardDescription>Current status distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {statusBreakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
