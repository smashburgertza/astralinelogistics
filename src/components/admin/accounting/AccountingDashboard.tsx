import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, ArrowUpCircle, ArrowDownCircle, TrendingUp, Receipt, CreditCard } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useBankAccounts } from '@/hooks/useAccounting';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { CashFlowChart } from './CashFlowChart';
import { AccountBalancesWidget } from './AccountBalancesWidget';
import { LatestTransactionsWidget } from './LatestTransactionsWidget';
import { AgingSummaryWidget } from './AgingSummaryWidget';

interface AccountingSummary {
  cashBalance: number;
  receivables: number;
  payables: number;
  monthlyIncome: number;
  monthlyExpenses: number;
}

function useAccountingSummary() {
  // Use the same hook that AccountBalancesWidget uses for consistent calculations
  const { data: calculatedBankAccounts = [], dataUpdatedAt } = useBankAccounts();
  
  return useQuery({
    queryKey: ['accounting-summary', dataUpdatedAt],
    queryFn: async (): Promise<AccountingSummary> => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      
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
      // This ensures consistency between the Cash Balance card and Account Balances widget
      let cashBalance = 0;
      calculatedBankAccounts.filter(acc => acc.is_active).forEach(acc => {
        // current_balance is already calculated correctly by useBankAccounts (including TZS conversion for foreign deposits)
        cashBalance += convertToTzs(acc.current_balance || 0, acc.currency || 'TZS');
      });

      // Get unpaid invoices (receivables) - customer invoices + to_agent invoices
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

      // Get unpaid payables - from_agent invoices + pending/approved expenses
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

      // Get monthly income (paid invoices)
      const { data: paidInvoices } = await supabase
        .from('invoices')
        .select('amount, currency')
        .eq('status', 'paid')
        .gte('paid_at', startOfMonth);

      let monthlyIncome = 0;
      paidInvoices?.forEach(inv => {
        monthlyIncome += convertToTzs(inv.amount || 0, inv.currency || 'USD');
      });

      // Get monthly expenses (approved expenses)
      const { data: approvedExpenses } = await supabase
        .from('expenses')
        .select('amount, currency')
        .eq('status', 'approved')
        .gte('approved_at', startOfMonth);

      let monthlyExpenses = 0;
      approvedExpenses?.forEach(exp => {
        monthlyExpenses += convertToTzs(exp.amount || 0, exp.currency || 'USD');
      });

      return {
        cashBalance,
        receivables: receivablesTotal,
        payables: payablesTotal,
        monthlyIncome,
        monthlyExpenses,
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

export function AccountingDashboard() {
  const { data, isLoading } = useAccountingSummary();

  if (isLoading) {
    return (
      <div className="space-y-6">
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

  const netIncome = (data?.monthlyIncome || 0) - (data?.monthlyExpenses || 0);

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
      title: 'Income This Month',
      value: formatCurrency(data?.monthlyIncome || 0),
      icon: TrendingUp,
      description: 'Paid invoices',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      title: 'Expenses This Month',
      value: formatCurrency(data?.monthlyExpenses || 0),
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

  return (
    <div className="space-y-6">
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
