import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Package, 
  Clock, 
  CheckCircle, 
  Truck, 
  ShoppingCart,
  CreditCard,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';

type OrderStatus = 'pending' | 'confirmed' | 'purchased' | 'shipped' | 'delivered' | 'cancelled';

const ORDER_STATUSES: { key: OrderStatus; label: string; icon: React.ElementType }[] = [
  { key: 'pending', label: 'Pending Review', icon: Clock },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'purchased', label: 'Purchased', icon: CreditCard },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Package },
];

interface OrderRequest {
  id: string;
  status: string;
  customer_name: string;
  customer_email: string;
  total_product_cost: number;
  estimated_shipping_cost: number;
  handling_fee: number;
  grand_total: number;
  created_at: string;
  updated_at: string;
  notes: string | null;
}

interface OrderItem {
  id: string;
  product_name: string | null;
  product_url: string;
  product_price: number | null;
  quantity: number;
  currency: string | null;
}

export default function OrderTracking() {
  const [searchEmail, setSearchEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['order-tracking', submittedEmail],
    queryFn: async () => {
      if (!submittedEmail) return [];
      
      const { data, error } = await supabase
        .from('order_requests')
        .select('*')
        .eq('customer_email', submittedEmail.toLowerCase())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as OrderRequest[];
    },
    enabled: !!submittedEmail,
  });

  const { data: orderItems } = useQuery({
    queryKey: ['order-items', orders?.map(o => o.id)],
    queryFn: async () => {
      if (!orders?.length) return {};
      
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .in('order_request_id', orders.map(o => o.id));

      if (error) throw error;
      
      // Group by order_request_id
      const grouped: Record<string, OrderItem[]> = {};
      data?.forEach(item => {
        if (item.order_request_id) {
          if (!grouped[item.order_request_id]) {
            grouped[item.order_request_id] = [];
          }
          grouped[item.order_request_id].push(item as OrderItem);
        }
      });
      return grouped;
    },
    enabled: !!orders?.length,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedEmail(searchEmail.trim());
  };

  const getStatusIndex = (status: string): number => {
    const index = ORDER_STATUSES.findIndex(s => s.key === status);
    return index >= 0 ? index : 0;
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'delivered': return 'default';
      case 'cancelled': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'outline';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Hero Section */}
      <section className="pt-32 pb-12 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Track Your Order
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Enter the email address you used when placing your Shop For Me order to view its status.
          </p>
        </div>
      </section>

      {/* Search Section */}
      <section className="pb-8 px-4">
        <div className="container mx-auto max-w-xl">
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Track'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Results Section */}
      <section className="pb-20 px-4">
        <div className="container mx-auto max-w-3xl space-y-6">
          {submittedEmail && !isLoading && orders?.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Orders Found</h3>
                  <p className="text-muted-foreground">
                    We couldn't find any orders associated with {submittedEmail}.
                    Please check your email address and try again.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {orders?.map((order) => {
            const statusIndex = getStatusIndex(order.status);
            const items = orderItems?.[order.id] || [];
            const isCancelled = order.status === 'cancelled';

            return (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="bg-muted/30">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" />
                        Order #{order.id.slice(0, 8).toUpperCase()}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Placed on {format(new Date(order.created_at), 'PPP')}
                      </p>
                    </div>
                    <Badge variant={getStatusVariant(order.status)} className="w-fit">
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {/* Progress Indicator */}
                  {!isCancelled && (
                    <div className="relative">
                      <div className="flex justify-between">
                        {ORDER_STATUSES.map((status, index) => {
                          const Icon = status.icon;
                          const isActive = index <= statusIndex;
                          const isCurrent = index === statusIndex;
                          
                          return (
                            <div 
                              key={status.key} 
                              className="flex flex-col items-center relative z-10"
                            >
                              <div 
                                className={`
                                  w-10 h-10 rounded-full flex items-center justify-center
                                  transition-colors duration-300
                                  ${isActive 
                                    ? 'bg-primary text-primary-foreground' 
                                    : 'bg-muted text-muted-foreground'
                                  }
                                  ${isCurrent ? 'ring-4 ring-primary/30' : ''}
                                `}
                              >
                                <Icon className="h-5 w-5" />
                              </div>
                              <span 
                                className={`
                                  text-xs mt-2 text-center max-w-[60px]
                                  ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}
                                `}
                              >
                                {status.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {/* Progress Line */}
                      <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted -z-0">
                        <div 
                          className="h-full bg-primary transition-all duration-500"
                          style={{ 
                            width: `${(statusIndex / (ORDER_STATUSES.length - 1)) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {isCancelled && (
                    <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-center">
                      <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                      <p className="font-medium">This order has been cancelled</p>
                    </div>
                  )}

                  <Separator />

                  {/* Order Items */}
                  <div>
                    <h4 className="font-medium mb-3">Items ({items.length})</h4>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div 
                          key={item.id} 
                          className="flex justify-between items-center text-sm bg-muted/30 p-3 rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {item.product_name || 'Product'}
                            </p>
                            <p className="text-muted-foreground text-xs truncate">
                              Qty: {item.quantity}
                            </p>
                          </div>
                          {item.product_price && (
                            <span className="ml-4 font-medium">
                              {item.currency} {item.product_price.toFixed(2)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Order Summary */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Product Cost</span>
                      <span>{formatCurrency(order.total_product_cost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estimated Shipping</span>
                      <span>{formatCurrency(order.estimated_shipping_cost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Handling Fee</span>
                      <span>{formatCurrency(order.handling_fee)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold text-base">
                      <span>Grand Total</span>
                      <span className="text-primary">{formatCurrency(order.grand_total)}</span>
                    </div>
                  </div>

                  {order.notes && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-2">Notes</h4>
                        <p className="text-sm text-muted-foreground">{order.notes}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
