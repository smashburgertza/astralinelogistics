import { useState } from 'react';
import { format } from 'date-fns';
import { Eye, MoreHorizontal, Mail, Phone } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderRequest } from '@/hooks/useOrderRequests';
import { OrderRequestDrawer } from './OrderRequestDrawer';

interface OrderRequestTableProps {
  orders: OrderRequest[] | undefined;
  isLoading: boolean;
}

const ORDER_STATUSES: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  purchasing: { label: 'Purchasing', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  shipped: { label: 'Shipped', color: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800 border-green-300' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-300' },
};

export function OrderRequestTable({ orders, isLoading }: OrderRequestTableProps) {
  const [selectedOrder, setSelectedOrder] = useState<OrderRequest | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleViewOrder = (order: OrderRequest) => {
    setSelectedOrder(order);
    setDrawerOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No order requests found.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Customer</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const statusConfig = ORDER_STATUSES[order.status] || ORDER_STATUSES.pending;

              return (
                <TableRow
                  key={order.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewOrder(order)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.customer_name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {order.customer_address}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                      <a
                        href={`mailto:${order.customer_email}`}
                        className="flex items-center gap-1 hover:text-primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Mail className="h-3 w-3" />
                        <span className="truncate max-w-[150px]">{order.customer_email}</span>
                      </a>
                      <a
                        href={`tel:${order.customer_phone}`}
                        className="flex items-center gap-1 hover:text-primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="h-3 w-3" />
                        {order.customer_phone}
                      </a>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold text-primary">
                      ${(Number(order.total_product_cost) + Number(order.estimated_duty || 0) + Number(order.estimated_shipping_cost) + Number(order.handling_fee)).toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusConfig.color}>
                      {statusConfig.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(order.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewOrder(order)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <OrderRequestDrawer
        order={selectedOrder}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </>
  );
}
