import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, ArrowUpCircle, ArrowDownCircle, TrendingUp, Receipt, CreditCard } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface AccountingSummary {
  cashBalance: number;
  receivables: number;
  payables: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  recentTransactions: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'income' | 'expense' | 'transfer';
  }>;
}

function useAccountingSummary() {
  return useQuery({
    queryKey: ['accounting-summary'],
    queryFn: async (): Promise<AccountingSummary> => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      
      // Get bank accounts for cash balance
      const { data: bankAccounts } = await supabase
        .from('bank_accounts')
        .select('current_balance')
        .eq('is_active', true);
      
      const cashBalance = bankAccounts?.reduce((sum, acc) => sum + (acc.current_balance || 0), 0) || 0;

      // Get unpaid invoices (receivables) - invoices TO customers
      const { data: receivables } = await supabase
        .from('invoices')
        .select('amount')
        .eq('status', 'pending')
        .eq('invoice_direction', 'to_agent');

      const receivablesTotal = receivables?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;

      // Get unpaid expenses (payables)
      const { data: payables } = await supabase
        .from('expenses')
        .select('amount')
        .in('status', ['pending', 'approved']);

      const payablesTotal = payables?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;

      // Get monthly income (paid invoices)
      const { data: paidInvoices } = await supabase
        .from('invoices')
        .select('amount')
        .eq('status', 'paid')
        .gte('paid_at', startOfMonth);

      const monthlyIncome = paidInvoices?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;

      // Get monthly expenses (approved expenses)
      const { data: approvedExpenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('status', 'approved')
        .gte('approved_at', startOfMonth);

      const monthlyExpenses = approvedExpenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;

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
            .select('debit_amount, credit_amount')
            .eq('journal_entry_id', entry.id);
          
          const totalDebit = lines?.reduce((sum, l) => sum + (l.debit_amount || 0), 0) || 0;
          const totalCredit = lines?.reduce((sum, l) => sum + (l.credit_amount || 0), 0) || 0;
          // Use the larger value - they should be equal in a balanced entry
          const transactionAmount = Math.max(totalDebit, totalCredit);
          
          return {
            id: entry.id,
            date: entry.entry_date,
            description: entry.description,
            amount: transactionAmount,
            type: entry.reference_type === 'expense' ? 'expense' as const : 
                  entry.reference_type === 'payment' ? 'income' as const : 'transfer' as const,
          };
        })
      );

      return {
        cashBalance,
        receivables: receivablesTotal,
        payables: payablesTotal,
        monthlyIncome,
        monthlyExpenses,
        recentTransactions,
      };
    },
  });
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
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
      description: 'Unpaid customer invoices',
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
      value: formatCurrency((data?.monthlyIncome || 0) - (data?.monthlyExpenses || 0)),
      icon: Receipt,
      description: 'Income minus expenses',
      color: (data?.monthlyIncome || 0) >= (data?.monthlyExpenses || 0) ? 'text-green-600' : 'text-red-600',
      bgColor: (data?.monthlyIncome || 0) >= (data?.monthlyExpenses || 0) ? 'bg-green-100' : 'bg-red-100',
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
                  <span className={`font-semibold ${
                    tx.type === 'income' ? 'text-green-600' : 
                    tx.type === 'expense' ? 'text-red-600' : ''
                  }`}>
                    {tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : ''}
                    {formatCurrency(tx.amount)}
                  </span>
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
