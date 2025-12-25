import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartOfAccountsTab } from '@/components/admin/accounting/ChartOfAccountsTab';
import { JournalEntriesTab } from '@/components/admin/accounting/JournalEntriesTab';
import { FinancialReportsTab } from '@/components/admin/accounting/FinancialReportsTab';
import { BankAccountsTab } from '@/components/admin/accounting/BankAccountsTab';
import { FiscalPeriodsTab } from '@/components/admin/accounting/FiscalPeriodsTab';
import { TaxRatesTab } from '@/components/admin/accounting/TaxRatesTab';

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState('chart-of-accounts');

  return (
    <AdminLayout title="Accounting">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounting</h1>
          <p className="text-muted-foreground">
            Manage your chart of accounts, journal entries, and financial reports
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="chart-of-accounts">Chart of Accounts</TabsTrigger>
            <TabsTrigger value="journal-entries">Journal Entries</TabsTrigger>
            <TabsTrigger value="reports">Financial Reports</TabsTrigger>
            <TabsTrigger value="bank-accounts">Bank Accounts</TabsTrigger>
            <TabsTrigger value="fiscal-periods">Fiscal Periods</TabsTrigger>
            <TabsTrigger value="tax-rates">Tax Rates</TabsTrigger>
          </TabsList>

          <TabsContent value="chart-of-accounts">
            <ChartOfAccountsTab />
          </TabsContent>

          <TabsContent value="journal-entries">
            <JournalEntriesTab />
          </TabsContent>

          <TabsContent value="reports">
            <FinancialReportsTab />
          </TabsContent>

          <TabsContent value="bank-accounts">
            <BankAccountsTab />
          </TabsContent>

          <TabsContent value="fiscal-periods">
            <FiscalPeriodsTab />
          </TabsContent>

          <TabsContent value="tax-rates">
            <TaxRatesTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
