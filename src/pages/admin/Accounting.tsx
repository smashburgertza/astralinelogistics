import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AccountingDashboard } from '@/components/admin/accounting/AccountingDashboard';
import { TransactionsTab } from '@/components/admin/accounting/TransactionsTab';
import { ChartOfAccountsTab } from '@/components/admin/accounting/ChartOfAccountsTab';
import { FinancialReportsTab } from '@/components/admin/accounting/FinancialReportsTab';
import { BankAccountsTab } from '@/components/admin/accounting/BankAccountsTab';
import { ProductsServicesTab } from '@/components/admin/accounting/ProductsServicesTab';
import { ExpensesTab } from '@/components/admin/accounting/ExpensesTab';
import { usePendingExpenses } from '@/hooks/useExpenses';
import { LayoutDashboard, Receipt, List, FileText, Landmark, Package, Wallet } from 'lucide-react';

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { data: pendingExpenses } = usePendingExpenses();
  const pendingCount = pendingExpenses?.length || 0;

  return (
    <AdminLayout title="Accounting">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounting</h1>
          <p className="text-muted-foreground">
            Track your income, expenses, and financial health
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-flex">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-2 relative">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Expenses</span>
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1.5 text-xs">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Products & Services</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Transactions</span>
            </TabsTrigger>
            <TabsTrigger value="accounts" className="flex items-center gap-2">
              <Landmark className="h-4 w-4" />
              <span className="hidden sm:inline">Bank Accounts</span>
            </TabsTrigger>
            <TabsTrigger value="chart" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Chart of Accounts</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <AccountingDashboard />
          </TabsContent>

          <TabsContent value="expenses">
            <ExpensesTab />
          </TabsContent>

          <TabsContent value="products">
            <ProductsServicesTab />
          </TabsContent>

          <TabsContent value="transactions">
            <TransactionsTab />
          </TabsContent>

          <TabsContent value="accounts">
            <BankAccountsTab />
          </TabsContent>

          <TabsContent value="chart">
            <ChartOfAccountsTab />
          </TabsContent>

          <TabsContent value="reports">
            <FinancialReportsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
