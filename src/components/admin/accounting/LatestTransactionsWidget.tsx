import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowDownCircle, ArrowUpCircle, Receipt, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  type: 'income' | 'expense';
}

function useLatestTransactions(type: 'income' | 'expense', limit: number = 5) {
  return useQuery({
    queryKey: ['latest-transactions', type, limit],
    queryFn: async (): Promise<Transaction[]> => {
      if (type === 'income') {
        const { data: invoices } = await supabase
          .from('invoices')
          .select('id, paid_at, amount, currency, invoice_number')
          .eq('status', 'paid')
          .not('paid_at', 'is', null)
          .order('paid_at', { ascending: false })
          .limit(limit);

        return (invoices || []).map(inv => ({
          id: inv.id,
          date: inv.paid_at!,
          description: `Invoice ${inv.invoice_number}`,
          amount: inv.amount,
          currency: inv.currency || 'USD',
          type: 'income' as const,
        }));
      } else {
        const { data: expenses } = await supabase
          .from('expenses')
          .select('id, approved_at, amount, currency, category, description')
          .eq('status', 'approved')
          .not('approved_at', 'is', null)
          .order('approved_at', { ascending: false })
          .limit(limit);

        return (expenses || []).map(exp => ({
          id: exp.id,
          date: exp.approved_at!,
          description: exp.description || exp.category,
          amount: exp.amount,
          currency: exp.currency || 'USD',
          type: 'expense' as const,
        }));
      }
    },
  });
}

interface LatestTransactionsWidgetProps {
  type: 'income' | 'expense';
  onViewAll?: () => void;
}

export function LatestTransactionsWidget({ type, onViewAll }: LatestTransactionsWidgetProps) {
  const { data: transactions = [], isLoading } = useLatestTransactions(type);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const isIncome = type === 'income';
  const Icon = isIncome ? ArrowDownCircle : ArrowUpCircle;
  const color = isIncome ? 'text-green-600' : 'text-red-600';
  const bgColor = isIncome ? 'bg-green-100' : 'bg-red-100';

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            Latest {isIncome ? 'Income' : 'Expenses'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <div className={`p-1.5 rounded-full ${bgColor}`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            Latest {isIncome ? 'Income' : 'Expenses'}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent {type}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div 
                key={tx.id} 
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div>
                  <p className="font-medium text-sm truncate max-w-[180px]">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(tx.date), 'MMM d, yyyy')}
                  </p>
                </div>
                <span className={`font-semibold text-sm ${color}`}>
                  {isIncome ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                </span>
              </div>
            ))}
            
            {onViewAll && (
              <Button variant="ghost" size="sm" className="w-full mt-2" onClick={onViewAll}>
                View all
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
