import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, ExternalLink, ShoppingCart, Calculator, Package, CheckCircle2, Globe, Search, Sparkles, Edit3, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useRegionPricing } from '@/hooks/useRegionPricing';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useShopForMeCharges, calculateShopForMeCharges } from '@/hooks/useShopForMeCharges';
import { useDeliveryTimes } from '@/hooks/useDeliveryTimes';
import { useAuth } from '@/hooks/useAuth';
import { InlineAuthGate } from '@/components/auth/InlineAuthGate';
import { useActiveRegions, regionsToMap } from '@/hooks/useRegions';

type LoadingStep = 'fetching' | 'extracting' | 'analyzing' | 'complete' | 'error';

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
  loadingStep?: LoadingStep;
  error?: string;
  originRegion?: string;
  detectedRegion?: string;
  isRegionConfirmed?: boolean;
  isPriceManual?: boolean;
  isWeightManual?: boolean;
}

interface CustomerDetails {
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface RegionConfirmDialogData {
  itemId: string;
  detectedRegion: string;
  productName: string;
}

const LOADING_STEPS: { step: LoadingStep; label: string; progress: number }[] = [
  { step: 'fetching', label: 'Fetching page...', progress: 25 },
  { step: 'extracting', label: 'Extracting data...', progress: 50 },
  { step: 'analyzing', label: 'Analyzing product...', progress: 75 },
  { step: 'complete', label: 'Complete', progress: 100 },
];

interface ShoppingAggregatorProps {
  category?: string;
}

export function ShoppingAggregator({ category }: ShoppingAggregatorProps) {
  const [items, setItems] = useState<ProductItem[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [isAddingUrl, setIsAddingUrl] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string>('usa');
  const [regionConfirmDialog, setRegionConfirmDialog] = useState<RegionConfirmDialogData | null>(null);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  const { data: regionPricing } = useRegionPricing();
  const { data: exchangeRates } = useExchangeRates();
  const { data: charges } = useShopForMeCharges();
  const { times: deliveryTimes } = useDeliveryTimes();
  const { data: regions } = useActiveRegions();
  const regionsMap = regionsToMap(regions);

  // Get currency for a region
  const getRegionCurrency = (regionCode: string) => {
    // Use EUR for europe, GBP for UK, USD for others
    if (regionCode === 'europe') return 'EUR';
    if (regionCode === 'uk') return 'GBP';
    return 'USD';
  };


  // Get shipping rate for selected region
  const getShippingRate = (region: string) => {
    const pricing = regionPricing?.find(r => r.region === region);
    return pricing?.customer_rate_per_kg ?? 8;
  };

  // Get exchange rate to TZS
  const getExchangeRate = (currency: string) => {
    const rate = exchangeRates?.find(r => r.currency_code === currency);
    return rate?.rate_to_tzs ?? 2500;
  };

  const updateItemLoadingStep = (itemId: string, step: LoadingStep) => {
    setItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, loadingStep: step } : item
      )
    );
  };

  const fetchProductInfo = async (url: string, itemId: string): Promise<Partial<ProductItem>> => {
    // Simulate progressive loading steps
    updateItemLoadingStep(itemId, 'fetching');
    await new Promise(r => setTimeout(r, 500));
    
    updateItemLoadingStep(itemId, 'extracting');
    
    const response = await supabase.functions.invoke('fetch-product-info', {
      body: { url },
    });

    updateItemLoadingStep(itemId, 'analyzing');
    await new Promise(r => setTimeout(r, 300));

    if (response.error) {
      throw new Error(response.error.message);
    }

    const detectedRegion = response.data.origin_region as string | undefined;
    
    return {
      productName: response.data.product_name || 'Unknown Product',
      productDescription: response.data.product_description || null,
      productImage: response.data.product_image || null,
      productPrice: response.data.product_price,
      currency: response.data.currency || 'USD',
      estimatedWeightKg: response.data.estimated_weight_kg || 0.5,
      originRegion: detectedRegion,
      detectedRegion: detectedRegion,
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
      loadingStep: 'fetching',
      originRegion: selectedRegion,
      isRegionConfirmed: false,
    };

    setItems(prev => [...prev, newItem]);
    setNewUrl('');
    setIsAddingUrl(true);

    try {
      const productInfo = await fetchProductInfo(newUrl, newItemId);
      
      updateItemLoadingStep(newItemId, 'complete');
      
      const finalRegion = productInfo.originRegion || selectedRegion;
      const shouldConfirmRegion = productInfo.originRegion && productInfo.originRegion !== selectedRegion;
      
      setItems(prev =>
        prev.map(item =>
          item.id === newItemId
            ? { 
                ...item, 
                ...productInfo, 
                originRegion: finalRegion,
                isLoading: false,
                loadingStep: 'complete',
                isRegionConfirmed: !shouldConfirmRegion,
              }
            : item
        )
      );
      
      // Show region confirmation dialog if detected region differs from selected
      if (shouldConfirmRegion && productInfo.originRegion) {
        setRegionConfirmDialog({
          itemId: newItemId,
          detectedRegion: productInfo.originRegion,
          productName: productInfo.productName || 'this product',
        });
      } else {
        const regionLabel = productInfo.originRegion ? regionsMap[productInfo.originRegion]?.name : null;
        toast.success(regionLabel 
          ? `Product added from ${regionLabel}` 
          : 'Product info fetched successfully'
        );
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      updateItemLoadingStep(newItemId, 'error');
      setItems(prev =>
        prev.map(item =>
          item.id === newItemId
            ? { 
                ...item, 
                productName: 'Failed to load', 
                isLoading: false,
                loadingStep: 'error',
                error: error instanceof Error ? error.message : 'Failed to fetch'
              }
            : item
        )
      );
      toast.error('Failed to fetch product info. You can enter details manually.');
    } finally {
      setIsAddingUrl(false);
    }
  };

  const handleRetryFetch = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    setItems(prev =>
      prev.map(i =>
        i.id === itemId
          ? { ...i, isLoading: true, loadingStep: 'fetching', error: undefined }
          : i
      )
    );
    
    try {
      const productInfo = await fetchProductInfo(item.url, itemId);
      updateItemLoadingStep(itemId, 'complete');
      
      setItems(prev =>
        prev.map(i =>
          i.id === itemId
            ? { 
                ...i, 
                ...productInfo, 
                originRegion: productInfo.originRegion || i.originRegion,
                isLoading: false,
                loadingStep: 'complete',
              }
            : i
        )
      );
      toast.success('Product info updated');
    } catch (error) {
      updateItemLoadingStep(itemId, 'error');
      setItems(prev =>
        prev.map(i =>
          i.id === itemId
            ? { 
                ...i, 
                isLoading: false,
                loadingStep: 'error',
                error: error instanceof Error ? error.message : 'Failed to fetch'
              }
            : i
        )
      );
      toast.error('Failed to refresh product info');
    }
  };

  const handleConfirmRegion = (useDetected: boolean) => {
    if (!regionConfirmDialog) return;
    
    const { itemId, detectedRegion } = regionConfirmDialog;
    
    setItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? { 
              ...item, 
              originRegion: useDetected ? detectedRegion : item.originRegion,
              isRegionConfirmed: true,
            }
          : item
      )
    );
    
    const finalRegion = useDetected ? detectedRegion : items.find(i => i.id === itemId)?.originRegion;
    toast.success(`Region set to ${regionsMap[finalRegion || 'usa']?.name || finalRegion}`);
    setRegionConfirmDialog(null);
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

  const handleRegionChange = (id: string, region: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, originRegion: region, isRegionConfirmed: true } : item
      )
    );
  };

  const handlePriceChange = (id: string, price: number | null) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, productPrice: price, isPriceManual: true } : item
      )
    );
  };

  const handleWeightChange = (id: string, weight: number) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, estimatedWeightKg: Math.max(0.1, weight), isWeightManual: true } : item
      )
    );
  };

  const handleNameChange = (id: string, name: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, productName: name } : item
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
    }, {} as Record<string, ProductItem[]>);

    const regionBreakdowns: {
      region: string;
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
      const regionKey = region;
      const currency = getRegionCurrency(regionKey);
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

    // Check if any items are missing price
    const itemsMissingPrice = items.filter(item => !item.productPrice);
    if (itemsMissingPrice.length > 0) {
      toast.error('Please enter a price for all products');
      return;
    }

    setIsSubmitting(true);
    const totals = calculateTotals();

    try {
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
          grand_total: totalProductCost + totalShipping + totalHandling,
          category: category || 'products',
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

      toast.success('Order request submitted successfully! We will contact you soon.', {
        description: 'You can track your order status at /order-tracking',
        duration: 5000,
      });
      
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

  const getLoadingProgress = (step?: LoadingStep) => {
    if (!step) return 0;
    return LOADING_STEPS.find(s => s.step === step)?.progress || 0;
  };

  const getLoadingLabel = (step?: LoadingStep) => {
    if (!step) return '';
    return LOADING_STEPS.find(s => s.step === step)?.label || '';
  };

  return (
    <div className="space-y-6">
      {/* Region Confirmation Dialog */}
      <Dialog open={!!regionConfirmDialog} onOpenChange={() => setRegionConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Confirm Product Region
            </DialogTitle>
            <DialogDescription>
              We detected that <strong>{regionConfirmDialog?.productName}</strong> is from{' '}
              <strong>{regionConfirmDialog?.detectedRegion && regionsMap[regionConfirmDialog.detectedRegion]?.name}</strong>.
              This affects shipping rates and currency.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 py-4">
            <Card className="flex-1 p-4 border-2 border-primary cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => handleConfirmRegion(true)}>
              <div className="text-center">
                <span className="text-3xl">{regionConfirmDialog?.detectedRegion && regionsMap[regionConfirmDialog.detectedRegion]?.flag_emoji}</span>
                <p className="font-semibold mt-2">{regionConfirmDialog?.detectedRegion && regionsMap[regionConfirmDialog.detectedRegion]?.name}</p>
                <p className="text-xs text-muted-foreground">Detected</p>
              </div>
            </Card>
            <Card className="flex-1 p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleConfirmRegion(false)}>
              <div className="text-center">
                <span className="text-3xl">{regionsMap[selectedRegion]?.flag_emoji}</span>
                <p className="font-semibold mt-2">{regionsMap[selectedRegion]?.name}</p>
                <p className="text-xs text-muted-foreground">Selected</p>
              </div>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegionConfirmDialog(null)}>
              Decide Later
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <Label>Default Origin Region</Label>
            <Select value={selectedRegion} onValueChange={(v: string) => setSelectedRegion(v)}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(regions || []).map((region) => (
                  <SelectItem key={region.code} value={region.code}>
                    {region.flag_emoji} {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">We'll auto-detect the region from the URL when possible</p>
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
                {/* Loading state with progress */}
                {item.isLoading && (
                  <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      {item.loadingStep === 'fetching' && <Globe className="h-5 w-5 text-primary animate-pulse" />}
                      {item.loadingStep === 'extracting' && <Search className="h-5 w-5 text-primary animate-pulse" />}
                      {item.loadingStep === 'analyzing' && <Sparkles className="h-5 w-5 text-primary animate-pulse" />}
                      <span className="text-muted-foreground font-medium">{getLoadingLabel(item.loadingStep)}</span>
                    </div>
                    <Progress value={getLoadingProgress(item.loadingStep)} className="h-2" />
                    <p className="text-xs text-muted-foreground truncate">{item.url}</p>
                  </div>
                )}

                {/* Error state */}
                {!item.isLoading && item.error && (
                  <div className="p-4 bg-destructive/10 border-b border-destructive/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Could not fetch product info automatically</span>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleRetryFetch(item.id)}>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Retry
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">You can enter the details manually below</p>
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
                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Product Name - Editable */}
                      <div>
                        <div className="flex items-center gap-2">
                          <Input
                            value={item.productName}
                            onChange={(e) => handleNameChange(item.id, e.target.value)}
                            className="font-semibold text-base h-8 border-dashed"
                            placeholder="Enter product name"
                          />
                        </div>
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

                      {/* Price and Weight Inputs */}
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-medium whitespace-nowrap">Price:</Label>
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-muted-foreground">{getRegionCurrency(item.originRegion || selectedRegion)}</span>
                            <Input
                              type="number"
                              value={item.productPrice ?? ''}
                              onChange={(e) => handlePriceChange(item.id, e.target.value ? parseFloat(e.target.value) : null)}
                              placeholder="0.00"
                              className={`w-24 h-8 ${item.isPriceManual ? 'border-primary' : ''}`}
                              min="0"
                              step="0.01"
                            />
                          </div>
                          {item.isPriceManual && (
                            <Badge variant="secondary" className="text-xs">
                              <Edit3 className="h-2.5 w-2.5 mr-1" />
                              Manual
                            </Badge>
                          )}
                          {!item.productPrice && (
                            <span className="text-xs text-orange-500">Required</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-medium whitespace-nowrap">Weight:</Label>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={item.estimatedWeightKg}
                              onChange={(e) => handleWeightChange(item.id, parseFloat(e.target.value) || 0.1)}
                              className={`w-20 h-8 ${item.isWeightManual ? 'border-primary' : ''}`}
                              min="0.1"
                              step="0.1"
                            />
                            <span className="text-sm text-muted-foreground">kg</span>
                          </div>
                          {item.isWeightManual && (
                            <Badge variant="secondary" className="text-xs">
                              <Edit3 className="h-2.5 w-2.5 mr-1" />
                              Manual
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Region and Quantity */}
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">From:</Label>
                          <Select 
                            value={item.originRegion || selectedRegion} 
                            onValueChange={(v: string) => handleRegionChange(item.id, v)}
                          >
                            <SelectTrigger className="w-36 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(regions || []).map((region) => (
                                <SelectItem key={region.code} value={region.code}>
                                  {region.flag_emoji} {region.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {item.detectedRegion && item.detectedRegion === item.originRegion && (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">
                              <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                              Auto-detected
                            </Badge>
                          )}
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

      {/* Order Summary - Price Breakdown - Gated for non-authenticated users */}
      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Estimated Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InlineAuthGate
              teaserContent={
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Product Cost</span>
                    <span className="font-medium">XXX.XX</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-medium">XXX.XX</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Handling Fee</span>
                    <span className="font-medium">XX.XX</span>
                  </div>
                  <Separator className="my-3" />
                  <div className="flex justify-between items-center bg-primary/10 p-3 rounded-lg -mx-3">
                    <span className="font-semibold">Total (TZS)</span>
                    <span className="font-bold text-xl">From TZS X,XXX,XXX</span>
                  </div>
                </div>
              }
              fullContent={
                <div className="space-y-4">
                  {totals.regionBreakdowns.map((regionData, regionIndex) => (
                    <div key={regionData.region} className="space-y-2">
                      {!totals.isSingleRegion && (
                        <div className="flex items-center gap-2 font-medium text-sm bg-muted/50 px-3 py-2 rounded-md -mx-1">
                          <span>{regionsMap[regionData.region]?.flag_emoji}</span>
                          <span>{regionsMap[regionData.region]?.name}</span>
                          <span className="text-muted-foreground">({regionData.currency})</span>
                        </div>
                      )}
                      {regionData.charges.map((charge, index) => (
                        <div key={`${regionData.region}-${charge.key}`} className="flex justify-between items-center">
                          <span className="text-muted-foreground">{charge.name}</span>
                          <span className="font-medium">{formatCurrency(charge.amount, regionData.currency)}</span>
                        </div>
                      ))}
                      {!totals.isSingleRegion && regionIndex < totals.regionBreakdowns.length - 1 && <Separator className="my-4" />}
                    </div>
                  ))}
                  <Separator className="my-3" />
                  {totals.isSingleRegion && totals.regionBreakdowns[0] && (
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-lg">Total ({totals.regionBreakdowns[0].currency})</span>
                      <span className="font-bold text-xl text-primary">{formatCurrency(totals.regionBreakdowns[0].subtotal, totals.regionBreakdowns[0].currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center bg-primary/10 p-3 rounded-lg -mx-3">
                    <span className="font-semibold">Total (TZS)</span>
                    <span className="font-bold text-xl">{formatTZS(totals.grandTotalInTZS)}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-primary font-medium mt-4">
                    <Package className="h-4 w-4" />
                    <span>Estimated Delivery: {deliveryTimes.shop_for_me}</span>
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Final costs may vary based on actual product weight and current exchange rates.
                  </p>
                </div>
              }
              title="Sign in to see your quote"
              description="Create a free account to view the complete cost breakdown."
              source="shop_for_me"
            />
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
