import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, ArrowUpCircle, ArrowDownCircle, TrendingUp, Receipt, CreditCard } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface AccountingSummary {
  cashBalance: number;
  cashCurrency: string;
  receivables: number;
  receivablesCurrency: string;
  payables: number;
  payablesCurrency: string;
  monthlyIncome: number;
  monthlyIncomeCurrency: string;
  monthlyExpenses: number;
  monthlyExpensesCurrency: string;
  recentTransactions: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    amountInTzs: number;
    currency: string;
    type: 'income' | 'expense' | 'transfer';
  }>;
  exchangeRates: Map<string, number>;
}

function useAccountingSummary() {
  return useQuery({
    queryKey: ['accounting-summary'],
    queryFn: async (): Promise<AccountingSummary> => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      
      // Get exchange rates for conversion to TZS
      const { data: exchangeRates } = await supabase
        .from('currency_exchange_rates')
        .select('currency_code, rate_to_tzs');
      
      const ratesMap = new Map<string, number>();
      exchangeRates?.forEach(r => ratesMap.set(r.currency_code, r.rate_to_tzs));
      ratesMap.set('TZS', 1); // TZS to TZS is 1
      
      const convertToTzs = (amount: number, currency: string): number => {
        const rate = ratesMap.get(currency) || 1;
        return amount * rate;
      };
      
      // Get bank accounts for cash balance (already in TZS typically)
      const { data: bankAccounts } = await supabase
        .from('bank_accounts')
        .select('current_balance, currency')
        .eq('is_active', true);
      
      let cashBalance = 0;
      bankAccounts?.forEach(acc => {
        cashBalance += convertToTzs(acc.current_balance || 0, acc.currency || 'TZS');
      });

      // Get unpaid invoices (receivables) - invoices TO agents that are pending
      const { data: receivables } = await supabase
        .from('invoices')
        .select('amount, currency')
        .eq('status', 'pending')
        .eq('invoice_direction', 'to_agent');

      let receivablesTotal = 0;
      receivables?.forEach(inv => {
        receivablesTotal += convertToTzs(inv.amount || 0, inv.currency || 'USD');
      });

      // Get unpaid expenses (payables)
      const { data: payables } = await supabase
        .from('expenses')
        .select('amount, currency')
        .in('status', ['pending', 'approved']);

      let payablesTotal = 0;
      payables?.forEach(exp => {
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

      // Get recent transactions from journal entries
      const { data: recentEntries } = await supabase
        .from('journal_entries')
        .select('id, entry_date, description, reference_type')
        .eq('status', 'posted')
        .order('entry_date', { ascending: false })
        .limit(10);

      // Get totals for each entry - use max of debit/credit totals since they should balance
      const recentTransactions = await Promise.all(
        (recentEntries || []).map(async (entry) => {
          const { data: lines } = await supabase
            .from('journal_lines')
            .select('debit_amount, credit_amount, currency')
            .eq('journal_entry_id', entry.id);
          
          const totalDebit = lines?.reduce((sum, l) => sum + (l.debit_amount || 0), 0) || 0;
          const totalCredit = lines?.reduce((sum, l) => sum + (l.credit_amount || 0), 0) || 0;
          const transactionAmount = Math.max(totalDebit, totalCredit);
          // Get the currency from the first line (entries are typically in one currency)
          const currency = lines?.[0]?.currency || 'TZS';
          const amountInTzs = convertToTzs(transactionAmount, currency);
          
          return {
            id: entry.id,
            date: entry.entry_date,
            description: entry.description,
            amount: transactionAmount,
            amountInTzs,
            currency,
            type: entry.reference_type === 'expense' ? 'expense' as const : 
                  entry.reference_type === 'payment' ? 'income' as const : 'transfer' as const,
          };
        })
      );

      return {
        cashBalance,
        cashCurrency: 'TZS',
        receivables: receivablesTotal,
        receivablesCurrency: 'TZS',
        payables: payablesTotal,
        payablesCurrency: 'TZS',
        monthlyIncome,
        monthlyIncomeCurrency: 'TZS',
        monthlyExpenses,
        monthlyExpensesCurrency: 'TZS',
        recentTransactions,
        exchangeRates: ratesMap,
      };
    },
  });
}

const formatCurrency = (amount: number, currency: string = 'TZS') => {
  // For TZS, use no decimals and proper formatting
  if (currency === 'TZS') {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
  
  // For other currencies
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
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
      value: formatCurrency(data?.cashBalance || 0, data?.cashCurrency),
      icon: Wallet,
      description: 'Total across all accounts (TZS)',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Accounts Receivable',
      value: formatCurrency(data?.receivables || 0, data?.receivablesCurrency),
      icon: ArrowDownCircle,
      description: 'Unpaid invoices (converted to TZS)',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Accounts Payable',
      value: formatCurrency(data?.payables || 0, data?.payablesCurrency),
      icon: ArrowUpCircle,
      description: 'Pending expenses (converted to TZS)',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Income This Month',
      value: formatCurrency(data?.monthlyIncome || 0, data?.monthlyIncomeCurrency),
      icon: TrendingUp,
      description: 'Paid invoices (converted to TZS)',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      title: 'Expenses This Month',
      value: formatCurrency(data?.monthlyExpenses || 0, data?.monthlyExpensesCurrency),
      icon: CreditCard,
      description: 'Approved expenses (converted to TZS)',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      title: 'Net Income',
      value: formatCurrency(netIncome, 'TZS'),
      icon: Receipt,
      description: 'Income minus expenses (TZS)',
      color: netIncome >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: netIncome >= 0 ? 'bg-green-100' : 'bg-red-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.recentTransactions && data.recentTransactions.length > 0 ? (
            <div className="space-y-3">
              {data.recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      tx.type === 'income' ? 'bg-green-100' : 
                      tx.type === 'expense' ? 'bg-red-100' : 'bg-blue-100'
                    }`}>
                      {tx.type === 'income' ? (
                        <ArrowDownCircle className="h-4 w-4 text-green-600" />
                      ) : tx.type === 'expense' ? (
                        <ArrowUpCircle className="h-4 w-4 text-red-600" />
                      ) : (
                        <Receipt className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tx.date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`font-semibold ${
                      tx.type === 'income' ? 'text-green-600' : 
                      tx.type === 'expense' ? 'text-red-600' : ''
                    }`}>
                      {tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : ''}
                      {formatCurrency(tx.amount, tx.currency)}
                    </span>
                    {tx.currency !== 'TZS' && (
                      <p className="text-xs text-muted-foreground">
                        ≈ TZS {tx.amountInTzs.toLocaleString('en-TZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No recent transactions
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
