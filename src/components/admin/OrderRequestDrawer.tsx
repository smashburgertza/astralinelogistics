import { format } from 'date-fns';
import { ExternalLink, Package, Mail, Phone, MapPin, Clock, DollarSign } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderRequest, useOrderItems, useUpdateOrderStatus } from '@/hooks/useOrderRequests';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

interface OrderRequestDrawerProps {
  order: OrderRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'purchasing', label: 'Purchasing', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  { value: 'shipped', label: 'Shipped', color: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-300' },
];

export function OrderRequestDrawer({ order, open, onOpenChange }: OrderRequestDrawerProps) {
  const { data: items, isLoading: itemsLoading } = useOrderItems(order?.id || null);
  const updateStatus = useUpdateOrderStatus();
  const [status, setStatus] = useState(order?.status || 'pending');
  const [notes, setNotes] = useState(order?.notes || '');

  useEffect(() => {
    if (order) {
      setStatus(order.status);
      setNotes(order.notes || '');
    }
  }, [order]);

  const handleSave = async () => {
    if (!order) return;
    
    try {
      await updateStatus.mutateAsync({ id: order.id, status, notes });
      toast.success('Order updated successfully');
    } catch (error) {
      toast.error('Failed to update order');
    }
  };

  const getStatusBadge = (statusValue: string) => {
    const statusConfig = ORDER_STATUSES.find(s => s.value === statusValue);
    return statusConfig || ORDER_STATUSES[0];
  };

  if (!order) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col h-full p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Request
          </SheetTitle>
          <SheetDescription>
            Submitted {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 py-6">
            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      <Badge variant="outline" className={s.color}>
                        {s.label}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Customer Info */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Customer Details
              </h4>
              <div className="grid gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{order.customer_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <a href={`mailto:${order.customer_email}`} className="hover:text-primary">
                    {order.customer_email}
                  </a>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <a href={`tel:${order.customer_phone}`} className="hover:text-primary">
                    {order.customer_phone}
                  </a>
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{order.customer_address}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Order Items */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Products ({items?.length || 0})
              </h4>
              {itemsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {items?.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg bg-muted/50 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {item.product_name || 'Unknown Product'}
                          </p>
                          <a
                            href={item.product_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                          >
                            View product <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        <Badge variant="secondary">×{item.quantity}</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {item.currency} {item.product_price?.toFixed(2) || '—'} each
                        </span>
                        <span className="font-medium">
                          {item.currency} {item.subtotal?.toFixed(2) || '—'}
                        </span>
                      </div>
                      {item.estimated_weight_kg && (
                        <p className="text-xs text-muted-foreground">
                          Est. weight: {item.estimated_weight_kg} kg × {item.quantity} = {(item.estimated_weight_kg * item.quantity).toFixed(2)} kg
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Order Summary */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Order Summary
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Product Total</span>
                  <span>${Number(order.total_product_cost).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Est. Shipping</span>
                  <span>${Number(order.estimated_shipping_cost).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Handling Fee</span>
                  <span>${Number(order.handling_fee).toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-base">
                  <span>Grand Total</span>
                  <span className="text-primary">${Number(order.grand_total).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Admin Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add internal notes about this order..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>

        {/* Fixed Save Button at Bottom */}
        <div className="px-6 py-4 border-t bg-background">
          <Button
            onClick={handleSave}
            disabled={updateStatus.isPending}
            className="w-full"
          >
            {updateStatus.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
