import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { OrderRequestTable } from '@/components/admin/OrderRequestTable';
import { useOrderRequests } from '@/hooks/useOrderRequests';
import { ShoppingCart, Clock, CheckCircle, XCircle, Filter, Search, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'purchasing', label: 'Purchasing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function AdminOrderRequestsPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const { data: orders, isLoading } = useOrderRequests();

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    
    let filtered = orders;
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === statusFilter);
    }
    
    // Filter by search query (name or email)
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase();
      filtered = filtered.filter(o => 
        o.customer_name.toLowerCase().includes(query) ||
        o.customer_email.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [orders, statusFilter, debouncedSearch]);

  const stats = {
    total: orders?.length || 0,
    pending: orders?.filter(o => o.status === 'pending').length || 0,
    completed: orders?.filter(o => o.status === 'completed').length || 0,
    cancelled: orders?.filter(o => o.status === 'cancelled').length || 0,
  };

  const hasFilters = statusFilter !== 'all' || searchQuery.trim() !== '';

  const clearFilters = () => {
    setStatusFilter('all');
    setSearchQuery('');
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

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full sm:w-[280px] bg-background"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            )}
          </div>

          <span className="text-sm text-muted-foreground sm:ml-auto">
            Showing {filteredOrders.length} of {stats.total} orders
          </span>
        </div>

        {/* Table */}
        <OrderRequestTable orders={filteredOrders} isLoading={isLoading} />
      </div>
    </AdminLayout>
  );
}
