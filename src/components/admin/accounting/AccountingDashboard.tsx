import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, ArrowUpCircle, ArrowDownCircle, TrendingUp, Receipt, CreditCard, CalendarIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useBankAccounts } from '@/hooks/useAccounting';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { CashFlowChart } from './CashFlowChart';
import { AccountBalancesWidget } from './AccountBalancesWidget';
import { LatestTransactionsWidget } from './LatestTransactionsWidget';
import { AgingSummaryWidget } from './AgingSummaryWidget';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { startOfWeek, startOfMonth, startOfYear, format } from 'date-fns';
import { cn } from '@/lib/utils';

type TimePeriod = 'week' | 'month' | 'year' | 'custom';

interface DateRange {
  from: Date;
  to: Date;
}

interface AccountingSummary {
  cashBalance: number;
  receivables: number;
  payables: number;
  periodIncome: number;
  periodExpenses: number;
}

function getStartDate(period: TimePeriod, customRange?: DateRange): Date {
  if (period === 'custom' && customRange) {
    return customRange.from;
  }
  const now = new Date();
  switch (period) {
    case 'week':
      return startOfWeek(now, { weekStartsOn: 1 });
    case 'month':
      return startOfMonth(now);
    case 'year':
      return startOfYear(now);
    default:
      return startOfMonth(now);
  }
}

function getEndDate(period: TimePeriod, customRange?: DateRange): Date | null {
  if (period === 'custom' && customRange) {
    return customRange.to;
  }
  return null; // No end date for preset periods (up to now)
}

