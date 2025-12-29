import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AccountingDashboard } from '@/components/admin/accounting/AccountingDashboard';
import { TransactionsTab } from '@/components/admin/accounting/TransactionsTab';
import { ChartOfAccountsTab } from '@/components/admin/accounting/ChartOfAccountsTab';
import { FinancialReportsTab } from '@/components/admin/accounting/FinancialReportsTab';
import { BankAccountsTab } from '@/components/admin/accounting/BankAccountsTab';
import { LayoutDashboard, Receipt, List, FileText, Landmark } from 'lucide-react';

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

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
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
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
