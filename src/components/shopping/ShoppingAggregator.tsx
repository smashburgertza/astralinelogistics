import { useState } from 'react';
import { Plus, Trash2, Loader2, ExternalLink, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useRegionPricing } from '@/hooks/useRegionPricing';

interface ProductItem {
  id: string;
  url: string;
  productName: string;
  productPrice: number | null;
  currency: string;
  estimatedWeightKg: number;
  quantity: number;
  isLoading: boolean;
  error?: string;
}

interface CustomerDetails {
  name: string;
  email: string;
  phone: string;
  address: string;
}

const HANDLING_FEE = 15; // Fixed handling fee in USD

export function ShoppingAggregator() {
  const [items, setItems] = useState<ProductItem[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [isAddingUrl, setIsAddingUrl] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  const { data: regionPricing } = useRegionPricing();
  
  // Use average rate for shipping estimate
  const avgShippingRate = regionPricing?.length 
    ? regionPricing.reduce((sum, r) => sum + r.customer_rate_per_kg, 0) / regionPricing.length
    : 8; // Default $8/kg

  const fetchProductInfo = async (url: string): Promise<Partial<ProductItem>> => {
    const response = await supabase.functions.invoke('fetch-product-info', {
      body: { url },
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return {
      productName: response.data.product_name || 'Unknown Product',
      productPrice: response.data.product_price,
      currency: response.data.currency || 'USD',
      estimatedWeightKg: response.data.estimated_weight_kg || 0.5,
    };
  };

  const handleAddUrl = async () => {
    if (!newUrl.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    // Validate URL
    try {
      new URL(newUrl);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    const newItemId = crypto.randomUUID();
    const newItem: ProductItem = {
      id: newItemId,
      url: newUrl,
      productName: 'Loading...',
      productPrice: null,
      currency: 'USD',
      estimatedWeightKg: 0,
      quantity: 1,
      isLoading: true,
    };

    setItems(prev => [...prev, newItem]);
    setNewUrl('');
    setIsAddingUrl(true);

    try {
      const productInfo = await fetchProductInfo(newUrl);
      setItems(prev =>
        prev.map(item =>
          item.id === newItemId
            ? { ...item, ...productInfo, isLoading: false }
            : item
        )
      );
      toast.success('Product info fetched successfully');
    } catch (error) {
      console.error('Error fetching product:', error);
      setItems(prev =>
        prev.map(item =>
          item.id === newItemId
            ? { 
                ...item, 
                productName: 'Failed to load', 
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to fetch'
              }
            : item
        )
      );
      toast.error('Failed to fetch product info');
    } finally {
      setIsAddingUrl(false);
    }
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleQuantityChange = (id: string, quantity: number) => {
    if (quantity < 1) return;
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const calculateTotals = () => {
    const totalProductCost = items.reduce((sum, item) => {
      if (item.productPrice) {
        return sum + item.productPrice * item.quantity;
      }
      return sum;
    }, 0);

    const totalWeight = items.reduce((sum, item) => {
      return sum + item.estimatedWeightKg * item.quantity;
    }, 0);

    const estimatedShipping = totalWeight * avgShippingRate;
    const grandTotal = totalProductCost + estimatedShipping + HANDLING_FEE;

    return {
      totalProductCost,
      totalWeight,
      estimatedShipping,
      handlingFee: HANDLING_FEE,
      grandTotal,
    };
  };

  const handleSubmitOrder = async () => {
    if (items.length === 0) {
      toast.error('Please add at least one product');
      return;
    }

    if (!customerDetails.name || !customerDetails.email || !customerDetails.phone || !customerDetails.address) {
      toast.error('Please fill in all your details');
      return;
    }

    setIsSubmitting(true);
    const totals = calculateTotals();

    try {
      // Create order request
      const { data: orderRequest, error: orderError } = await supabase
        .from('order_requests')
        .insert({
          customer_name: customerDetails.name,
          customer_email: customerDetails.email,
          customer_phone: customerDetails.phone,
          customer_address: customerDetails.address,
          total_product_cost: totals.totalProductCost,
          estimated_shipping_cost: totals.estimatedShipping,
          handling_fee: totals.handlingFee,
          grand_total: totals.grandTotal,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map(item => ({
        order_request_id: orderRequest.id,
        product_url: item.url,
        product_name: item.productName,
        product_price: item.productPrice,
        currency: item.currency,
        estimated_weight_kg: item.estimatedWeightKg,
        quantity: item.quantity,
        subtotal: item.productPrice ? item.productPrice * item.quantity : null,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast.success('Order request submitted successfully! We will contact you soon.');
      
      // Reset form
      setItems([]);
      setCustomerDetails({ name: '', email: '', phone: '', address: '' });

    } catch (error) {
      console.error('Error submitting order:', error);
      toast.error('Failed to submit order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Add Product URL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Add Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Paste product URL here..."
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
              disabled={isAddingUrl}
            />
            <Button onClick={handleAddUrl} disabled={isAddingUrl}>
              {isAddingUrl ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span className="ml-2">Add</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Product List */}
      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Products ({items.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-muted/50 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {item.isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : null}
                    <p className="font-medium truncate">{item.productName}</p>
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 truncate"
                  >
                    {item.url.substring(0, 50)}...
                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                  </a>
                  {item.productPrice && (
                    <p className="text-sm text-primary font-semibold mt-1">
                      {item.currency} {item.productPrice.toFixed(2)}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Est. weight: {item.estimatedWeightKg} kg
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                  >
                    -
                  </Button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                  >
                    +
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveItem(item.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Order Summary */}
      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Product Cost</span>
              <span className="font-medium">${totals.totalProductCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Estimated Shipping ({totals.totalWeight.toFixed(2)} kg × ${avgShippingRate.toFixed(2)}/kg)
              </span>
              <span className="font-medium">${totals.estimatedShipping.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Handling Fee</span>
              <span className="font-medium">${totals.handlingFee.toFixed(2)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between">
              <span className="font-semibold">Estimated Total</span>
              <span className="font-bold text-lg text-primary">
                ${totals.grandTotal.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer Details */}
      <Card>
        <CardHeader>
          <CardTitle>Your Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={customerDetails.name}
                onChange={(e) =>
                  setCustomerDetails(prev => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={customerDetails.email}
                onChange={(e) =>
                  setCustomerDetails(prev => ({ ...prev, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="+255 XXX XXX XXX"
                value={customerDetails.phone}
                onChange={(e) =>
                  setCustomerDetails(prev => ({ ...prev, phone: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Delivery Address in Tanzania</Label>
            <Textarea
              id="address"
              placeholder="Street address, City, Region..."
              value={customerDetails.address}
              onChange={(e) =>
                setCustomerDetails(prev => ({ ...prev, address: e.target.value }))
              }
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Button
        onClick={handleSubmitOrder}
        disabled={isSubmitting || items.length === 0}
        className="w-full"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Submitting Order...
          </>
        ) : (
          <>
            <ShoppingCart className="h-4 w-4 mr-2" />
            Submit Order Request
          </>
        )}
      </Button>
    </div>
  );
}
