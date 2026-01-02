import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { useCustomerOrders } from '@/hooks/useCustomerOrders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { Package, ExternalLink, ShoppingCart, Plus } from 'lucide-react';
import { ShoppingAggregator } from '@/components/shopping/ShoppingAggregator';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  processing: 'bg-blue-100 text-blue-800 border-blue-200',
  purchased: 'bg-purple-100 text-purple-800 border-purple-200',
  shipped: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};

export default function CustomerOrders() {
  const { data: orders, isLoading } = useCustomerOrders();

  return (
    <CustomerLayout 
      title="Shop For Me" 
      subtitle="Request products from any online store and track your orders"
    >
      <Tabs defaultValue="new-order" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="new-order" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Order
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Order History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new-order" className="space-y-6">
          <div className="text-center mb-6">
            <p className="text-muted-foreground">
              Paste product links from any online store. We'll fetch the product information,
              calculate shipping costs to Tanzania, and handle the entire purchase for you.
            </p>
          </div>
          <ShoppingAggregator />
        </TabsContent>

        <TabsContent value="history">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : orders && orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <ShoppingCart className="h-5 w-5 text-primary" />
                          Order #{order.id.slice(0, 8).toUpperCase()}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Placed on {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={statusColors[order.status] || 'bg-muted'}
                      >
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="items" className="border-none">
                        <AccordionTrigger className="py-2 hover:no-underline">
                          <span className="flex items-center gap-2 text-sm">
                            <Package className="h-4 w-4" />
                            {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 pt-2">
                            {order.items.map((item) => (
                              <div 
                                key={item.id} 
                                className="flex items-start justify-between gap-4 p-3 rounded-lg bg-muted/50"
                              >
                                <div className="flex-1 min-w-0 space-y-1">
                                  <p className="font-medium text-sm truncate">
                                    {item.product_name || 'Product'}
                                  </p>
                                  <a 
                                    href={item.product_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                  >
                                    View product <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-medium">
                                    ${item.product_price?.toFixed(2) || '0.00'} × {item.quantity}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    ${item.subtotal?.toFixed(2) || '0.00'}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pt-3 border-t">
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Delivery: {order.customer_address}</p>
                        {order.notes && <p className="italic">Note: {order.notes}</p>}
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p>Products: ${order.total_product_cost.toFixed(2)}</p>
                          <p>Handling: ${order.handling_fee.toFixed(2)}</p>
                          <p>Shipping: ${order.estimated_shipping_cost.toFixed(2)}</p>
                        </div>
                        <p className="text-lg font-bold text-foreground">
                          Total: ${order.grand_total.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
                <p className="text-muted-foreground">
                  Your Shop For Me order history will appear here.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </CustomerLayout>
  );
}
