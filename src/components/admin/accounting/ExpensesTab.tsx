import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Truck, 
  Wallet,
  Search,
  CalendarIcon,
  Filter,
  X,
  Building2,
  Receipt
} from 'lucide-react';
import { useAllExpenses } from '@/hooks/useExpenses';
import { useSettlements } from '@/hooks/useSettlements';
import { usePayrollRuns } from '@/hooks/usePayroll';
import { useExchangeRates, convertToTZS } from '@/hooks/useExchangeRates';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { cn } from '@/lib/utils';

// Unified expense item type
interface UnifiedExpense {
  id: string;
  date: string;
  category: 'operational' | 'agent_settlement' | 'payroll' | 'other';
  description: string;
  reference: string;
  amount: number;
  currency: string;
  amountInTzs: number;
  status: string;
  source: string;
}

const CATEGORY_CONFIG = {
  operational: { 
    label: 'Operational', 
    icon: Building2, 
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' 
  },
  agent_settlement: { 
    label: 'Agent Settlements', 
    icon: Users, 
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' 
  },
  payroll: { 
    label: 'Payroll', 
    icon: Wallet, 
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' 
  },
  other: { 
    label: 'Other', 
    icon: Receipt, 
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' 
  },
};

const STATUS_COLORS: Record<string, string> = {
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  denied: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export function ExpensesTab() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  // Fetch data from all sources
  const { data: expenses, isLoading: expensesLoading } = useAllExpenses({});
  const { data: settlements, isLoading: settlementsLoading } = useSettlements({});
  const { data: payrollRuns, isLoading: payrollLoading } = usePayrollRuns();
  const { data: exchangeRates } = useExchangeRates();

  const isLoading = expensesLoading || settlementsLoading || payrollLoading;

  // Combine all data into unified format
  const unifiedExpenses = useMemo<UnifiedExpense[]>(() => {
    if (!exchangeRates) return [];

    const items: UnifiedExpense[] = [];

    // Add operational expenses (only approved ones count as actual expenses)
    expenses?.forEach(expense => {
      if (expense.status === 'approved') {
        items.push({
          id: `exp-${expense.id}`,
          date: expense.created_at || '',
          category: 'operational',
          description: expense.description || expense.category,
          reference: `EXP-${expense.id.slice(0, 8).toUpperCase()}`,
          amount: expense.amount,
          currency: expense.currency || 'USD',
          amountInTzs: convertToTZS(expense.amount, expense.currency || 'USD', exchangeRates),
          status: expense.status,
          source: 'expenses',
        });
      }
    });

    // Add agent settlements (payments to agents)
    settlements?.forEach(settlement => {
      if (settlement.settlement_type === 'payment_to_agent' && ['approved', 'paid'].includes(settlement.status)) {
        items.push({
          id: `set-${settlement.id}`,
          date: settlement.created_at,
          category: 'agent_settlement',
          description: `Agent Settlement - ${settlement.settlement_number}`,
          reference: settlement.settlement_number,
          amount: settlement.total_amount,
          currency: settlement.currency,
          amountInTzs: settlement.amount_in_tzs || convertToTZS(settlement.total_amount, settlement.currency, exchangeRates),
          status: settlement.status,
          source: 'settlements',
        });
      }
    });

    // Add payroll disbursements
    payrollRuns?.forEach(payroll => {
      if (['approved', 'paid'].includes(payroll.status) && payroll.total_net) {
        items.push({
          id: `pay-${payroll.id}`,
          date: payroll.paid_at || payroll.run_date,
          category: 'payroll',
          description: `Payroll - ${format(new Date(payroll.period_year, payroll.period_month - 1), 'MMMM yyyy')}`,
          reference: payroll.payroll_number,
          amount: payroll.total_net,
          currency: payroll.currency,
          amountInTzs: convertToTZS(payroll.total_net, payroll.currency, exchangeRates),
          status: payroll.status,
          source: 'payroll',
        });
      }
    });

    // Sort by date descending
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, settlements, payrollRuns, exchangeRates]);

  // Apply filters
  const filteredExpenses = useMemo(() => {
    return unifiedExpenses.filter(item => {
      // Search filter
      if (search && !item.description.toLowerCase().includes(search.toLowerCase()) &&
          !item.reference.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      // Category filter
      if (categoryFilter !== 'all' && item.category !== categoryFilter) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }
      // Date filters
      if (dateFrom && new Date(item.date) < dateFrom) {
        return false;
      }
      if (dateTo && new Date(item.date) > dateTo) {
        return false;
      }
      return true;
    });
  }, [unifiedExpenses, search, categoryFilter, statusFilter, dateFrom, dateTo]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const stats = {
      operational: { amount: 0, count: 0 },
      agent_settlement: { amount: 0, count: 0 },
      payroll: { amount: 0, count: 0 },
      other: { amount: 0, count: 0 },
      total: { amount: 0, count: 0 },
      thisMonth: { amount: 0, count: 0 },
    };

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    filteredExpenses.forEach(item => {
      stats[item.category].amount += item.amountInTzs;
      stats[item.category].count += 1;
      stats.total.amount += item.amountInTzs;
      stats.total.count += 1;

      if (new Date(item.date) >= thisMonthStart) {
        stats.thisMonth.amount += item.amountInTzs;
        stats.thisMonth.count += 1;
      }
    });

    return stats;
  }, [filteredExpenses]);

  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasActiveFilters = search || categoryFilter !== 'all' || statusFilter !== 'all' || dateFrom || dateTo;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Company Expenses</h2>
        <p className="text-sm text-muted-foreground">
          Comprehensive view of all company outflows including operations, agent payments, and payroll
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">TZS {summaryStats.total.amount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{summaryStats.total.count} transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">TZS {summaryStats.thisMonth.amount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{summaryStats.thisMonth.count} transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Operational
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">TZS {summaryStats.operational.amount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{summaryStats.operational.count} expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Agent Settlements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">TZS {summaryStats.agent_settlement.amount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{summaryStats.agent_settlement.count} settlements</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Payroll
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">TZS {summaryStats.payroll.amount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{summaryStats.payroll.count} runs</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by description or reference..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="operational">Operational</SelectItem>
                <SelectItem value="agent_settlement">Agent Settlements</SelectItem>
                <SelectItem value="payroll">Payroll</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[140px]", dateFrom && "text-foreground")}>
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {dateFrom ? format(dateFrom, 'MMM d, yyyy') : 'From Date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[140px]", dateTo && "text-foreground")}>
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {dateTo ? format(dateTo, 'MMM d, yyyy') : 'To Date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} />
              </PopoverContent>
            </Popover>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">TZS Equivalent</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No expenses found matching your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((item) => {
                    const CategoryIcon = CATEGORY_CONFIG[item.category].icon;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(item.date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={CATEGORY_CONFIG[item.category].color}>
                            <CategoryIcon className="h-3 w-3 mr-1" />
                            {CATEGORY_CONFIG[item.category].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[250px] truncate">
                          {item.description}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {item.reference}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {CURRENCY_SYMBOLS[item.currency] || item.currency}{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          TZS {item.amountInTzs.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[item.status] || STATUS_COLORS.pending}>
                            {item.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
