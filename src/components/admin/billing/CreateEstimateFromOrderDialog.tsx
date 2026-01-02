import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Calculator } from 'lucide-react';
import { useCreateEstimate } from '@/hooks/useEstimates';
import { useCustomers } from '@/hooks/useShipments';
import { useExchangeRates, convertToTZS } from '@/hooks/useExchangeRates';
import { useProductsServices, SERVICE_TYPES } from '@/hooks/useProductsServices';
import { useRegions } from '@/hooks/useRegions';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { OrderRequest, OrderItem } from '@/hooks/useOrderRequests';

const lineItemSchema = z.object({
  product_service_id: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().min(0, 'Quantity must be 0 or more'),
  unit_price: z.coerce.number().min(0, 'Price must be 0 or more'),
  unit_type: z.string().optional(),
});

const estimateSchema = z.object({
  customer_id: z.string().min(1, 'Customer is required'),
  origin_region: z.string().min(1, 'Region is required'),
  currency: z.string().default('USD'),
  valid_days: z.coerce.number().min(1).default(7),
  discount: z.string().optional(),
  tax_rate: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().optional(),
  line_items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
});

type EstimateFormData = z.infer<typeof estimateSchema>;

interface CreateEstimateFromOrderDialogProps {
  order: OrderRequest;
  items: OrderItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateEstimateFromOrderDialog({ 
  order, 
  items,
  open, 
  onOpenChange,
  onSuccess 
}: CreateEstimateFromOrderDialogProps) {
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [customerId, setCustomerId] = useState<string>('');
  
  const createEstimate = useCreateEstimate();
  const { data: customers, refetch: refetchCustomers } = useCustomers();
  const { data: exchangeRates } = useExchangeRates();
  const { data: productsServices } = useProductsServices({ active: true });
  const { data: regions } = useRegions();

  // Group products/services by type
  const groupedProducts = useMemo(() => {
    if (!productsServices) return {};
    return productsServices.reduce((acc, item) => {
      const type = item.service_type || 'other';
      if (!acc[type]) acc[type] = [];
      acc[type].push(item);
      return acc;
    }, {} as Record<string, typeof productsServices>);
  }, [productsServices]);

  // Calculate total weight from items
  const totalWeight = items.reduce((sum, item) => {
    return sum + (item.estimated_weight_kg || 0) * item.quantity;
  }, 0);

  // Build default line items from order
  const defaultLineItems = useMemo(() => {
    const lineItems: Array<{ product_service_id: string; description: string; quantity: number; unit_price: number; unit_type: string }> = [];
    
    // Add product cost line item
    if (order.total_product_cost > 0) {
      lineItems.push({
        product_service_id: '',
        description: 'Product Cost',
        quantity: 1,
        unit_price: order.total_product_cost,
        unit_type: '',
      });
    }
    
    // Add duty line item if present
    if (order.estimated_duty && order.estimated_duty > 0) {
      lineItems.push({
        product_service_id: '',
        description: 'Estimated Duty',
        quantity: 1,
        unit_price: order.estimated_duty,
        unit_type: '',
      });
    }
    
    // Add shipping line item
    if (order.estimated_shipping_cost > 0 || totalWeight > 0) {
      lineItems.push({
        product_service_id: '',
        description: `Shipping (${totalWeight.toFixed(2)} kg)`,
        quantity: 1,
        unit_price: order.estimated_shipping_cost,
        unit_type: '',
      });
    }
    
    // Add handling fee
    if (order.handling_fee > 0) {
      lineItems.push({
        product_service_id: '',
        description: 'Handling Fee',
        quantity: 1,
        unit_price: order.handling_fee,
        unit_type: '',
      });
    }
    
    return lineItems.length > 0 ? lineItems : [{ product_service_id: '', description: '', quantity: 1, unit_price: 0, unit_type: '' }];
  }, [order, totalWeight]);

  const form = useForm<EstimateFormData>({
    resolver: zodResolver(estimateSchema),
    defaultValues: {
      customer_id: '',
      origin_region: '',
      currency: 'USD',
      valid_days: 7,
      discount: '',
      tax_rate: 0,
      notes: `Order Request from ${order.customer_name}`,
      line_items: defaultLineItems,
    },
  });

  // Find or create customer when dialog opens
  useEffect(() => {
    const findOrCreateCustomer = async () => {
      if (!open) return;
      
      setIsCreatingCustomer(true);
      try {
        // Check if customer exists by email
        const existingCustomer = customers?.find(c => c.email === order.customer_email);
        
        if (existingCustomer) {
          setCustomerId(existingCustomer.id);
          form.setValue('customer_id', existingCustomer.id);
        } else {
          // Create new customer
          const { data: newCustomer, error } = await supabase
            .from('customers')
            .insert({
              name: order.customer_name,
              email: order.customer_email,
              phone: order.customer_phone,
              address: order.customer_address,
            })
            .select('id')
            .single();

          if (error) throw error;
          
          await refetchCustomers();
          setCustomerId(newCustomer.id);
          form.setValue('customer_id', newCustomer.id);
        }
      } catch (error: any) {
        toast.error('Failed to set up customer: ' + error.message);
      } finally {
        setIsCreatingCustomer(false);
      }
    };

    findOrCreateCustomer();
  }, [open, order, customers, form, refetchCustomers]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        customer_id: customerId,
        origin_region: '',
        currency: 'USD',
        valid_days: 7,
        discount: '',
        tax_rate: 0,
        notes: `Order Request from ${order.customer_name}`,
        line_items: defaultLineItems,
      });
    }
  }, [open, form, customerId, order, defaultLineItems]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'line_items',
  });

  const watchLineItems = useWatch({ control: form.control, name: 'line_items' });
  const watchDiscount = useWatch({ control: form.control, name: 'discount' });
  const watchTaxRate = useWatch({ control: form.control, name: 'tax_rate' });
  const watchCurrency = useWatch({ control: form.control, name: 'currency' });

  // Calculate totals
  const calculations = useMemo(() => {
    let runningTotal = 0;
    let productCostTotal = 0;
    let purchaseFeeTotal = 0;
    
    watchLineItems.forEach((item) => {
      const productService = productsServices?.find(p => p.id === item.product_service_id);
      const isPurchasingType = productService?.service_type === 'purchasing';
      const isProductCost = productService?.account_id === 'd50368b8-1c95-43b6-80e1-34be5f399b85';
      
      if (item.unit_type === 'percent') {
        const percentageAmount = runningTotal * (item.unit_price / 100);
        runningTotal += percentageAmount;
        if (isPurchasingType && !isProductCost) {
          purchaseFeeTotal += percentageAmount;
        }
      } else {
        const itemAmount = item.quantity * item.unit_price;
        runningTotal += itemAmount;
        if (isPurchasingType) {
          if (isProductCost) {
            productCostTotal += itemAmount;
          } else {
            purchaseFeeTotal += itemAmount;
          }
        }
      }
    });

    const subtotal = runningTotal;

    let discountAmount = 0;
    if (watchDiscount) {
      if (watchDiscount.includes('%')) {
        const percent = parseFloat(watchDiscount.replace('%', ''));
        if (!isNaN(percent)) {
          discountAmount = subtotal * (percent / 100);
        }
      } else {
        const fixed = parseFloat(watchDiscount.replace(/[^0-9.]/g, ''));
        if (!isNaN(fixed)) {
          discountAmount = fixed;
        }
      }
    }

    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * (watchTaxRate / 100);
    const total = afterDiscount + taxAmount;

    const tzsSubtotal = exchangeRates ? convertToTZS(subtotal, watchCurrency, exchangeRates) : null;
    const tzsDiscount = exchangeRates ? convertToTZS(discountAmount, watchCurrency, exchangeRates) : null;
    const tzsTax = exchangeRates ? convertToTZS(taxAmount, watchCurrency, exchangeRates) : null;
    const tzsTotal = exchangeRates ? convertToTZS(total, watchCurrency, exchangeRates) : null;

    return { 
      subtotal, 
      discountAmount, 
      taxAmount, 
      total,
      tzsSubtotal,
      tzsDiscount,
      tzsTax,
      tzsTotal,
      productCost: productCostTotal,
      purchaseFee: purchaseFeeTotal,
    };
  }, [watchLineItems, watchDiscount, watchTaxRate, watchCurrency, exchangeRates, productsServices]);

  const currencySymbol = CURRENCY_SYMBOLS[watchCurrency] || '$';

  const onSubmit = async (data: EstimateFormData) => {
    const totalWeight = data.line_items.reduce((sum, item) => sum + item.quantity, 0);
    const avgRate = calculations.subtotal / totalWeight || 0;
    
    const hasPurchaseItems = calculations.productCost > 0 || calculations.purchaseFee > 0;
    const estimateType = hasPurchaseItems ? 'purchase_shipping' : 'shipping';

    try {
      const estimate = await createEstimate.mutateAsync({
        customer_id: data.customer_id,
        origin_region: data.origin_region,
        weight_kg: totalWeight,
        rate_per_kg: avgRate,
        handling_fee: 0,
        currency: data.currency,
        notes: data.notes || `Line Items: ${data.line_items.map(i => `${i.description} (${i.quantity} x ${currencySymbol}${i.unit_price})`).join(', ')}`,
        valid_days: data.valid_days,
        estimate_type: estimateType,
        product_cost: calculations.productCost,
        purchase_fee: calculations.purchaseFee,
      });

      // Link estimate to order request
      await supabase
        .from('order_requests')
        .update({ 
          estimate_id: estimate.id,
          status: 'confirmed'
        })
        .eq('id', order.id);

      toast.success('Estimate created successfully');
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create estimate');
    }
  };

  const handleAddLineItem = () => {
    append({ product_service_id: '', description: '', quantity: 1, unit_price: 0, unit_type: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[calc(100vw-var(--sidebar-width,256px)-2rem)] sm:max-h-[calc(100vh-2rem)] h-[calc(100vh-2rem)] overflow-y-auto fixed right-4 left-auto top-4 translate-x-0 translate-y-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Create Estimate from Order
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Creating estimate for {order.customer_name} ({order.customer_email})
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Header Info */}
            <div className="rounded-lg border bg-card p-4">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <FormField
                    control={form.control}
                    name="customer_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">Customer Name</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isCreatingCustomer}>
                          <FormControl>
                            <SelectTrigger className="font-medium">
                              <SelectValue placeholder={isCreatingCustomer ? "Setting up..." : "Select customer"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {customers?.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div>
                  <FormField
                    control={form.control}
                    name="origin_region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">Origin Region</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="font-medium">
                              <SelectValue placeholder="Select region" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {regions?.map((region) => (
                              <SelectItem key={region.code} value={region.code}>
                                {region.flag_emoji} {region.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div>
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">Currency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="font-medium">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="USD">USD ($)</SelectItem>
                            <SelectItem value="GBP">GBP (£)</SelectItem>
                            <SelectItem value="EUR">EUR (€)</SelectItem>
                            <SelectItem value="AED">AED (د.إ)</SelectItem>
                            <SelectItem value="TZS">TZS</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Grand Total</p>
                  <p className="font-bold text-lg text-primary">
                    {currencySymbol}{calculations.total.toFixed(2)}
                  </p>
                  {watchCurrency !== 'TZS' && calculations.tzsTotal && (
                    <p className="text-xs text-muted-foreground">
                      ≈ TZS {calculations.tzsTotal.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Date & Validity */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Estimate Date</p>
                  <p className="font-medium">{format(new Date(), 'MMMM dd, yyyy')}</p>
                </div>
                <FormField
                  control={form.control}
                  name="valid_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Valid for (days)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="font-medium" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Line Items Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Estimate Line Items</h3>
              
              {/* Line Items Header */}
              <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-2">
                <div className="col-span-3">Service</div>
                <div className="col-span-3">Item Description</div>
                <div className="col-span-1 text-center">Qty</div>
                <div className="col-span-2 text-right">Unit Price</div>
                <div className="col-span-2 text-right">Total</div>
                <div className="col-span-1"></div>
              </div>

              {/* Line Items */}
              <div className="space-y-3">
                {fields.map((field, index) => {
                  const quantity = watchLineItems[index]?.quantity || 0;
                  const unitPrice = watchLineItems[index]?.unit_price || 0;
                  const unitType = watchLineItems[index]?.unit_type || '';
                  const isPercentage = unitType === 'percent';
                  const lineTotal = isPercentage 
                    ? (calculations.subtotal * unitPrice / 100) 
                    : quantity * unitPrice;

                  return (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-3">
                        <FormField
                          control={form.control}
                          name={`line_items.${index}.product_service_id`}
                          render={({ field: psField }) => (
                            <FormItem>
                              <Select 
                                onValueChange={(val) => {
                                  psField.onChange(val === "none" ? "" : val);
                                  if (val && val !== "none") {
                                    const selectedProduct = productsServices?.find(p => p.id === val);
                                    if (selectedProduct) {
                                      form.setValue(`line_items.${index}.description`, selectedProduct.name);
                                      form.setValue(`line_items.${index}.unit_price`, selectedProduct.unit_price);
                                      form.setValue(`line_items.${index}.unit_type`, selectedProduct.unit || '');
                                    }
                                  }
                                }} 
                                value={psField.value || "none"}
                              >
                                <FormControl>
                                  <SelectTrigger className="text-sm">
                                    <SelectValue placeholder="Select service" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">Custom item</SelectItem>
                                  {Object.entries(groupedProducts).map(([type, products]) => (
                                    <SelectGroup key={type}>
                                      <SelectLabel className="capitalize">
                                        {SERVICE_TYPES[type as keyof typeof SERVICE_TYPES]?.label || type}
                                      </SelectLabel>
                                      {products.map((product) => (
                                        <SelectItem key={product.id} value={product.id}>
                                          {product.name} ({currencySymbol}{product.unit_price})
                                        </SelectItem>
                                      ))}
                                    </SelectGroup>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-3">
                        <FormField
                          control={form.control}
                          name={`line_items.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...field} placeholder="Description" className="text-sm" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-1">
                        <FormField
                          control={form.control}
                          name={`line_items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number" 
                                  min="0" 
                                  step="0.01"
                                  className="text-sm text-center" 
                                  disabled={isPercentage}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name={`line_items.${index}.unit_price`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number" 
                                  min="0" 
                                  step="0.01"
                                  className="text-sm text-right" 
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-2 text-right font-medium text-sm">
                        {currencySymbol}{lineTotal.toFixed(2)}
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddLineItem}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Line Item
              </Button>
            </div>

            {/* Summary Section */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{currencySymbol}{calculations.subtotal.toFixed(2)}</span>
              </div>
              
              {calculations.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-{currencySymbol}{calculations.discountAmount.toFixed(2)}</span>
                </div>
              )}
              
              {calculations.taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax ({watchTaxRate}%)</span>
                  <span>{currencySymbol}{calculations.taxAmount.toFixed(2)}</span>
                </div>
              )}
              
              <Separator />
              
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">{currencySymbol}{calculations.total.toFixed(2)}</span>
              </div>
              
              {watchCurrency !== 'TZS' && calculations.tzsTotal && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>TZS Equivalent</span>
                  <span>TZS {calculations.tzsTotal.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Additional notes..." rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createEstimate.isPending || isCreatingCustomer}>
                {createEstimate.isPending ? 'Creating...' : 'Create Estimate'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
