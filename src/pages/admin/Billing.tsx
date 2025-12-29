import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileStack, ReceiptText, Package, Users } from 'lucide-react';

// Import invoice content
import { InvoicesTabContent } from '@/components/admin/billing/InvoicesTabContent';
import { EstimatesTabContent } from '@/components/admin/billing/EstimatesTabContent';
import { AgentCargoBilling } from '@/components/admin/AgentCargoBilling';
import { B2BInvoices } from '@/components/admin/B2BInvoices';

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState('invoices');

  return (
    <AdminLayout title="Billing" subtitle="Manage invoices and estimates">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <FileStack className="h-4 w-4" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="estimates" className="flex items-center gap-2">
            <ReceiptText className="h-4 w-4" />
            Estimates
          </TabsTrigger>
          <TabsTrigger value="b2b" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            B2B Agents
          </TabsTrigger>
          <TabsTrigger value="agent-cargo" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Agent Cargo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-6">
          <InvoicesTabContent />
        </TabsContent>

        <TabsContent value="estimates" className="space-y-6">
          <EstimatesTabContent />
        </TabsContent>

        <TabsContent value="b2b" className="space-y-6">
          <B2BInvoices />
        </TabsContent>

        <TabsContent value="agent-cargo" className="space-y-6">
          <AgentCargoBilling />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
