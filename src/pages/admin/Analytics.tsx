import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, subMonths, startOfDay, endOfDay, parseISO, isWithinInterval, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, getMonth, differenceInDays, subYears } from 'date-fns';
import { 
  Download, Calendar, TrendingUp, TrendingDown, Package, DollarSign, Users, 
  ArrowUpRight, ArrowDownRight, Filter, BarChart3, PieChart as PieChartIcon, 
  LineChart as LineChartIcon, MapPin, Crown, Target, Zap, Award, Wallet, Scale,
  Coins, Receipt, PiggyBank, CalendarIcon, GitCompare
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { supabase } from '@/integrations/supabase/client';
import { useRegions, regionsToMap } from '@/hooks/useRegions';
import { useExchangeRates, convertToTZS } from '@/hooks/useExchangeRates';
import { EXPENSE_CATEGORIES } from '@/hooks/useExpenses';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { toast } from 'sonner';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, ComposedChart
} from 'recharts';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

// Color schemes
const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];
const PIE_COLORS = ['#D4AF37', '#1E3A5F', '#4A90A4', '#7C9885', '#8B6914', '#2C5282'];
const REVENUE_COLORS = ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#D1FAE5'];
const EXPENSE_COLORS = ['#F59E0B', '#FBBF24', '#FCD34D', '#FDE68A', '#FEF3C7'];
const REGION_COLORS: Record<string, string> = {
  europe: '#3B82F6', uk: '#8B5CF6', usa: '#EC4899',
  dubai: '#F59E0B', china: '#EF4444', india: '#10B981',
};

type DatePreset = 'all' | 'today' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';
type ComparisonMode = 'pop' | 'yoy';

const DATE_PRESETS: { label: string; value: DatePreset }[] = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'Last 7 Days', value: 'last7' },
  { label: 'Last 30 Days', value: 'last30' },
  { label: 'This Month', value: 'thisMonth' },
  { label: 'Last Month', value: 'lastMonth' },
  { label: 'This Year', value: 'thisYear' },
  { label: 'Custom', value: 'custom' },
];

