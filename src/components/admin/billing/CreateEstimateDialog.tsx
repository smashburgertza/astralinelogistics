import { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, FileText } from 'lucide-react';
import { Estimate, useCreateEstimate, useUpdateEstimate } from '@/hooks/useEstimates';
import { useCustomers, useShipments } from '@/hooks/useShipments';
import { useExchangeRates, convertToTZS } from '@/hooks/useExchangeRates';
import { useProductsServices, SERVICE_TYPES } from '@/hooks/useProductsServices';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { toast } from 'sonner';

const lineItemSchema = z.object({
  product_service_id: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().min(0, 'Quantity must be 0 or more'),
  unit_price: z.coerce.number().min(0, 'Price must be 0 or more'),
  unit_type: z.string().optional(),
});

const estimateSchema = z.object({
  customer_id: z.string().min(1, 'Customer is required'),
  shipment_id: z.string().optional(),
  origin_region: z.string().min(1, 'Region is required'),
  currency: z.string().default('TZS'),
  valid_days: z.coerce.number().min(1).default(30),
  discount: z.string().optional(),
  tax_rate: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().optional(),
  line_items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
});

type EstimateFormData = z.infer<typeof estimateSchema>;

interface CreateEstimateDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  regions?: Array<{ code: string; name: string; flag_emoji?: string | null }>;
  editEstimate?: Estimate | null; // For edit mode
}

