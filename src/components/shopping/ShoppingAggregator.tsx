import { useState } from 'react';
import { Plus, Trash2, Loader2, ExternalLink, ShoppingCart, Calculator, Package, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useRegionPricing } from '@/hooks/useRegionPricing';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useShopForMeCharges, calculateShopForMeCharges } from '@/hooks/useShopForMeCharges';
import { REGIONS, type Region } from '@/lib/constants';

interface ProductItem {
  id: string;
  url: string;
  productName: string;
  productDescription: string | null;
  productImage: string | null;
  productPrice: number | null;
  currency: string;
  estimatedWeightKg: number;
  quantity: number;
  isLoading: boolean;
  error?: string;
  originRegion?: Region;
}

interface CustomerDetails {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export function ShoppingAggregator() {
  const [items, setItems] = useState<ProductItem[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [isAddingUrl, setIsAddingUrl] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<Region>('usa');
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  const { data: regionPricing } = useRegionPricing();
  const { data: exchangeRates } = useExchangeRates();
  const { data: charges } = useShopForMeCharges();

  // Get shipping rate for selected region
  const getShippingRate = (region: Region) => {
    const pricing = regionPricing?.find(r => r.region === region);
    return pricing?.customer_rate_per_kg ?? 8; // Default $8/kg
  };

  // Get exchange rate to TZS
  const getExchangeRate = (currency: string) => {
    const rate = exchangeRates?.find(r => r.currency_code === currency);
    return rate?.rate_to_tzs ?? 2500; // Default USD rate
  };

  const fetchProductInfo = async (url: string): Promise<Partial<ProductItem>> => {
    const response = await supabase.functions.invoke('fetch-product-info', {
      body: { url },
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return {
      productName: response.data.product_name || 'Unknown Product',
      productDescription: response.data.product_description || null,
      productImage: response.data.product_image || null,
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
      productDescription: null,
      productImage: null,
      productPrice: null,
      currency: 'USD',
      estimatedWeightKg: 0,
      quantity: 1,
      isLoading: true,
      originRegion: selectedRegion,
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

  const handleRegionChange = (id: string, region: Region) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, originRegion: region } : item
      )
    );
  };

  const handlePriceChange = (id: string, price: number | null) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, productPrice: price } : item
      )
    );
  };

  // Round weight up to nearest whole number
  const roundWeight = (weight: number) => Math.ceil(weight);

  const calculateTotals = () => {
    // Group items by region
    const itemsByRegion = items.reduce((acc, item) => {
      const region = item.originRegion || selectedRegion;
      if (!acc[region]) acc[region] = [];
      acc[region].push(item);
      return acc;
    }, {} as Record<Region, ProductItem[]>);

    // Calculate per-region breakdowns
    const regionBreakdowns: {
      region: Region;
      currency: string;
      productCost: number;
      weight: number;
      shippingRate: number;
      charges: { name: string; key: string; amount: number; percentage?: number }[];
      subtotal: number;
      subtotalInTZS: number;
      exchangeRate: number;
    }[] = [];

    let grandTotalInTZS = 0;

    Object.entries(itemsByRegion).forEach(([region, regionItems]) => {
      const regionKey = region as Region;
      const currency = REGIONS[regionKey]?.currency || 'USD';
      const shippingRate = getShippingRate(regionKey);
      const exchangeRate = getExchangeRate(currency);

      const productCost = regionItems.reduce((sum, item) => {
        if (item.productPrice) {
          return sum + item.productPrice * item.quantity;
        }
        return sum;
      }, 0);

      const weight = regionItems.reduce((sum, item) => {
        return sum + roundWeight(item.estimatedWeightKg) * item.quantity;
      }, 0);

      // Calculate charges for this region
      const chargeCalc = calculateShopForMeCharges(
        productCost,
        weight,
        shippingRate,
        charges || []
      );

      const subtotalInTZS = chargeCalc.total * exchangeRate;
      grandTotalInTZS += subtotalInTZS;

      regionBreakdowns.push({
        region: regionKey,
        currency,
        productCost,
        weight,
        shippingRate,
        charges: chargeCalc.breakdown,
        subtotal: chargeCalc.total,
        subtotalInTZS,
        exchangeRate,
      });
    });

    const totalWeight = items.reduce((sum, item) => {
      return sum + roundWeight(item.estimatedWeightKg) * item.quantity;
    }, 0);

    // Check if it's a single-region order
    const isSingleRegion = regionBreakdowns.length === 1;

    return {
      regionBreakdowns,
      grandTotalInTZS,
      totalWeight,
      isSingleRegion,
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
      // Sum up totals from all regions
      const totalProductCost = totals.regionBreakdowns.reduce((sum, rb) => sum + rb.productCost, 0);
      const totalShipping = totals.regionBreakdowns.reduce((sum, rb) => {
        const shipping = rb.charges.find(c => c.key === 'shipping');
        return sum + (shipping?.amount || 0);
      }, 0);
      const totalHandling = totals.regionBreakdowns.reduce((sum, rb) => {
        const handling = rb.charges.find(c => c.key === 'handling_fee');
        return sum + (handling?.amount || 0);
      }, 0);

      const { data: orderRequest, error: orderError } = await supabase
        .from('order_requests')
        .insert({
          customer_name: customerDetails.name,
          customer_email: customerDetails.email,
          customer_phone: customerDetails.phone,
          customer_address: customerDetails.address,
          total_product_cost: totalProductCost,
          estimated_shipping_cost: totalShipping,
          handling_fee: totalHandling,
          grand_total: totals.grandTotalInTZS,
        })
        .select()
        .single();

      if (orderError) throw orderError;

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

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatTZS = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

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
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Select Origin Region</Label>
            <Select value={selectedRegion} onValueChange={(v: Region) => setSelectedRegion(v)}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REGIONS).map(([key, { label, flag }]) => (
                  <SelectItem key={key} value={key}>
                    {flag} {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
                className="border rounded-lg overflow-hidden bg-background"
              >
                {/* Loading state */}
                {item.isLoading && (
                  <div className="flex items-center justify-center p-8 bg-muted/30">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="ml-3 text-muted-foreground">Fetching product details...</span>
                  </div>
                )}

                {/* Product details */}
                {!item.isLoading && (
                  <div className="flex flex-col md:flex-row gap-4 p-4">
                    {/* Product Image */}
                    <div className="w-full md:w-32 h-32 flex-shrink-0 bg-muted rounded-md overflow-hidden">
                      {item.productImage ? (
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full flex items-center justify-center ${item.productImage ? 'hidden' : ''}`}>
                        <Package className="h-10 w-10 text-muted-foreground/50" />
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <h4 className="font-semibold text-base line-clamp-2">{item.productName}</h4>
                        {item.productDescription && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {item.productDescription}
                          </p>
                        )}
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                        >
                          View original
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>

                      {/* Price Input */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-medium">Price:</Label>
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-muted-foreground">{REGIONS[item.originRegion || selectedRegion]?.currency || 'USD'}</span>
                            <Input
                              type="number"
                              value={item.productPrice ?? ''}
                              onChange={(e) => handlePriceChange(item.id, e.target.value ? parseFloat(e.target.value) : null)}
                              placeholder="0.00"
                              className="w-24 h-8"
                              min="0"
                              step="0.01"
                            />
                          </div>
                          {!item.productPrice && (
                            <span className="text-xs text-orange-500">Required</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-medium">Weight:</Label>
                          <span className="text-sm">{roundWeight(item.estimatedWeightKg)} kg</span>
                        </div>
                      </div>

                      {/* Region and Quantity */}
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">From:</Label>
                          <Select 
                            value={item.originRegion || selectedRegion} 
                            onValueChange={(v: Region) => handleRegionChange(item.id, v)}
                          >
                            <SelectTrigger className="w-36 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(REGIONS).map(([key, { label, flag }]) => (
                                <SelectItem key={key} value={key}>
                                  {flag} {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Qty:</Label>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >
                              -
                            </Button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            >
                              +
                            </Button>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Order Summary - Price Breakdown */}
      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Price Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Show breakdown per region */}
            {totals.regionBreakdowns.map((regionData, regionIndex) => (
              <div key={regionData.region} className="space-y-2">
                {/* Region header for multi-region orders */}
                {!totals.isSingleRegion && (
                  <div className="flex items-center gap-2 font-medium text-sm bg-muted/50 px-3 py-2 rounded-md -mx-1">
                    <span>{REGIONS[regionData.region]?.flag}</span>
                    <span>{REGIONS[regionData.region]?.label}</span>
                    <span className="text-muted-foreground">({regionData.currency})</span>
                  </div>
                )}
                
                {regionData.charges.map((charge, index) => {
                  const prevCharge = index > 0 ? regionData.charges[index - 1] : null;
                  const showSeparator = charge.key === 'shipping' || 
                    (prevCharge?.key === 'shipping' && charge.key !== 'shipping');
                  
                  return (
                    <div key={`${regionData.region}-${charge.key}`}>
                      {showSeparator && <Separator className="my-2" />}
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">
                          {charge.name}
                          {charge.percentage !== undefined && (
                            <span className="ml-1 text-xs">({charge.percentage}%)</span>
                          )}
                          {charge.key === 'shipping' && (
                            <span className="ml-1 text-xs">
                              ({regionData.weight} kg × {formatCurrency(regionData.shippingRate, regionData.currency)}/kg)
                            </span>
                          )}
                        </span>
                        <span className="font-medium">{formatCurrency(charge.amount, regionData.currency)}</span>
                      </div>
                    </div>
                  );
                })}

                {/* Region subtotal for multi-region */}
                {!totals.isSingleRegion && (
                  <>
                    <Separator className="my-2" />
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Subtotal ({regionData.currency})</span>
                      <span className="font-semibold">{formatCurrency(regionData.subtotal, regionData.currency)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>= TZS @ {regionData.exchangeRate.toLocaleString()}</span>
                      <span>{formatTZS(regionData.subtotalInTZS)}</span>
                    </div>
                  </>
                )}

                {/* Separator between regions */}
                {!totals.isSingleRegion && regionIndex < totals.regionBreakdowns.length - 1 && (
                  <Separator className="my-4" />
                )}
              </div>
            ))}

            <Separator className="my-3" />

            {/* Single region: show total in that currency */}
            {totals.isSingleRegion && totals.regionBreakdowns[0] && (
              <div className="flex justify-between items-center">
                <span className="font-semibold text-lg">Total ({totals.regionBreakdowns[0].currency})</span>
                <span className="font-bold text-xl text-primary">
                  {formatCurrency(totals.regionBreakdowns[0].subtotal, totals.regionBreakdowns[0].currency)}
                </span>
              </div>
            )}

            {/* Total in TZS */}
            <div className="flex justify-between items-center bg-primary/10 p-3 rounded-lg -mx-3">
              <span className="font-semibold">
                Total (TZS)
                {totals.isSingleRegion && totals.regionBreakdowns[0] && (
                  <span className="text-xs text-muted-foreground ml-2">
                    @ {totals.regionBreakdowns[0].exchangeRate.toLocaleString()} TZS/{totals.regionBreakdowns[0].currency}
                  </span>
                )}
              </span>
              <span className="font-bold text-xl">
                {formatTZS(totals.grandTotalInTZS)}
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