// Tooltip components
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
              {item.dataKey === 'revenue' || item.dataKey === 'expenses' || item.dataKey === 'profit' || item.dataKey === 'netProfit'
                ? `TZS ${item.value?.toLocaleString() ?? 0}` 
                : item.value?.toLocaleString() ?? 0}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const CurrencyTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background/95 backdrop-blur-md border rounded-lg p-3 shadow-xl">
        <p className="font-semibold">{data.currency}</p>
        <p className="text-sm text-muted-foreground">
          {data.symbol}{data.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
        <p className="text-xs font-medium" style={{ color: data.type === 'revenue' ? '#10B981' : '#F59E0B' }}>
          ≈ TZS {data.amountInTzs?.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

// Helper to get date range
const getDateRange = (preset: DatePreset, customFrom?: Date, customTo?: Date): { from: Date | null; to: Date | null } => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  switch (preset) {
    case 'all': return { from: null, to: null };
    case 'today':
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      return { from: startOfToday, to: today };
    case 'last7': return { from: subDays(today, 7), to: today };
    case 'last30': return { from: subDays(today, 30), to: today };
    case 'thisMonth': return { from: startOfMonth(today), to: endOfMonth(today) };
    case 'lastMonth':
      const lastMonth = subMonths(today, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    case 'thisYear': return { from: new Date(today.getFullYear(), 0, 1), to: today };
    case 'custom': return { from: customFrom || null, to: customTo || null };
    default: return { from: null, to: null };
  }
};

export default function AnalyticsPage() {
  const [datePreset, setDatePreset] = useState<DatePreset>('thisMonth');
  const [customFromDate, setCustomFromDate] = useState<Date>();
  const [customToDate, setCustomToDate] = useState<Date>();
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('pop');
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('month');

  const { data: regions } = useRegions();
  const { data: exchangeRates } = useExchangeRates();

  const dateRange = useMemo(() => getDateRange(datePreset, customFromDate, customToDate), [datePreset, customFromDate, customToDate]);

  // Data fetching
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
    queryKey: ['analytics-expenses-approved'],
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

  const isLoading = shipmentsLoading || invoicesLoading || customersLoading || expensesLoading;

  // Build rate map for currency conversion
  const rateMap = useMemo(() => {
    const map = new Map<string, number>();
    map.set('TZS', 1);
    exchangeRates?.forEach(r => map.set(r.currency_code, r.rate_to_tzs));
    return map;
  }, [exchangeRates]);

  const convertToBaseCurrency = (amount: number, currency: string): number => {
    const rate = rateMap.get(currency) || 1;
    return amount * rate;
  };

  const formatTZS = (amount: number): string => {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  };

  // Filter data by date range
  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    if (!dateRange.from && !dateRange.to) return invoices;
    return invoices.filter(invoice => {
      const invoiceDate = invoice.paid_at ? parseISO(invoice.paid_at) : parseISO(invoice.created_at || '');
      if (!dateRange.from || !dateRange.to) return true;
      return isWithinInterval(invoiceDate, { start: dateRange.from, end: dateRange.to });
    });
  }, [invoices, dateRange]);

  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];
    if (!dateRange.from && !dateRange.to) return expenses;
    return expenses.filter(expense => {
      const expenseDate = parseISO(expense.created_at || '');
      if (!dateRange.from || !dateRange.to) return true;
      return isWithinInterval(expenseDate, { start: dateRange.from, end: dateRange.to });
    });
  }, [expenses, dateRange]);

  const filteredShipments = useMemo(() => {
    if (!shipments) return [];
    if (!dateRange.from && !dateRange.to) return shipments;
    return shipments.filter(shipment => {
      const date = parseISO(shipment.created_at || '');
      if (!dateRange.from || !dateRange.to) return true;
      return isWithinInterval(date, { start: dateRange.from, end: dateRange.to });
    });
  }, [shipments, dateRange]);

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    if (!dateRange.from && !dateRange.to) return customers;
    return customers.filter(customer => {
      const date = parseISO(customer.created_at || '');
      if (!dateRange.from || !dateRange.to) return true;
      return isWithinInterval(date, { start: dateRange.from, end: dateRange.to });
    });
  }, [customers, dateRange]);

  // Revenue by currency
  const revenueBreakdown = useMemo(() => {
    if (!filteredInvoices || !exchangeRates) return [];
    const paidInvoices = filteredInvoices.filter(i => i.status === 'paid');
    const byCurrency: Record<string, number> = {};
    paidInvoices.forEach(invoice => {
      const currency = invoice.currency || 'USD';
      byCurrency[currency] = (byCurrency[currency] || 0) + Number(invoice.amount);
    });
    const breakdown = Object.entries(byCurrency).map(([currency, amount]) => ({
      currency, amount,
      amountInTzs: convertToTZS(amount, currency, exchangeRates),
      symbol: CURRENCY_SYMBOLS[currency] || currency,
      type: 'revenue' as const,
    }));
    const total = breakdown.reduce((sum, item) => sum + item.amountInTzs, 0);
    return breakdown.map(item => ({
      ...item,
      percentage: total > 0 ? (item.amountInTzs / total) * 100 : 0,
    })).sort((a, b) => b.amountInTzs - a.amountInTzs);
  }, [filteredInvoices, exchangeRates]);

  // Expenses by currency
  const expenseBreakdown = useMemo(() => {
    if (!filteredExpenses || !exchangeRates) return [];
    const byCurrency: Record<string, number> = {};
    filteredExpenses.forEach(expense => {
      const currency = expense.currency || 'USD';
      byCurrency[currency] = (byCurrency[currency] || 0) + Number(expense.amount);
    });
    const breakdown = Object.entries(byCurrency).map(([currency, amount]) => ({
      currency, amount,
      amountInTzs: convertToTZS(amount, currency, exchangeRates),
      symbol: CURRENCY_SYMBOLS[currency] || currency,
      type: 'expense' as const,
    }));
    const total = breakdown.reduce((sum, item) => sum + item.amountInTzs, 0);
    return breakdown.map(item => ({
      ...item,
      percentage: total > 0 ? (item.amountInTzs / total) * 100 : 0,
    })).sort((a, b) => b.amountInTzs - a.amountInTzs);
  }, [filteredExpenses, exchangeRates]);

  // Expenses by category
  const expensesByCategory = useMemo(() => {
    if (!filteredExpenses) return [];
    const categoryCounts: Record<string, number> = {};
    filteredExpenses.forEach(e => {
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
  }, [filteredExpenses, rateMap]);

  // Status distribution
  const statusDistribution = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    filteredShipments.forEach(s => {
      const status = s.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    return Object.entries(statusCounts).map(([name, value]) => ({
      name: name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value,
    }));
  }, [filteredShipments]);

  // Region distribution
  const regionDistribution = useMemo(() => {
    const regionCounts: Record<string, number> = {};
    filteredShipments.forEach(s => {
      const region = s.origin_region || 'unknown';
      regionCounts[region] = (regionCounts[region] || 0) + 1;
    });
    return Object.entries(regionCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  }, [filteredShipments]);

  // Calculate totals
  const totalRevenueTzs = revenueBreakdown.reduce((sum, item) => sum + item.amountInTzs, 0);
  const totalExpensesTzs = expenseBreakdown.reduce((sum, item) => sum + item.amountInTzs, 0);
  const netProfitTzs = totalRevenueTzs - totalExpensesTzs;
  const profitMargin = totalRevenueTzs > 0 ? (netProfitTzs / totalRevenueTzs) * 100 : 0;

  // Comparison period calculations
  const previousPeriodRange = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return { from: null, to: null };
    const daysDiff = differenceInDays(dateRange.to, dateRange.from);
    const prevTo = subDays(dateRange.from, 1);
    const prevFrom = subDays(prevTo, daysDiff);
    return { from: prevFrom, to: prevTo };
  }, [dateRange]);

  const yoyPeriodRange = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return { from: null, to: null };
    return { from: subYears(dateRange.from, 1), to: subYears(dateRange.to, 1) };
  }, [dateRange]);

  const comparisonRange = comparisonMode === 'yoy' ? yoyPeriodRange : previousPeriodRange;

  // Previous period totals
  const prevFilteredInvoices = useMemo(() => {
    if (!invoices || !comparisonRange.from || !comparisonRange.to) return [];
    return invoices.filter(invoice => {
      const invoiceDate = invoice.paid_at ? parseISO(invoice.paid_at) : parseISO(invoice.created_at || '');
      return isWithinInterval(invoiceDate, { start: comparisonRange.from!, end: comparisonRange.to! });
    });
  }, [invoices, comparisonRange]);

  const prevFilteredExpenses = useMemo(() => {
    if (!expenses || !comparisonRange.from || !comparisonRange.to) return [];
    return expenses.filter(expense => {
      const expenseDate = parseISO(expense.created_at || '');
      return isWithinInterval(expenseDate, { start: comparisonRange.from!, end: comparisonRange.to! });
    });
  }, [expenses, comparisonRange]);

  const prevTotalRevenueTzs = useMemo(() => {
    if (!prevFilteredInvoices || !exchangeRates) return 0;
    return prevFilteredInvoices
      .filter(i => i.status === 'paid')
      .reduce((sum, inv) => sum + convertToTZS(Number(inv.amount), inv.currency || 'USD', exchangeRates), 0);
  }, [prevFilteredInvoices, exchangeRates]);

  const prevTotalExpensesTzs = useMemo(() => {
    if (!prevFilteredExpenses || !exchangeRates) return 0;
    return prevFilteredExpenses
      .reduce((sum, exp) => sum + convertToTZS(Number(exp.amount), exp.currency || 'USD', exchangeRates), 0);
  }, [prevFilteredExpenses, exchangeRates]);

  const prevNetProfitTzs = prevTotalRevenueTzs - prevTotalExpensesTzs;
  const prevProfitMargin = prevTotalRevenueTzs > 0 ? (prevNetProfitTzs / prevTotalRevenueTzs) * 100 : 0;

  const calculateGrowth = (current: number, previous: number): number | null => {
    if (previous === 0) return current > 0 ? 100 : null;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  const revenueGrowth = calculateGrowth(totalRevenueTzs, prevTotalRevenueTzs);
  const expenseGrowth = calculateGrowth(totalExpensesTzs, prevTotalExpensesTzs);
  const profitGrowth = calculateGrowth(netProfitTzs, prevNetProfitTzs);
  const marginChange = profitMargin - prevProfitMargin;

  // Monthly data for charts
  const monthlyData = useMemo(() => {
    if (!shipments || !invoices || !customers || !expenses) return [];
    const now = new Date();
    const sixMonthsAgo = subMonths(now, 5);
    const months = eachMonthOfInterval({ start: startOfMonth(sixMonthsAgo), end: endOfMonth(now) });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthShipments = shipments.filter(s => {
        const date = parseISO(s.created_at || '');
        return isWithinInterval(date, { start: monthStart, end: monthEnd });
      });

      const monthInvoices = invoices.filter(i => {
        const date = parseISO(i.created_at || '');
        return isWithinInterval(date, { start: monthStart, end: monthEnd });
      });

      const monthCustomers = customers.filter(c => {
        const date = parseISO(c.created_at || '');
        return isWithinInterval(date, { start: monthStart, end: monthEnd });
      });

      const monthExpenses = expenses.filter(e => {
        const date = parseISO(e.created_at || '');
        return isWithinInterval(date, { start: monthStart, end: monthEnd });
      });

      const revenue = monthInvoices
        .filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + convertToBaseCurrency(i.amount || 0, i.currency || 'USD'), 0);

      const pending = monthInvoices
        .filter(i => i.status === 'pending')
        .reduce((sum, i) => sum + convertToBaseCurrency(i.amount || 0, i.currency || 'USD'), 0);

      const totalExpenses = monthExpenses.reduce((sum, e) => 
        sum + convertToBaseCurrency(e.amount || 0, e.currency || 'USD'), 0);

      return {
        month: format(month, 'MMM'),
        shortMonth: format(month, 'MMM'),
        fullMonth: format(month, 'MMMM yyyy'),
        shipments: monthShipments.length,
        weight: monthShipments.reduce((sum, s) => sum + (s.total_weight_kg || 0), 0),
        revenue,
        pending,
        expenses: totalExpenses,
        netProfit: revenue - totalExpenses,
        profit: revenue - totalExpenses,
        customers: monthCustomers.length,
        delivered: monthShipments.filter(s => s.status === 'delivered').length,
      };
    });
  }, [shipments, invoices, customers, expenses, rateMap]);

  // Summary stats
  const stats = useMemo(() => {
    const totalShipments = filteredShipments.length;
    const totalWeight = filteredShipments.reduce((sum, s) => sum + (s.total_weight_kg || 0), 0);
    const totalCustomersCount = filteredCustomers.length;
    
    const currentMonth = monthlyData[monthlyData.length - 1];
    const previousMonth = monthlyData[monthlyData.length - 2];

    const shipmentGrowth = previousMonth?.shipments
      ? ((currentMonth?.shipments - previousMonth.shipments) / previousMonth.shipments) * 100 : 0;
    const customerGrowth = previousMonth?.customers
      ? ((currentMonth?.customers - previousMonth.customers) / previousMonth.customers) * 100 : 0;

    return {
      totalShipments,
      totalWeight,
      totalCustomers: totalCustomersCount,
      shipmentGrowth,
      customerGrowth,
    };
  }, [filteredShipments, filteredCustomers, monthlyData]);

  const GrowthBadge = ({ growth, inverted = false }: { growth: number | null; inverted?: boolean }) => {
    if (growth === null) return null;
    const isPositive = inverted ? growth < 0 : growth > 0;
    const isNegative = inverted ? growth > 0 : growth < 0;
    return (
      <Badge variant="outline" className={cn(
        "text-xs font-medium ml-2",
        isPositive && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
        isNegative && "bg-red-500/10 text-red-600 border-red-500/30",
        !isPositive && !isNegative && "bg-muted text-muted-foreground"
      )}>
        {growth > 0 ? '+' : ''}{growth.toFixed(1)}%
      </Badge>
    );
  };

  const getDateRangeLabel = () => {
    if (datePreset === 'all') return 'All Time';
    if (datePreset === 'custom' && customFromDate && customToDate) {
      return `${format(customFromDate, 'MMM d, yyyy')} - ${format(customToDate, 'MMM d, yyyy')}`;
    }
    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`;
    }
    return DATE_PRESETS.find(p => p.value === datePreset)?.label || '';
  };

  const getComparisonLabel = () => comparisonMode === 'yoy' ? 'same period last year' : 'prev period';

  if (isLoading) {
    return (
      <AdminLayout title="Analytics" subtitle="Financial and operational insights">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
          <Skeleton className="h-[400px]" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Analytics" subtitle="Financial and operational insights">
      <div className="space-y-6">
        {/* Date Range Filter */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {DATE_PRESETS.filter(p => p.value !== 'custom').map((preset) => (
                  <Button
                    key={preset.value}
                    variant={datePreset === preset.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDatePreset(preset.value)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2 items-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={datePreset === 'custom' ? 'default' : 'outline'} size="sm">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customFromDate ? format(customFromDate, 'MMM d, yyyy') : 'From'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <CalendarComponent
                      mode="single"
                      selected={customFromDate}
                      onSelect={(date) => { setCustomFromDate(date); setDatePreset('custom'); }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">to</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={datePreset === 'custom' ? 'default' : 'outline'} size="sm">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customToDate ? format(customToDate, 'MMM d, yyyy') : 'To'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <CalendarComponent
                      mode="single"
                      selected={customToDate}
                      onSelect={(date) => { setCustomToDate(date); setDatePreset('custom'); }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                Showing: <span className="font-medium text-foreground">{getDateRangeLabel()}</span>
              </div>
              {datePreset !== 'all' && (
                <div className="flex items-center gap-2">
                  <GitCompare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Compare:</span>
                  <ToggleGroup type="single" value={comparisonMode} onValueChange={(v) => v && setComparisonMode(v as ComparisonMode)} size="sm">
                    <ToggleGroupItem value="pop" className="text-xs px-3">Period over Period</ToggleGroupItem>
                    <ToggleGroupItem value="yoy" className="text-xs px-3">Year over Year</ToggleGroupItem>
                  </ToggleGroup>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center">
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    {datePreset !== 'all' && <GrowthBadge growth={revenueGrowth} />}
                  </div>
                  <p className="text-2xl font-bold text-emerald-600">TZS {formatTZS(totalRevenueTzs)}</p>
                  {datePreset !== 'all' && prevTotalRevenueTzs > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">vs TZS {formatTZS(prevTotalRevenueTzs)} {getComparisonLabel()}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <TrendingDown className="h-6 w-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center">
                    <p className="text-sm text-muted-foreground">Total Expenses</p>
                    {datePreset !== 'all' && <GrowthBadge growth={expenseGrowth} inverted />}
                  </div>
                  <p className="text-2xl font-bold text-amber-600">TZS {formatTZS(totalExpensesTzs)}</p>
                  {datePreset !== 'all' && prevTotalExpensesTzs > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">vs TZS {formatTZS(prevTotalExpensesTzs)} {getComparisonLabel()}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={cn("bg-gradient-to-br", netProfitTzs >= 0 ? "from-blue-500/10 to-blue-500/5 border-blue-500/20" : "from-red-500/10 to-red-500/5 border-red-500/20")}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", netProfitTzs >= 0 ? "bg-blue-500/20" : "bg-red-500/20")}>
                  <PiggyBank className={cn("h-6 w-6", netProfitTzs >= 0 ? "text-blue-600" : "text-red-600")} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center">
                    <p className="text-sm text-muted-foreground">Net Profit</p>
                    {datePreset !== 'all' && <GrowthBadge growth={profitGrowth} />}
                  </div>
                  <p className={cn("text-2xl font-bold", netProfitTzs >= 0 ? "text-blue-600" : "text-red-600")}>
                    TZS {formatTZS(netProfitTzs)}
                  </p>
                  {datePreset !== 'all' && (prevNetProfitTzs !== 0 || prevTotalRevenueTzs > 0) && (
                    <p className="text-xs text-muted-foreground mt-1">vs TZS {formatTZS(prevNetProfitTzs)} {getComparisonLabel()}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Scale className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center">
                    <p className="text-sm text-muted-foreground">Profit Margin</p>
                    {datePreset !== 'all' && marginChange !== 0 && (
                      <Badge variant="outline" className={cn("text-xs font-medium ml-2", marginChange > 0 && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", marginChange < 0 && "bg-red-500/10 text-red-600 border-red-500/30")}>
                        {marginChange > 0 ? '+' : ''}{marginChange.toFixed(1)}pp
                      </Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{profitMargin.toFixed(1)}%</p>
                  {datePreset !== 'all' && prevProfitMargin !== 0 && (
                    <p className="text-xs text-muted-foreground mt-1">vs {prevProfitMargin.toFixed(1)}% {getComparisonLabel()}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="financial" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
          </TabsList>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-4">
            {/* Revenue & Expense Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gradient-to-br from-emerald-500/5 to-transparent border-emerald-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-emerald-600" />
                    Revenue Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {revenueBreakdown.length > 0 ? (
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-shrink-0">
                        <ResponsiveContainer width={160} height={160}>
                          <PieChart>
                            <Pie data={revenueBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="amountInTzs" strokeWidth={0}>
                              {revenueBreakdown.map((_, index) => <Cell key={`cell-${index}`} fill={REVENUE_COLORS[index % REVENUE_COLORS.length]} />)}
                            </Pie>
                            <Tooltip content={<CurrencyTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 space-y-2">
                        {revenueBreakdown.map((item, index) => (
                          <div key={item.currency} className="flex items-center justify-between p-2 bg-background/60 rounded-lg">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: REVENUE_COLORS[index % REVENUE_COLORS.length] }} />
                              <Badge variant="outline" className="text-xs font-mono">{item.currency}</Badge>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-sm">{item.symbol}{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                              <p className="text-xs text-muted-foreground">TZS {item.amountInTzs.toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                        <div className="pt-2 border-t flex justify-between items-center">
                          <span className="text-sm font-medium">Total</span>
                          <span className="text-lg font-bold text-emerald-600">TZS {formatTZS(totalRevenueTzs)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-muted-foreground">No revenue data available</div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500/5 to-transparent border-amber-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-amber-600" />
                    Expense Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {expenseBreakdown.length > 0 ? (
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-shrink-0">
                        <ResponsiveContainer width={160} height={160}>
                          <PieChart>
                            <Pie data={expenseBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="amountInTzs" strokeWidth={0}>
                              {expenseBreakdown.map((_, index) => <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />)}
                            </Pie>
                            <Tooltip content={<CurrencyTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 space-y-2">
                        {expenseBreakdown.map((item, index) => (
                          <div key={item.currency} className="flex items-center justify-between p-2 bg-background/60 rounded-lg">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: EXPENSE_COLORS[index % EXPENSE_COLORS.length] }} />
                              <Badge variant="outline" className="text-xs font-mono">{item.currency}</Badge>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-sm">{item.symbol}{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                              <p className="text-xs text-muted-foreground">TZS {item.amountInTzs.toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                        <div className="pt-2 border-t flex justify-between items-center">
                          <span className="text-sm font-medium">Total</span>
                          <span className="text-lg font-bold text-amber-600">TZS {formatTZS(totalExpensesTzs)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-muted-foreground">No expense data available</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Expense by Category */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Expense by Category</CardTitle>
                  <CardDescription>Breakdown by expense type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {expensesByCategory.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={expensesByCategory} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                            {expensesByCategory.map((_, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(v: number) => [`TZS ${formatTZS(v)}`, '']} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">No expense data yet</div>
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
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                          <span className="text-sm font-medium">{category.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">TZS {formatTZS(category.value)}</p>
                          <p className="text-xs text-muted-foreground">{totalExpensesTzs > 0 ? ((category.value / totalExpensesTzs) * 100).toFixed(1) : 0}%</p>
                        </div>
                      </div>
                    ))}
                    {expensesByCategory.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">No expense data yet</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Operations Tab */}
          <TabsContent value="operations" className="space-y-4">
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
                    {stats.shipmentGrowth >= 0 ? <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" /> : <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />}
                    <span className={stats.shipmentGrowth >= 0 ? 'text-green-500' : 'text-red-500'}>{Math.abs(stats.shipmentGrowth).toFixed(1)}%</span>
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

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalCustomers.toLocaleString()}</div>
                  <div className="flex items-center text-xs">
                    {stats.customerGrowth >= 0 ? <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" /> : <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />}
                    <span className={stats.customerGrowth >= 0 ? 'text-green-500' : 'text-red-500'}>{Math.abs(stats.customerGrowth).toFixed(1)}%</span>
                    <span className="text-muted-foreground ml-1">vs last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Revenue (TZS)</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">TZS {formatTZS(totalRevenueTzs)}</div>
                  <p className="text-xs text-muted-foreground">From paid invoices</p>
                </CardContent>
              </Card>
            </div>

            {/* Shipment & Weight Charts */}
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
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                        <Bar dataKey="shipments" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
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
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                        <Area type="monotone" dataKey="weight" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Customer Growth */}
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
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="customers" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue" className="space-y-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Revenue Overview</CardTitle>
                <CardDescription>Paid vs pending invoices per month (in TZS)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(v: number) => [`TZS ${formatTZS(v)}`, '']} />
                      <Legend />
                      <Bar dataKey="revenue" name="Paid" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="pending" name="Pending" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Revenue vs Expenses Trend */}
            <Card>
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
                      <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(v: number) => [`TZS ${formatTZS(v)}`, '']} />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
                      <Line type="monotone" dataKey="netProfit" name="Net Profit" stroke="#3B82F6" strokeWidth={3} dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }} />
                    </ComposedChart>
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
                        <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                          {statusDistribution.map((_, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
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
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
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