export function CreateEstimateDialog({ trigger, open: controlledOpen, onOpenChange, regions = [], editEstimate }: CreateEstimateDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const isEditMode = !!editEstimate;
  const createEstimate = useCreateEstimate();
  const updateEstimate = useUpdateEstimate();
  const { data: customers } = useCustomers();
  const { data: shipments } = useShipments();
  const { data: exchangeRates } = useExchangeRates();
  const { data: productsServices } = useProductsServices({ active: true });

  // Parse notes to extract line items info if available
  const parseNotesForLineItems = (notes: string | null) => {
    if (!notes) return null;
    
    // Try to parse JSON format first (new format)
    const jsonMatch = notes.match(/\[LINE_ITEMS_JSON\](.*?)\[\/LINE_ITEMS_JSON\]/s);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(item => ({
            product_service_id: item.product_service_id || '',
            description: item.description || '',
            quantity: item.quantity || 1,
            unit_price: item.unit_price || 0,
            unit_type: item.unit_type || '',
          }));
        }
      } catch (e) {
        console.error('Failed to parse line items JSON:', e);
      }
    }
    
    return null;
  };

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

  const form = useForm<EstimateFormData>({
    resolver: zodResolver(estimateSchema),
    defaultValues: {
      customer_id: '',
      shipment_id: '',
      origin_region: '',
      currency: 'TZS',
      valid_days: 30,
      discount: '',
      tax_rate: 0,
      notes: '',
      line_items: [
        { product_service_id: '', description: '', quantity: 1, unit_price: 0, unit_type: '' },
      ],
    },
  });

  // Reset form when dialog opens or load edit data
  useEffect(() => {
    if (open) {
      if (isEditMode && editEstimate) {
        // Parse line items from notes or build from estimate data
        const parsedItems = parseNotesForLineItems(editEstimate.notes);
        
        if (parsedItems && parsedItems.length > 0) {
          form.reset({
            customer_id: editEstimate.customer_id || '',
            shipment_id: editEstimate.shipment_id || '',
            origin_region: editEstimate.origin_region || '',
            currency: editEstimate.currency || 'USD',
            valid_days: 30,
            discount: '',
            tax_rate: 0,
            notes: '',
            line_items: parsedItems,
          });
        } else {
          // Build line items from estimate data (legacy format)
          const items: Array<{
            product_service_id: string;
            description: string;
            quantity: number;
            unit_price: number;
            unit_type: string;
          }> = [];
          
          // Product cost
          if (editEstimate.product_cost && editEstimate.product_cost > 0) {
            const productService = productsServices?.find(ps => ps.service_type === 'product');
            items.push({
              product_service_id: productService?.id || '',
              description: 'Product Cost',
              quantity: 1,
              unit_price: editEstimate.product_cost,
              unit_type: 'fixed',
            });
          }
          
          // Shipping
          if (editEstimate.weight_kg > 0) {
            const shippingService = productsServices?.find(ps => ps.service_type === 'air_cargo');
            items.push({
              product_service_id: shippingService?.id || '',
              description: 'Air Cargo Shipping',
              quantity: editEstimate.weight_kg,
              unit_price: editEstimate.rate_per_kg,
              unit_type: 'kg',
            });
          }
          
          // Handling fee
          if (editEstimate.handling_fee && editEstimate.handling_fee > 0) {
            const handlingService = productsServices?.find(ps => ps.service_type === 'handling');
            items.push({
              product_service_id: handlingService?.id || '',
              description: 'Handling Fee',
              quantity: 1,
              unit_price: editEstimate.handling_fee,
              unit_type: 'fixed',
            });
          }
          
          // Purchase fee
          if (editEstimate.purchase_fee && editEstimate.purchase_fee > 0) {
            const customsService = productsServices?.find(ps => ps.service_type === 'customs');
            items.push({
              product_service_id: customsService?.id || '',
              description: 'Customs & Duty Clearance',
              quantity: 1,
              unit_price: editEstimate.purchase_fee,
              unit_type: 'fixed',
            });
          }

          if (items.length === 0) {
            items.push({ product_service_id: '', description: '', quantity: 1, unit_price: 0, unit_type: '' });
          }

          form.reset({
            customer_id: editEstimate.customer_id || '',
            shipment_id: editEstimate.shipment_id || '',
            origin_region: editEstimate.origin_region || '',
            currency: editEstimate.currency || 'USD',
            valid_days: 30,
            discount: '',
            tax_rate: 0,
            notes: '',
            line_items: items,
          });
        }
      } else {
        // Create mode - reset to defaults
        form.reset({
          customer_id: '',
          shipment_id: '',
          origin_region: '',
          currency: 'TZS',
          valid_days: 30,
          discount: '',
          tax_rate: 0,
          notes: '',
          line_items: [
            { product_service_id: '', description: '', quantity: 1, unit_price: 0, unit_type: '' },
          ],
        });
      }
    }
  }, [open, form, isEditMode, editEstimate, productsServices]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'line_items',
  });

  const watchLineItems = useWatch({ control: form.control, name: 'line_items' });
  const watchDiscount = useWatch({ control: form.control, name: 'discount' });
  const watchTaxRate = useWatch({ control: form.control, name: 'tax_rate' });
  const watchCurrency = useWatch({ control: form.control, name: 'currency' });
  const watchCustomerId = useWatch({ control: form.control, name: 'customer_id' });

  const selectedCustomer = customers?.find(c => c.id === watchCustomerId);

  // Calculate totals
  const calculations = useMemo(() => {
    let runningTotal = 0;
    let productCostTotal = 0;
    let purchaseFeeTotal = 0;
    
    watchLineItems.forEach((item) => {
      // Find the product/service to check its type
      const productService = productsServices?.find(p => p.id === item.product_service_id);
      const isPurchasingType = productService?.service_type === 'purchasing';
      // Check if this is product cost (linked to asset account 1230) or purchase fee (linked to revenue 4130)
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

    // Calculate TZS equivalents
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
    // For estimates, we'll store line items info in the existing fields
    // Using the first line item as the primary description
    const totalWeight = data.line_items.reduce((sum, item) => {
      // Only count weight for non-percentage items
      if (item.unit_type !== 'percent') {
        return sum + item.quantity;
      }
      return sum;
    }, 0);
    const avgRate = totalWeight > 0 ? calculations.subtotal / totalWeight : 0;
    
    // Determine estimate type based on whether it includes product costs
    const hasPurchaseItems = calculations.productCost > 0 || calculations.purchaseFee > 0;
    const estimateType = hasPurchaseItems ? 'purchase_shipping' : 'shipping';

    // Store line items as JSON for reliable parsing, plus human-readable summary
    const lineItemsJson = JSON.stringify(data.line_items.map(i => ({
      product_service_id: i.product_service_id,
      description: i.description,
      quantity: i.quantity,
      unit_price: i.unit_price,
      unit_type: i.unit_type,
    })));
    const humanReadable = data.line_items.map(i => `${i.description} (${i.unit_type === 'percent' ? `${i.unit_price}%` : `${i.quantity} x ${currencySymbol}${i.unit_price}`})`).join(', ');
    const notesFromItems = `[LINE_ITEMS_JSON]${lineItemsJson}[/LINE_ITEMS_JSON]\n${data.notes || humanReadable}`;

    try {
      if (isEditMode && editEstimate) {
        // Update existing estimate
        await updateEstimate.mutateAsync({
          id: editEstimate.id,
          customer_id: data.customer_id,
          shipment_id: data.shipment_id || null,
          origin_region: data.origin_region as any,
          weight_kg: totalWeight,
          rate_per_kg: avgRate,
          handling_fee: 0,
          currency: data.currency,
          notes: notesFromItems,
          estimate_type: estimateType,
          product_cost: calculations.productCost,
          purchase_fee: calculations.purchaseFee,
          subtotal: calculations.subtotal,
          total: calculations.total,
        });
        toast.success('Estimate updated successfully');
      } else {
        // Create new estimate
        await createEstimate.mutateAsync({
          customer_id: data.customer_id,
          shipment_id: data.shipment_id || undefined,
          origin_region: data.origin_region,
          weight_kg: totalWeight,
          rate_per_kg: avgRate,
          handling_fee: 0,
          currency: data.currency,
          notes: notesFromItems,
          valid_days: data.valid_days,
          estimate_type: estimateType,
          product_cost: calculations.productCost,
          purchase_fee: calculations.purchaseFee,
          subtotal: calculations.subtotal,
          total: calculations.total,
        });
      }

      form.reset();
      setOpen(false);
    } catch (error: any) {
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} estimate: ${error.message}`);
    }
  };

  const handleAddLineItem = () => {
    append({ product_service_id: '', description: '', quantity: 1, unit_price: 0, unit_type: '' });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[calc(100vw-var(--sidebar-width,256px)-2rem)] sm:max-h-[calc(100vh-2rem)] h-[calc(100vh-2rem)] overflow-y-auto fixed right-4 left-auto top-4 translate-x-0 translate-y-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary">
            {isEditMode ? `Edit Estimate ${editEstimate?.estimate_number}` : 'Generate Estimate'}
          </DialogTitle>
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="font-medium">
                              <SelectValue placeholder="Select customer" />
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
                            {regions.map((region) => (
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

              {/* Shipment & Date */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <FormField
                  control={form.control}
                  name="shipment_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Link to Shipment (optional)</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(val === "none" ? "" : val)} 
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select shipment" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No shipment</SelectItem>
                          {shipments?.map((shipment) => (
                            <SelectItem key={shipment.id} value={shipment.id}>
                              {shipment.tracking_number} ({shipment.total_weight_kg} kg)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Estimate Date</p>
                  <p className="font-medium">{format(new Date(), 'MMMM dd, yyyy')}</p>
                </div>
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
                                  // Auto-fill description, unit_price, and unit_type from selected product/service
                                  if (val && val !== "none") {
                                    const selectedProduct = productsServices?.find(p => p.id === val);
                                    if (selectedProduct) {
                                      form.setValue(`line_items.${index}.description`, selectedProduct.name);
                                      form.setValue(`line_items.${index}.unit_price`, selectedProduct.unit_price);
                                      form.setValue(`line_items.${index}.unit_type`, selectedProduct.unit || '');
                                      if (selectedProduct.unit === 'percent') {
                                        form.setValue(`line_items.${index}.quantity`, 1);
                                      }
                                    }
                                  } else {
                                    form.setValue(`line_items.${index}.unit_type`, '');
                                  }
                                }} 
                                value={psField.value || "none"}
                              >
                                <FormControl>
                                  <SelectTrigger className="text-xs">
                                    <SelectValue placeholder="Select item" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Object.entries(groupedProducts).map(([type, items]) => (
                                    <SelectGroup key={type}>
                                      <SelectLabel className="text-xs font-semibold">
                                        {SERVICE_TYPES[type as keyof typeof SERVICE_TYPES]?.label || type}
                                      </SelectLabel>
                                      {items.map((item) => (
                                        <SelectItem key={item.id} value={item.id} className="text-xs">
                                          {item.name} - {item.unit === 'percent' ? `${item.unit_price}%` : `${CURRENCY_SYMBOLS[item.currency] || '$'}${item.unit_price}/${item.unit}`}
                                        </SelectItem>
                                      ))}
                                    </SelectGroup>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
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
                                <Input 
                                  placeholder="Description" 
                                  {...field} 
                                  className="border-2 border-dashed text-xs"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      {/* Quantity - hidden for percentage items */}
                      <div className="col-span-1">
                        {isPercentage ? (
                          <div className="text-center text-xs text-muted-foreground">-</div>
                        ) : (
                          <FormField
                            control={form.control}
                            name={`line_items.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.01"
                                    min="0"
                                    className="text-center text-xs"
                                    value={field.value}
                                    onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                    onBlur={field.onBlur}
                                    name={field.name}
                                    ref={field.ref}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                      {/* Unit Price - show as percentage for percent items */}
                      <div className="col-span-2">
                        {isPercentage ? (
                          <div className="text-right text-xs font-medium">{unitPrice}%</div>
                        ) : (
                          <FormField
                            control={form.control}
                            name={`line_items.${index}.unit_price`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.01"
                                    min="0"
                                    className="text-right text-xs"
                                    value={field.value}
                                    onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                    onBlur={field.onBlur}
                                    name={field.name}
                                    ref={field.ref}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                      <div className="col-span-2 text-right font-medium text-sm">
                        {currencySymbol}{lineTotal.toFixed(2)}
                      </div>
                      <div className="col-span-1 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Line Item Button */}
              <button
                type="button"
                onClick={handleAddLineItem}
                className="w-full py-3 border-2 border-dashed border-primary/30 rounded-lg text-primary hover:bg-primary/5 hover:border-primary/50 transition-colors font-medium"
              >
                + Add Line Item
              </button>
            </div>

            {/* Discount, Validity & Summary */}
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="discount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., 10% or $25.00" 
                          {...field}
                          className="border-2 border-dashed"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="valid_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valid For (days)</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tax_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Rate (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>

              {/* Right Column - Summary */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-start">
                  <span className="text-muted-foreground">Subtotal</span>
                  <div className="text-right">
                    <span className="font-medium">{currencySymbol}{calculations.subtotal.toFixed(2)}</span>
                    {watchCurrency !== 'TZS' && calculations.tzsSubtotal && (
                      <p className="text-xs text-muted-foreground">≈ TZS {calculations.tzsSubtotal.toLocaleString()}</p>
                    )}
                  </div>
                </div>
                {calculations.discountAmount > 0 && (
                  <div className="flex justify-between items-start text-emerald-600">
                    <span>Discount</span>
                    <div className="text-right">
                      <span>-{currencySymbol}{calculations.discountAmount.toFixed(2)}</span>
                      {watchCurrency !== 'TZS' && calculations.tzsDiscount && (
                        <p className="text-xs text-emerald-500">≈ TZS -{calculations.tzsDiscount.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                )}
                {watchTaxRate > 0 && (
                  <div className="flex justify-between items-start">
                    <span className="text-muted-foreground">Tax ({watchTaxRate}%)</span>
                    <div className="text-right">
                      <span>{currencySymbol}{calculations.taxAmount.toFixed(2)}</span>
                      {watchCurrency !== 'TZS' && calculations.tzsTax && (
                        <p className="text-xs text-muted-foreground">≈ TZS {calculations.tzsTax.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between items-start text-lg font-bold">
                  <span>Total Amount</span>
                  <div className="text-right">
                    <span className="text-primary">{currencySymbol}{calculations.total.toFixed(2)}</span>
                    {watchCurrency !== 'TZS' && calculations.tzsTotal && (
                      <p className="text-sm font-semibold text-muted-foreground">≈ TZS {calculations.tzsTotal.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes..." rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                className="px-6"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="secondary"
                disabled={createEstimate.isPending || calculations.total <= 0}
                className="px-6"
              >
                {createEstimate.isPending ? 'Saving...' : 'Save'}
              </Button>
              <Button 
                type="submit" 
                disabled={createEstimate.isPending || calculations.total <= 0}
                className="px-6 bg-primary hover:bg-primary/90"
              >
                {createEstimate.isPending ? 'Saving...' : 'Save & Send'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