function useAccountingSummary(period: TimePeriod, customRange?: DateRange) {
  const { data: calculatedBankAccounts = [] } = useBankAccounts();
  
  return useQuery({
    queryKey: ['accounting-summary', period, customRange?.from?.toISOString(), customRange?.to?.toISOString()],
    queryFn: async (): Promise<AccountingSummary> => {
      const periodStart = getStartDate(period, customRange).toISOString();
      const periodEnd = getEndDate(period, customRange);
      
      // Get exchange rates for conversion to TZS
      const { data: exchangeRates } = await supabase
        .from('currency_exchange_rates')
        .select('currency_code, rate_to_tzs');
      
      const ratesMap = new Map<string, number>();
      exchangeRates?.forEach(r => ratesMap.set(r.currency_code, r.rate_to_tzs));
      ratesMap.set('TZS', 1);
      
      const convertToTzs = (amount: number, currency: string): number => {
        const rate = ratesMap.get(currency) || 1;
        return amount * rate;
      };
      
      // Use the calculated bank account balances from useBankAccounts hook
      let cashBalance = 0;
      calculatedBankAccounts.filter(acc => acc.is_active).forEach(acc => {
        cashBalance += convertToTzs(acc.current_balance || 0, acc.currency || 'TZS');
      });

      // Get unpaid invoices (receivables)
      const { data: customerReceivables } = await supabase
        .from('invoices')
        .select('amount, currency')
        .eq('status', 'pending')
        .not('customer_id', 'is', null);

      const { data: agentReceivables } = await supabase
        .from('invoices')
        .select('amount, currency')
        .eq('status', 'pending')
        .eq('invoice_direction', 'to_agent');

      let receivablesTotal = 0;
      customerReceivables?.forEach(inv => {
        receivablesTotal += convertToTzs(inv.amount || 0, inv.currency || 'USD');
      });
      agentReceivables?.forEach(inv => {
        receivablesTotal += convertToTzs(inv.amount || 0, inv.currency || 'USD');
      });

      // Get unpaid payables
      const { data: agentPayables } = await supabase
        .from('invoices')
        .select('amount, currency')
        .eq('status', 'pending')
        .eq('invoice_direction', 'from_agent');

      const { data: expensePayables } = await supabase
        .from('expenses')
        .select('amount, currency')
        .in('status', ['pending', 'approved']);

      let payablesTotal = 0;
      agentPayables?.forEach(inv => {
        payablesTotal += convertToTzs(inv.amount || 0, inv.currency || 'USD');
      });
      expensePayables?.forEach(exp => {
        payablesTotal += convertToTzs(exp.amount || 0, exp.currency || 'USD');
      });

      // Get period income (paid invoices)
      let incomeQuery = supabase
        .from('invoices')
        .select('amount, currency')
        .eq('status', 'paid')
        .gte('paid_at', periodStart);
      if (periodEnd) {
        incomeQuery = incomeQuery.lte('paid_at', periodEnd.toISOString());
      }
      const { data: paidInvoices } = await incomeQuery;

      let periodIncome = 0;
      paidInvoices?.forEach(inv => {
        periodIncome += convertToTzs(inv.amount || 0, inv.currency || 'USD');
      });

      // Get period expenses (approved expenses from expenses table)
      let expensesQuery = supabase
        .from('expenses')
        .select('amount, currency')
        .eq('status', 'approved')
        .gte('approved_at', periodStart);
      if (periodEnd) {
        expensesQuery = expensesQuery.lte('approved_at', periodEnd.toISOString());
      }
      const { data: approvedExpenses } = await expensesQuery;

      // Also get posted expense transactions from journal entries
      let journalQuery = supabase
        .from('journal_entries')
        .select('expense_amount, expense_currency')
        .eq('is_expense', true)
        .eq('status', 'posted')
        .gte('posted_at', periodStart);
      if (periodEnd) {
        journalQuery = journalQuery.lte('posted_at', periodEnd.toISOString());
      }
      const { data: expenseJournals } = await journalQuery;

      let periodExpenses = 0;
      approvedExpenses?.forEach(exp => {
        periodExpenses += convertToTzs(exp.amount || 0, exp.currency || 'USD');
      });
      expenseJournals?.forEach(je => {
        periodExpenses += convertToTzs(je.expense_amount || 0, je.expense_currency || 'USD');
      });

      return {
        cashBalance,
        receivables: receivablesTotal,
        payables: payablesTotal,
        periodIncome,
        periodExpenses,
      };
    },
  });
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const periodLabels: Record<TimePeriod, string> = {
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
  custom: 'Custom',
};

export function AccountingDashboard() {
  const [period, setPeriod] = useState<TimePeriod>('month');
  const [customRange, setCustomRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const { data, isLoading } = useAccountingSummary(period, period === 'custom' ? customRange : undefined);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const netIncome = (data?.periodIncome || 0) - (data?.periodExpenses || 0);

  const stats = [
    {
      title: 'Cash Balance',
      value: formatCurrency(data?.cashBalance || 0),
      icon: Wallet,
      description: 'Total across all accounts',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Accounts Receivable',
      value: formatCurrency(data?.receivables || 0),
      icon: ArrowDownCircle,
      description: 'Unpaid invoices',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Accounts Payable',
      value: formatCurrency(data?.payables || 0),
      icon: ArrowUpCircle,
      description: 'Pending expenses',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: `Income ${periodLabels[period]}`,
      value: formatCurrency(data?.periodIncome || 0),
      icon: TrendingUp,
      description: 'Paid invoices',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      title: `Expenses ${periodLabels[period]}`,
      value: formatCurrency(data?.periodExpenses || 0),
      icon: CreditCard,
      description: 'Approved expenses',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      title: 'Net Income',
      value: formatCurrency(netIncome),
      icon: Receipt,
      description: 'Income minus expenses',
      color: netIncome >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: netIncome >= 0 ? 'bg-green-100' : 'bg-red-100',
    },
  ];

  const getPeriodLabel = () => {
    if (period === 'custom') {
      return `${format(customRange.from, 'MMM d')} - ${format(customRange.to, 'MMM d, yyyy')}`;
    }
    return periodLabels[period];
  };

  return (
    <div className="space-y-6">
      {/* Period Filter */}
      <div className="flex justify-end gap-2 flex-wrap">
        <Select value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>

        {period === 'custom' && (
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[130px] justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(customRange.from, 'MMM d, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customRange.from}
                  onSelect={(date) => date && setCustomRange(prev => ({ ...prev, from: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <span className="self-center text-muted-foreground">to</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[130px] justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(customRange.to, 'MMM d, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customRange.to}
                  onSelect={(date) => date && setCustomRange(prev => ({ ...prev, to: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-1.5 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-3 w-3 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cash Flow Chart - Takes 2 columns */}
        <div className="lg:col-span-2">
          <CashFlowChart />
        </div>

        {/* Account Balances Widget */}
        <AccountBalancesWidget />
      </div>

      {/* Second Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Latest Income */}
        <LatestTransactionsWidget type="income" />

        {/* Latest Expenses */}
        <LatestTransactionsWidget type="expense" />

        {/* Aging Summary */}
        <AgingSummaryWidget />
      </div>
    </div>
  );
}
