import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, RefreshCw } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import { useTrialBalance, useIncomeStatement, useBalanceSheet } from '@/hooks/useAccounting';

export function FinancialReportsTab() {
  const [reportTab, setReportTab] = useState('trial-balance');
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfYear(today), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(today, 'yyyy-MM-dd'));
  const [asOfDate, setAsOfDate] = useState(format(today, 'yyyy-MM-dd'));

  const { data: trialBalance = [], isLoading: loadingTB, refetch: refetchTB } = useTrialBalance(asOfDate);
  const { data: incomeStatement, isLoading: loadingIS, refetch: refetchIS } = useIncomeStatement(startDate, endDate);
  const { data: balanceSheet, isLoading: loadingBS, refetch: refetchBS } = useBalanceSheet(asOfDate);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Reports</CardTitle>
        <CardDescription>Generate and view financial statements</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={reportTab} onValueChange={setReportTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
            <TabsTrigger value="income-statement">Income Statement</TabsTrigger>
            <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
          </TabsList>

          <TabsContent value="trial-balance" className="space-y-4">
            <div className="flex items-end gap-4">
              <div className="space-y-2">
                <Label>As of Date</Label>
                <Input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="w-48"
                />
              </div>
              <Button variant="outline" onClick={() => refetchTB()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

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
          </TabsContent>

          <TabsContent value="income-statement" className="space-y-4">
            <div className="flex items-end gap-4">
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
              <Button variant="outline" onClick={() => refetchIS()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            {loadingIS ? (
              <div className="text-center py-8">Loading...</div>
            ) : incomeStatement ? (
              <div className="space-y-6">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-green-50">
                        <TableHead colSpan={2} className="text-green-800 font-bold">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incomeStatement.revenue.map((account: any) => (
                        <TableRow key={account.id}>
                          <TableCell className="pl-8">{account.account_name}</TableCell>
                          <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold bg-green-50">
                        <TableCell>Total Revenue</TableCell>
                        <TableCell className="text-right">{formatCurrency(incomeStatement.totalRevenue)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-red-50">
                        <TableHead colSpan={2} className="text-red-800 font-bold">Expenses</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incomeStatement.expenses.map((account: any) => (
                        <TableRow key={account.id}>
                          <TableCell className="pl-8">{account.account_name}</TableCell>
                          <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold bg-red-50">
                        <TableCell>Total Expenses</TableCell>
                        <TableCell className="text-right">{formatCurrency(incomeStatement.totalExpenses)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <Card className={incomeStatement.netIncome >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-center text-xl font-bold">
                      <span>Net {incomeStatement.netIncome >= 0 ? 'Profit' : 'Loss'}</span>
                      <span className={incomeStatement.netIncome >= 0 ? 'text-green-700' : 'text-red-700'}>
                        {formatCurrency(Math.abs(incomeStatement.netIncome))}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="balance-sheet" className="space-y-4">
            <div className="flex items-end gap-4">
              <div className="space-y-2">
                <Label>As of Date</Label>
                <Input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="w-48"
                />
              </div>
              <Button variant="outline" onClick={() => refetchBS()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

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
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
