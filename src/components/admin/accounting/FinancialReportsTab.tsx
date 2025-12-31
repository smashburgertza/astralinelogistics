import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Download, 
  RefreshCw, 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  FileText,
  Calendar,
  ArrowLeftRight
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, subMonths, subYears } from 'date-fns';
import { useTrialBalance, useIncomeStatement, useBalanceSheet } from '@/hooks/useAccounting';
import { AgingReportsTab } from './AgingReportsTab';

const REPORT_CARDS = [
  {
    id: 'trial-balance',
    title: 'Trial Balance',
    description: 'Account balances at a point in time',
    icon: BarChart3,
    color: 'bg-blue-500',
  },
  {
    id: 'income-statement',
    title: 'Income Statement',
    description: 'Revenue and expenses over a period',
    icon: TrendingUp,
    color: 'bg-green-500',
  },
  {
    id: 'balance-sheet',
    title: 'Balance Sheet',
    description: 'Assets, liabilities, and equity',
    icon: PieChart,
    color: 'bg-purple-500',
  },
  {
    id: 'aging',
    title: 'AR/AP Aging',
    description: 'Receivables and payables aging',
    icon: FileText,
    color: 'bg-orange-500',
  },
];

const DATE_PRESETS = [
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'This Year', value: 'this_year' },
  { label: 'Last Year', value: 'last_year' },
  { label: 'Custom', value: 'custom' },
];

