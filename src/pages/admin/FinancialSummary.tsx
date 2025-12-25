import { useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useInvoices } from '@/hooks/useInvoices';
import { useAllExpenses } from '@/hooks/useExpenses';
import { useExchangeRates, convertToTZS } from '@/hooks/useExchangeRates';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line, ComposedChart, Area
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Coins, ArrowUpRight, ArrowDownRight, 
  DollarSign, Receipt, PiggyBank, CalendarIcon, LineChartIcon, GitCompare 
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subDays, subYears, isWithinInterval, parseISO, eachMonthOfInterval, isSameMonth, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

const REVENUE_COLORS = ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#D1FAE5'];
const EXPENSE_COLORS = ['#F59E0B', '#FBBF24', '#FCD34D', '#FDE68A', '#FEF3C7'];

type ComparisonMode = 'pop' | 'yoy';

type DatePreset = 'all' | 'today' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';

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

const CurrencyTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background/95 backdrop-blur-md border rounded-lg p-3 shadow-xl">
        <p className="font-semibold">{data.currency}</p>
        <p className="text-sm text-muted-foreground">
          {data.symbol}{data.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
        <p className="text-xs font-medium" style={{ color: data.type === 'revenue' ? '#10B981' : '#F59E0B' }}>
          ≈ TZS {data.amountInTzs.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {data.percentage.toFixed(1)}% of {data.type}
        </p>
      </div>
    );
  }
  return null;
};

const ComparisonTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur-md border rounded-lg p-3 shadow-xl">
        <p className="font-semibold mb-2">{label}</p>
        {payload.map((item: any, index: number) => (
          <p key={index} className="text-sm flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-muted-foreground">{item.name}:</span>
            <span className="font-medium">TZS {item.value.toLocaleString()}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const getDateRange = (preset: DatePreset, customFrom?: Date, customTo?: Date): { from: Date | null; to: Date | null } => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  switch (preset) {
    case 'all':
      return { from: null, to: null };
    case 'today':
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      return { from: startOfToday, to: today };
    case 'last7':
      return { from: subDays(today, 7), to: today };
    case 'last30':
      return { from: subDays(today, 30), to: today };
    case 'thisMonth':
      return { from: startOfMonth(today), to: endOfMonth(today) };
    case 'lastMonth':
      const lastMonth = subMonths(today, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    case 'thisYear':
      return { from: startOfYear(today), to: endOfYear(today) };
    case 'custom':
      return { from: customFrom || null, to: customTo || null };
    default:
      return { from: null, to: null };
  }
};

export default function FinancialSummaryPage() {
  const { data: invoices } = useInvoices({});
  const { data: expenses } = useAllExpenses({});
  const { data: exchangeRates } = useExchangeRates();
  
  const [datePreset, setDatePreset] = useState<DatePreset>('thisMonth');
  const [customFromDate, setCustomFromDate] = useState<Date>();
  const [customToDate, setCustomToDate] = useState<Date>();
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('pop');

  const dateRange = useMemo(() => 
    getDateRange(datePreset, customFromDate, customToDate),
    [datePreset, customFromDate, customToDate]
  );

  // Filter invoices and expenses by date range
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

  // Calculate revenue by currency
  const revenueBreakdown = useMemo(() => {
    if (!filteredInvoices || !exchangeRates) return [];
    
    const paidInvoices = filteredInvoices.filter(i => i.status === 'paid');
    const byCurrency: Record<string, number> = {};
    
    paidInvoices.forEach(invoice => {
      const currency = invoice.currency || 'USD';
      byCurrency[currency] = (byCurrency[currency] || 0) + Number(invoice.amount);
    });

    const breakdown = Object.entries(byCurrency).map(([currency, amount]) => ({
      currency,
      amount,
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

  // Calculate expenses by currency
  const expenseBreakdown = useMemo(() => {
    if (!filteredExpenses || !exchangeRates) return [];
    
    const approvedExpenses = filteredExpenses.filter(e => e.status === 'approved');
    const byCurrency: Record<string, number> = {};
    
    approvedExpenses.forEach(expense => {
      const currency = expense.currency || 'USD';
      byCurrency[currency] = (byCurrency[currency] || 0) + Number(expense.amount);
    });

    const breakdown = Object.entries(byCurrency).map(([currency, amount]) => ({
      currency,
      amount,
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

  // Calculate totals
  const totalRevenueTzs = revenueBreakdown.reduce((sum, item) => sum + item.amountInTzs, 0);
  const totalExpensesTzs = expenseBreakdown.reduce((sum, item) => sum + item.amountInTzs, 0);
  const netProfitTzs = totalRevenueTzs - totalExpensesTzs;
  const profitMargin = totalRevenueTzs > 0 ? (netProfitTzs / totalRevenueTzs) * 100 : 0;

  // Calculate previous period for comparison (Period over Period)
  const previousPeriodRange = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return { from: null, to: null };
    
    const daysDiff = differenceInDays(dateRange.to, dateRange.from);
    const prevTo = subDays(dateRange.from, 1);
    const prevFrom = subDays(prevTo, daysDiff);
    
    return { from: prevFrom, to: prevTo };
  }, [dateRange]);

  // Calculate year-over-year period (same period last year)
  const yoyPeriodRange = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return { from: null, to: null };
    
    return {
      from: subYears(dateRange.from, 1),
      to: subYears(dateRange.to, 1),
    };
  }, [dateRange]);

  // Get the active comparison range based on mode
  const comparisonRange = comparisonMode === 'yoy' ? yoyPeriodRange : previousPeriodRange;

  // Filter comparison period invoices and expenses
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

  // Calculate comparison period totals
  const prevTotalRevenueTzs = useMemo(() => {
    if (!prevFilteredInvoices || !exchangeRates) return 0;
    
    return prevFilteredInvoices
      .filter(i => i.status === 'paid')
      .reduce((sum, inv) => {
        const currency = inv.currency || 'USD';
        return sum + convertToTZS(Number(inv.amount), currency, exchangeRates);
      }, 0);
  }, [prevFilteredInvoices, exchangeRates]);

  const prevTotalExpensesTzs = useMemo(() => {
    if (!prevFilteredExpenses || !exchangeRates) return 0;
    
    return prevFilteredExpenses
      .filter(e => e.status === 'approved')
      .reduce((sum, exp) => {
        const currency = exp.currency || 'USD';
        return sum + convertToTZS(Number(exp.amount), currency, exchangeRates);
      }, 0);
  }, [prevFilteredExpenses, exchangeRates]);

  const prevNetProfitTzs = prevTotalRevenueTzs - prevTotalExpensesTzs;
  const prevProfitMargin = prevTotalRevenueTzs > 0 ? (prevNetProfitTzs / prevTotalRevenueTzs) * 100 : 0;

  // Get comparison label
  const getComparisonLabel = () => {
    if (comparisonMode === 'yoy') {
      return 'same period last year';
    }
    return 'prev period';
  };

  // Calculate growth percentages
  const calculateGrowth = (current: number, previous: number): number | null => {
    if (previous === 0) return current > 0 ? 100 : null;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  const revenueGrowth = calculateGrowth(totalRevenueTzs, prevTotalRevenueTzs);
  const expenseGrowth = calculateGrowth(totalExpensesTzs, prevTotalExpensesTzs);
  const profitGrowth = calculateGrowth(netProfitTzs, prevNetProfitTzs);
  const marginChange = profitMargin - prevProfitMargin;

  const GrowthBadge = ({ growth, inverted = false }: { growth: number | null; inverted?: boolean }) => {
    if (growth === null) return null;
    
    const isPositive = inverted ? growth < 0 : growth > 0;
    const isNegative = inverted ? growth > 0 : growth < 0;
    
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "text-xs font-medium ml-2",
          isPositive && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
          isNegative && "bg-red-500/10 text-red-600 border-red-500/30",
          !isPositive && !isNegative && "bg-muted text-muted-foreground"
        )}
      >
        {growth > 0 ? '+' : ''}{growth.toFixed(1)}%
      </Badge>
    );
  };

  // Prepare comparison data by currency
  const comparisonData = useMemo(() => {
    const allCurrencies = new Set([
      ...revenueBreakdown.map(r => r.currency),
      ...expenseBreakdown.map(e => e.currency),
    ]);

    return Array.from(allCurrencies).map(currency => {
      const revenue = revenueBreakdown.find(r => r.currency === currency);
      const expense = expenseBreakdown.find(e => e.currency === currency);
      return {
        currency,
        revenue: revenue?.amountInTzs || 0,
        expenses: expense?.amountInTzs || 0,
        profit: (revenue?.amountInTzs || 0) - (expense?.amountInTzs || 0),
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [revenueBreakdown, expenseBreakdown]);

  // Calculate monthly trend data (last 12 months)
  const monthlyTrendData = useMemo(() => {
    if (!invoices || !expenses || !exchangeRates) return [];
    
    const today = new Date();
    const startDate = subMonths(startOfMonth(today), 11);
    const endDate = endOfMonth(today);
    
    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    
    return months.map(month => {
      // Calculate revenue for this month
      const monthRevenue = invoices
        .filter(inv => {
          if (inv.status !== 'paid') return false;
          const invDate = inv.paid_at ? parseISO(inv.paid_at) : parseISO(inv.created_at || '');
          return isSameMonth(invDate, month);
        })
        .reduce((sum, inv) => {
          const currency = inv.currency || 'USD';
          return sum + convertToTZS(Number(inv.amount), currency, exchangeRates);
        }, 0);
      
      // Calculate expenses for this month
      const monthExpenses = expenses
        .filter(exp => {
          if (exp.status !== 'approved') return false;
          const expDate = parseISO(exp.created_at || '');
          return isSameMonth(expDate, month);
        })
        .reduce((sum, exp) => {
          const currency = exp.currency || 'USD';
          return sum + convertToTZS(Number(exp.amount), currency, exchangeRates);
        }, 0);
      
      return {
        month: format(month, 'MMM yyyy'),
        shortMonth: format(month, 'MMM'),
        revenue: monthRevenue,
        expenses: monthExpenses,
        profit: monthRevenue - monthExpenses,
      };
    });
  }, [invoices, expenses, exchangeRates]);

  const TrendTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-md border rounded-lg p-3 shadow-xl">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((item: any, index: number) => (
            <p key={index} className="text-sm flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-muted-foreground">{item.name}:</span>
              <span className="font-medium">TZS {item.value.toLocaleString()}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
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

  return (
    <AdminLayout 
      title="Financial Summary" 
      subtitle="Revenue vs expenses breakdown with net profit calculations"
    >
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
                    <Button
                      variant={datePreset === 'custom' ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        "justify-start text-left font-normal",
                        datePreset === 'custom' && !customFromDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customFromDate ? format(customFromDate, 'MMM d, yyyy') : 'From'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={customFromDate}
                      onSelect={(date) => {
                        setCustomFromDate(date);
                        setDatePreset('custom');
                      }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">to</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={datePreset === 'custom' ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        "justify-start text-left font-normal",
                        datePreset === 'custom' && !customToDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customToDate ? format(customToDate, 'MMM d, yyyy') : 'To'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={customToDate}
                      onSelect={(date) => {
                        setCustomToDate(date);
                        setDatePreset('custom');
                      }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                Showing data for: <span className="font-medium text-foreground">{getDateRangeLabel()}</span>
              </div>
              {datePreset !== 'all' && (
                <div className="flex items-center gap-2">
                  <GitCompare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Compare:</span>
                  <ToggleGroup 
                    type="single" 
                    value={comparisonMode} 
                    onValueChange={(value) => value && setComparisonMode(value as ComparisonMode)}
                    size="sm"
                  >
                    <ToggleGroupItem value="pop" className="text-xs px-3">
                      Period over Period
                    </ToggleGroupItem>
                    <ToggleGroupItem value="yoy" className="text-xs px-3">
                      Year over Year
                    </ToggleGroupItem>
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
                  <p className="text-2xl font-bold text-emerald-600">
                    TZS {totalRevenueTzs.toLocaleString()}
                  </p>
                  {datePreset !== 'all' && prevTotalRevenueTzs > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      vs TZS {prevTotalRevenueTzs.toLocaleString()} {getComparisonLabel()}
                    </p>
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
                  <p className="text-2xl font-bold text-amber-600">
                    TZS {totalExpensesTzs.toLocaleString()}
                  </p>
                  {datePreset !== 'all' && prevTotalExpensesTzs > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      vs TZS {prevTotalExpensesTzs.toLocaleString()} {getComparisonLabel()}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${netProfitTzs >= 0 ? 'from-blue-500/10 to-blue-500/5 border-blue-500/20' : 'from-red-500/10 to-red-500/5 border-red-500/20'}`}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl ${netProfitTzs >= 0 ? 'bg-blue-500/20' : 'bg-red-500/20'} flex items-center justify-center`}>
                  <PiggyBank className={`h-6 w-6 ${netProfitTzs >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center">
                    <p className="text-sm text-muted-foreground">Net Profit</p>
                    {datePreset !== 'all' && <GrowthBadge growth={profitGrowth} />}
                  </div>
                  <p className={`text-2xl font-bold ${netProfitTzs >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    TZS {netProfitTzs.toLocaleString()}
                  </p>
                  {datePreset !== 'all' && (prevNetProfitTzs !== 0 || prevTotalRevenueTzs > 0) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      vs TZS {prevNetProfitTzs.toLocaleString()} {getComparisonLabel()}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  {profitMargin >= 0 ? (
                    <ArrowUpRight className="h-6 w-6 text-purple-600" />
                  ) : (
                    <ArrowDownRight className="h-6 w-6 text-purple-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center">
                    <p className="text-sm text-muted-foreground">Profit Margin</p>
                    {datePreset !== 'all' && marginChange !== 0 && (
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs font-medium ml-2",
                          marginChange > 0 && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
                          marginChange < 0 && "bg-red-500/10 text-red-600 border-red-500/30"
                        )}
                      >
                        {marginChange > 0 ? '+' : ''}{marginChange.toFixed(1)}pp
                      </Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-purple-600">
                    {profitMargin.toFixed(1)}%
                  </p>
                  {datePreset !== 'all' && prevProfitMargin !== 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      vs {prevProfitMargin.toFixed(1)}% {getComparisonLabel()}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trend Chart */}
        {monthlyTrendData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChartIcon className="h-5 w-5" />
                Monthly Financial Trend (Last 12 Months)
              </CardTitle>
              <CardDescription>
                Revenue, expenses, and profit trend over time (in TZS)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={monthlyTrendData}>
                  <defs>
                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis 
                    dataKey="shortMonth" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                      return value.toString();
                    }}
                  />
                  <Tooltip content={<TrendTooltip />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name="Profit"
                    fill="url(#profitGradient)"
                    stroke="#3B82F6"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    name="Revenue"
                    stroke="#10B981" 
                    strokeWidth={3}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="expenses" 
                    name="Expenses"
                    stroke="#F59E0B" 
                    strokeWidth={3}
                    dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#F59E0B', strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Revenue vs Expenses Comparison Chart */}
        {comparisonData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Revenue vs Expenses by Currency (in TZS)
              </CardTitle>
              <CardDescription>
                Comparison of revenue and expenses converted to TZS
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparisonData} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis 
                    dataKey="currency" 
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
                  <Tooltip content={<ComparisonTooltip />} />
                  <Legend />
                  <Bar 
                    dataKey="revenue" 
                    name="Revenue" 
                    fill="#10B981" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="expenses" 
                    name="Expenses" 
                    fill="#F59E0B" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Side by Side Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Breakdown */}
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
                        <Pie
                          data={revenueBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="amountInTzs"
                          strokeWidth={0}
                        >
                          {revenueBreakdown.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={REVENUE_COLORS[index % REVENUE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CurrencyTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2">
                    {revenueBreakdown.map((item, index) => (
                      <div 
                        key={item.currency} 
                        className="flex items-center justify-between p-2 bg-background/60 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: REVENUE_COLORS[index % REVENUE_COLORS.length] }}
                          />
                          <Badge variant="outline" className="text-xs font-mono">
                            {item.currency}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">
                            {item.symbol}{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            TZS {item.amountInTzs.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 border-t flex justify-between items-center">
                      <span className="text-sm font-medium">Total</span>
                      <span className="text-lg font-bold text-emerald-600">
                        TZS {totalRevenueTzs.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-muted-foreground">
                  No revenue data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expense Breakdown */}
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
                        <Pie
                          data={expenseBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="amountInTzs"
                          strokeWidth={0}
                        >
                          {expenseBreakdown.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CurrencyTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2">
                    {expenseBreakdown.map((item, index) => (
                      <div 
                        key={item.currency} 
                        className="flex items-center justify-between p-2 bg-background/60 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: EXPENSE_COLORS[index % EXPENSE_COLORS.length] }}
                          />
                          <Badge variant="outline" className="text-xs font-mono">
                            {item.currency}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">
                            {item.symbol}{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            TZS {item.amountInTzs.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 border-t flex justify-between items-center">
                      <span className="text-sm font-medium">Total</span>
                      <span className="text-lg font-bold text-amber-600">
                        TZS {totalExpensesTzs.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-muted-foreground">
                  No expense data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Profit by Currency */}
        {comparisonData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5" />
                Net Profit by Currency
              </CardTitle>
              <CardDescription>
                Profit/loss breakdown per currency (in TZS equivalent)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {comparisonData.map((item) => (
                  <div 
                    key={item.currency}
                    className={`rounded-lg p-4 border ${
                      item.profit >= 0 
                        ? 'bg-emerald-500/5 border-emerald-500/20' 
                        : 'bg-red-500/5 border-red-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-xs font-mono">
                        {item.currency}
                      </Badge>
                      {item.profit >= 0 ? (
                        <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <p className={`text-lg font-bold ${item.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      TZS {Math.abs(item.profit).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.profit >= 0 ? 'Profit' : 'Loss'}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}