import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileStack, ReceiptText, ScanLine } from 'lucide-react';

// Import invoice content
import { InvoicesTabContent } from '@/components/admin/billing/InvoicesTabContent';
import { EstimatesTabContent } from '@/components/admin/billing/EstimatesTabContent';
import { ParcelCheckoutScanner } from '@/components/admin/billing/ParcelCheckoutScanner';

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState('invoices');

  return (
    <AdminLayout title="Billing" subtitle="Manage customer invoices and estimates">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <FileStack className="h-4 w-4" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="estimates" className="flex items-center gap-2">
            <ReceiptText className="h-4 w-4" />
            Estimates
          </TabsTrigger>
          <TabsTrigger value="checkout" className="flex items-center gap-2">
            <ScanLine className="h-4 w-4" />
            Parcel Checkout
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-6">
          <InvoicesTabContent />
        </TabsContent>

        <TabsContent value="estimates" className="space-y-6">
          <EstimatesTabContent />
        </TabsContent>

        <TabsContent value="checkout" className="space-y-6">
          <ParcelCheckoutScanner />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
