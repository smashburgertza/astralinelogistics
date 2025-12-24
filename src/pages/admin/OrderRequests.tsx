import { AdminLayout } from '@/components/layout/AdminLayout';
import { OrderRequestTable } from '@/components/admin/OrderRequestTable';
import { useOrderRequests } from '@/hooks/useOrderRequests';
import { ShoppingCart, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function AdminOrderRequestsPage() {
  const { data: orders, isLoading } = useOrderRequests();

  const stats = {
    total: orders?.length || 0,
    pending: orders?.filter(o => o.status === 'pending').length || 0,
    completed: orders?.filter(o => o.status === 'completed').length || 0,
    cancelled: orders?.filter(o => o.status === 'cancelled').length || 0,
  };

  return (
    <AdminLayout 
      title="Shop For Me Orders" 
      subtitle="Manage customer order requests from the Shop For Me service"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <ShoppingCart className="h-4 w-4" />
              <span className="text-sm">Total Orders</span>
            </div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Pending</span>
            </div>
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Completed</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <XCircle className="h-4 w-4" />
              <span className="text-sm">Cancelled</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
          </div>
        </div>

        {/* Table */}
        <OrderRequestTable orders={orders} isLoading={isLoading} />
      </div>
    </AdminLayout>
  );
}