export function FinancialReportsTab() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState('this_year');
  const [compareMode, setCompareMode] = useState(false);
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfYear(today), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(today, 'yyyy-MM-dd'));
  const [asOfDate, setAsOfDate] = useState(format(today, 'yyyy-MM-dd'));

  // Comparison period
  const [compareStartDate, setCompareStartDate] = useState(format(startOfYear(subYears(today, 1)), 'yyyy-MM-dd'));
  const [compareEndDate, setCompareEndDate] = useState(format(subYears(today, 1), 'yyyy-MM-dd'));

  const { data: trialBalance = [], isLoading: loadingTB, refetch: refetchTB } = useTrialBalance(asOfDate);
  const { data: incomeStatement, isLoading: loadingIS, refetch: refetchIS } = useIncomeStatement(startDate, endDate);
  const { data: compareIncomeStatement } = useIncomeStatement(compareStartDate, compareEndDate);
  const { data: balanceSheet, isLoading: loadingBS, refetch: refetchBS } = useBalanceSheet(asOfDate);

  const handleDatePreset = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    
    switch (preset) {
      case 'this_month':
        setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        setAsOfDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        // Comparison: last month
        const lastMonth = subMonths(now, 1);
        setCompareStartDate(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
        setCompareEndDate(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
        break;
      case 'last_month':
        const lm = subMonths(now, 1);
        setStartDate(format(startOfMonth(lm), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(lm), 'yyyy-MM-dd'));
        setAsOfDate(format(endOfMonth(lm), 'yyyy-MM-dd'));
        // Comparison: month before
        const lm2 = subMonths(now, 2);
        setCompareStartDate(format(startOfMonth(lm2), 'yyyy-MM-dd'));
        setCompareEndDate(format(endOfMonth(lm2), 'yyyy-MM-dd'));
        break;
      case 'this_year':
        setStartDate(format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd'));
        setEndDate(format(now, 'yyyy-MM-dd'));
        setAsOfDate(format(now, 'yyyy-MM-dd'));
        // Comparison: last year same period
        setCompareStartDate(format(new Date(now.getFullYear() - 1, 0, 1), 'yyyy-MM-dd'));
        setCompareEndDate(format(subYears(now, 1), 'yyyy-MM-dd'));
        break;
      case 'last_year':
        setStartDate(format(new Date(now.getFullYear() - 1, 0, 1), 'yyyy-MM-dd'));
        setEndDate(format(new Date(now.getFullYear() - 1, 11, 31), 'yyyy-MM-dd'));
        setAsOfDate(format(new Date(now.getFullYear() - 1, 11, 31), 'yyyy-MM-dd'));
        // Comparison: year before
        setCompareStartDate(format(new Date(now.getFullYear() - 2, 0, 1), 'yyyy-MM-dd'));
        setCompareEndDate(format(new Date(now.getFullYear() - 2, 11, 31), 'yyyy-MM-dd'));
        break;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const exportToCSV = (reportName: string, data: any[]) => {
    let csv = '';
    if (reportName === 'trial-balance') {
      csv = 'Account Code,Account Name,Debit,Credit\n';
      data.forEach((row: any) => {
        const debit = row.normal_balance === 'debit' && row.balance > 0 ? row.balance : (row.normal_balance === 'credit' && row.balance < 0 ? Math.abs(row.balance) : 0);
        const credit = row.normal_balance === 'credit' && row.balance > 0 ? row.balance : (row.normal_balance === 'debit' && row.balance < 0 ? Math.abs(row.balance) : 0);
        csv += `${row.account_code},"${row.account_name}",${debit},${credit}\n`;
      });
    } else if (reportName === 'income-statement' && incomeStatement) {
      csv = 'Account,Amount\n';
      csv += 'REVENUE\n';
      incomeStatement.revenue.forEach((r: any) => {
        csv += `"${r.account_name}",${r.balance}\n`;
      });
      csv += `Total Revenue,${incomeStatement.totalRevenue}\n`;
      csv += '\nEXPENSES\n';
      incomeStatement.expenses.forEach((e: any) => {
        csv += `"${e.account_name}",${e.balance}\n`;
      });
      csv += `Total Expenses,${incomeStatement.totalExpenses}\n`;
      csv += `\nNet Income,${incomeStatement.netIncome}\n`;
    }
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportName}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  // Report selector view
  if (!selectedReport) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial Reports</CardTitle>
          <CardDescription>Select a report to view</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {REPORT_CARDS.map((report) => (
              <Card 
                key={report.id}
                className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
                onClick={() => setSelectedReport(report.id)}
              >
                <CardContent className="pt-6">
                  <div className={`w-12 h-12 rounded-lg ${report.color} flex items-center justify-center mb-4`}>
                    <report.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{report.title}</h3>
                  <p className="text-sm text-muted-foreground">{report.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedReport(null)} className="mb-2">
              ← Back to Reports
            </Button>
            <CardTitle>
              {REPORT_CARDS.find(r => r.id === selectedReport)?.title}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Select value={datePreset} onValueChange={handleDatePreset}>
              <SelectTrigger className="w-40">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedReport === 'income-statement' && (
              <Button
                variant={compareMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCompareMode(!compareMode)}
              >
                <ArrowLeftRight className="h-4 w-4 mr-2" />
                Compare
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={() => exportToCSV(selectedReport, selectedReport === 'trial-balance' ? trialBalance : [])}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {datePreset === 'custom' && (
          <div className="flex gap-4 mb-4 p-4 bg-muted rounded-lg">
            {selectedReport === 'trial-balance' || selectedReport === 'balance-sheet' ? (
              <div className="space-y-2">
                <Label>As of Date</Label>
                <Input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="w-48"
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-48"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-48"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Trial Balance */}
        {selectedReport === 'trial-balance' && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingTB ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">Loading...</TableCell>
                  </TableRow>
                ) : trialBalance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {trialBalance.map((account: any) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-mono">{account.account_code}</TableCell>
                        <TableCell>{account.account_name}</TableCell>
                        <TableCell className="text-right">
                          {account.normal_balance === 'debit' && account.balance > 0 
                            ? formatCurrency(account.balance) 
                            : account.normal_balance === 'credit' && account.balance < 0
                              ? formatCurrency(Math.abs(account.balance))
                              : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {account.normal_balance === 'credit' && account.balance > 0 
                            ? formatCurrency(account.balance) 
                            : account.normal_balance === 'debit' && account.balance < 0
                              ? formatCurrency(Math.abs(account.balance))
                              : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={2}>Total</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(trialBalance.reduce((sum: number, a: any) => 
                          sum + (a.normal_balance === 'debit' ? Math.max(0, a.balance) : Math.max(0, -a.balance)), 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(trialBalance.reduce((sum: number, a: any) => 
                          sum + (a.normal_balance === 'credit' ? Math.max(0, a.balance) : Math.max(0, -a.balance)), 0))}
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Income Statement */}
        {selectedReport === 'income-statement' && (
          <>
            {loadingIS ? (
              <div className="text-center py-8">Loading...</div>
            ) : incomeStatement ? (
              <div className="space-y-6">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-green-50">
                        <TableHead colSpan={compareMode ? 1 : 2} className="text-green-800 font-bold">Revenue</TableHead>
                        {compareMode && (
                          <>
                            <TableHead className="text-right text-green-800">Current</TableHead>
                            <TableHead className="text-right text-green-800">Previous</TableHead>
                            <TableHead className="text-right text-green-800">Change</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incomeStatement.revenue.map((account: any) => {
                        const prevAccount = compareIncomeStatement?.revenue.find((a: any) => a.id === account.id);
                        const change = prevAccount ? calculateChange(account.balance, prevAccount.balance) : 0;
                        return (
                          <TableRow key={account.id}>
                            <TableCell className="pl-8">{account.account_name}</TableCell>
                            {!compareMode && <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>}
                            {compareMode && (
                              <>
                                <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {prevAccount ? formatCurrency(prevAccount.balance) : '-'}
                                </TableCell>
                                <TableCell className={`text-right ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        );
                      })}
                      <TableRow className="font-bold bg-green-50">
                        <TableCell>Total Revenue</TableCell>
                        {!compareMode && <TableCell className="text-right">{formatCurrency(incomeStatement.totalRevenue)}</TableCell>}
                        {compareMode && (
                          <>
                            <TableCell className="text-right">{formatCurrency(incomeStatement.totalRevenue)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {compareIncomeStatement ? formatCurrency(compareIncomeStatement.totalRevenue) : '-'}
                            </TableCell>
                            <TableCell className={`text-right ${
                              compareIncomeStatement && calculateChange(incomeStatement.totalRevenue, compareIncomeStatement.totalRevenue) >= 0 
                                ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {compareIncomeStatement 
                                ? `${calculateChange(incomeStatement.totalRevenue, compareIncomeStatement.totalRevenue) >= 0 ? '+' : ''}${calculateChange(incomeStatement.totalRevenue, compareIncomeStatement.totalRevenue).toFixed(1)}%`
                                : '-'}
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-red-50">
                        <TableHead colSpan={compareMode ? 1 : 2} className="text-red-800 font-bold">Expenses</TableHead>
                        {compareMode && (
                          <>
                            <TableHead className="text-right text-red-800">Current</TableHead>
                            <TableHead className="text-right text-red-800">Previous</TableHead>
                            <TableHead className="text-right text-red-800">Change</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incomeStatement.expenses.map((account: any) => {
                        const prevAccount = compareIncomeStatement?.expenses.find((a: any) => a.id === account.id);
                        const change = prevAccount ? calculateChange(account.balance, prevAccount.balance) : 0;
                        return (
                          <TableRow key={account.id}>
                            <TableCell className="pl-8">{account.account_name}</TableCell>
                            {!compareMode && <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>}
                            {compareMode && (
                              <>
                                <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {prevAccount ? formatCurrency(prevAccount.balance) : '-'}
                                </TableCell>
                                <TableCell className={`text-right ${change <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        );
                      })}
                      <TableRow className="font-bold bg-red-50">
                        <TableCell>Total Expenses</TableCell>
                        {!compareMode && <TableCell className="text-right">{formatCurrency(incomeStatement.totalExpenses)}</TableCell>}
                        {compareMode && (
                          <>
                            <TableCell className="text-right">{formatCurrency(incomeStatement.totalExpenses)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {compareIncomeStatement ? formatCurrency(compareIncomeStatement.totalExpenses) : '-'}
                            </TableCell>
                            <TableCell className={`text-right ${
                              compareIncomeStatement && calculateChange(incomeStatement.totalExpenses, compareIncomeStatement.totalExpenses) <= 0 
                                ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {compareIncomeStatement 
                                ? `${calculateChange(incomeStatement.totalExpenses, compareIncomeStatement.totalExpenses) >= 0 ? '+' : ''}${calculateChange(incomeStatement.totalExpenses, compareIncomeStatement.totalExpenses).toFixed(1)}%`
                                : '-'}
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <Card className={incomeStatement.netIncome >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold">Net {incomeStatement.netIncome >= 0 ? 'Profit' : 'Loss'}</span>
                      <div className="text-right">
                        <span className={`text-xl font-bold ${incomeStatement.netIncome >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {formatCurrency(Math.abs(incomeStatement.netIncome))}
                        </span>
                        {compareMode && compareIncomeStatement && (
                          <p className={`text-sm ${
                            calculateChange(incomeStatement.netIncome, compareIncomeStatement.netIncome) >= 0 
                              ? 'text-green-600' : 'text-red-600'
                          }`}>
                            vs {formatCurrency(Math.abs(compareIncomeStatement.netIncome))} ({
                              calculateChange(incomeStatement.netIncome, compareIncomeStatement.netIncome) >= 0 ? '+' : ''
                            }{calculateChange(incomeStatement.netIncome, compareIncomeStatement.netIncome).toFixed(1)}%)
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </>
        )}

        {/* Balance Sheet */}
        {selectedReport === 'balance-sheet' && (
          <>
            {loadingBS ? (
              <div className="text-center py-8">Loading...</div>
            ) : balanceSheet ? (
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-blue-50">
                          <TableHead colSpan={2} className="text-blue-800 font-bold">Assets</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {balanceSheet.assets.map((account: any) => (
                          <TableRow key={account.id}>
                            <TableCell className="pl-8">{account.account_name}</TableCell>
                            <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-bold bg-blue-50">
                          <TableCell>Total Assets</TableCell>
                          <TableCell className="text-right">{formatCurrency(balanceSheet.totalAssets)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-red-50">
                          <TableHead colSpan={2} className="text-red-800 font-bold">Liabilities</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {balanceSheet.liabilities.map((account: any) => (
                          <TableRow key={account.id}>
                            <TableCell className="pl-8">{account.account_name}</TableCell>
                            <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-bold bg-red-50">
                          <TableCell>Total Liabilities</TableCell>
                          <TableCell className="text-right">{formatCurrency(balanceSheet.totalLiabilities)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-purple-50">
                          <TableHead colSpan={2} className="text-purple-800 font-bold">Equity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {balanceSheet.equity.map((account: any) => (
                          <TableRow key={account.id}>
                            <TableCell className="pl-8">{account.account_name}</TableCell>
                            <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-bold bg-purple-50">
                          <TableCell>Total Equity</TableCell>
                          <TableCell className="text-right">{formatCurrency(balanceSheet.totalEquity)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  <Card className="bg-muted">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-center font-bold">
                        <span>Total Liabilities + Equity</span>
                        <span>{formatCurrency(balanceSheet.totalLiabilities + balanceSheet.totalEquity)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : null}
          </>
        )}

        {/* Aging Reports */}
        {selectedReport === 'aging' && <AgingReportsTab />}
      </CardContent>
    </Card>
  );
}
