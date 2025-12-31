import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface CashFlowData {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

function useCashFlowData() {
  return useQuery({
    queryKey: ['cash-flow-chart'],
    queryFn: async (): Promise<CashFlowData[]> => {
      const months: CashFlowData[] = [];
      const now = new Date();

      // Get exchange rates
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

      // Get data for last 6 months
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const start = startOfMonth(monthDate).toISOString();
        const end = endOfMonth(monthDate).toISOString();

        // Get income (paid invoices)
        const { data: paidInvoices } = await supabase
          .from('invoices')
          .select('amount, currency')
          .eq('status', 'paid')
          .gte('paid_at', start)
          .lte('paid_at', end);

        let income = 0;
        paidInvoices?.forEach(inv => {
          income += convertToTzs(inv.amount || 0, inv.currency || 'USD');
        });

        // Get expenses
        const { data: approvedExpenses } = await supabase
          .from('expenses')
          .select('amount, currency')
          .eq('status', 'approved')
          .gte('approved_at', start)
          .lte('approved_at', end);

        let expenses = 0;
        approvedExpenses?.forEach(exp => {
          expenses += convertToTzs(exp.amount || 0, exp.currency || 'USD');
        });

        months.push({
          month: format(monthDate, 'MMM'),
          income: Math.round(income),
          expenses: Math.round(expenses),
          net: Math.round(income - expenses),
        });
      }

      return months;
    },
  });
}

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toString();
};

export function CashFlowChart() {
  const { data, isLoading } = useCashFlowData();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cash Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Cash Flow (Last 6 Months)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatCurrency}
              />
              <Tooltip 
                formatter={(value: number) => [
                  new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 }).format(value),
                ]}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="income" 
                name="Income"
                stroke="hsl(var(--chart-2))" 
                fillOpacity={1} 
                fill="url(#colorIncome)" 
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey="expenses" 
                name="Expenses"
                stroke="hsl(var(--chart-1))" 
                fillOpacity={1} 
                fill="url(#colorExpenses)" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
