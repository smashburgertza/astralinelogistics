import { useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useInvoices } from '@/hooks/useInvoices';
import { useAllExpenses } from '@/hooks/useExpenses';
import { useExchangeRates, convertToTZS } from '@/hooks/useExchangeRates';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Coins, ArrowUpRight, ArrowDownRight, 
  DollarSign, Receipt, PiggyBank 
} from 'lucide-react';

const REVENUE_COLORS = ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#D1FAE5'];
const EXPENSE_COLORS = ['#F59E0B', '#FBBF24', '#FCD34D', '#FDE68A', '#FEF3C7'];

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

export default function FinancialSummaryPage() {
  const { data: invoices } = useInvoices({});
  const { data: expenses } = useAllExpenses({});
  const { data: exchangeRates } = useExchangeRates();

  // Calculate revenue by currency
  const revenueBreakdown = useMemo(() => {
    if (!invoices || !exchangeRates) return [];
    
    const paidInvoices = invoices.filter(i => i.status === 'paid');
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
  }, [invoices, exchangeRates]);

  // Calculate expenses by currency
  const expenseBreakdown = useMemo(() => {
    if (!expenses || !exchangeRates) return [];
    
    const approvedExpenses = expenses.filter(e => e.status === 'approved');
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
  }, [expenses, exchangeRates]);

  // Calculate totals
  const totalRevenueTzs = revenueBreakdown.reduce((sum, item) => sum + item.amountInTzs, 0);
  const totalExpensesTzs = expenseBreakdown.reduce((sum, item) => sum + item.amountInTzs, 0);
  const netProfitTzs = totalRevenueTzs - totalExpensesTzs;
  const profitMargin = totalRevenueTzs > 0 ? (netProfitTzs / totalRevenueTzs) * 100 : 0;

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

  return (
    <AdminLayout 
      title="Financial Summary" 
      subtitle="Revenue vs expenses breakdown with net profit calculations"
    >
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    TZS {totalRevenueTzs.toLocaleString()}
                  </p>
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
                <div>
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                  <p className="text-2xl font-bold text-amber-600">
                    TZS {totalExpensesTzs.toLocaleString()}
                  </p>
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
                <div>
                  <p className="text-sm text-muted-foreground">Net Profit</p>
                  <p className={`text-2xl font-bold ${netProfitTzs >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    TZS {netProfitTzs.toLocaleString()}
                  </p>
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
                <div>
                  <p className="text-sm text-muted-foreground">Profit Margin</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {profitMargin.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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