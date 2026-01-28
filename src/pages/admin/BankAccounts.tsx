import { AdminLayout } from '@/components/layout/AdminLayout';
import { BankAccountsTab } from '@/components/admin/accounting/BankAccountsTab';

export default function BankAccountsPage() {
  return (
    <AdminLayout 
      title="Bank Accounts" 
      subtitle="Manage your bank and mobile money accounts"
    >
      <BankAccountsTab />
    </AdminLayout>
  );
}
