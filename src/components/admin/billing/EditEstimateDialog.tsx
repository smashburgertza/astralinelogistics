import { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2 } from 'lucide-react';
import { Estimate, useUpdateEstimate } from '@/hooks/useEstimates';
import { useCustomers } from '@/hooks/useShipments';
import { useExchangeRates, convertToTZS } from '@/hooks/useExchangeRates';
import { useActiveRegions } from '@/hooks/useRegions';
import { useProductsServices } from '@/hooks/useProductsServices';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { toast } from 'sonner';

const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().min(0, 'Quantity must be 0 or more'),
  unit_price: z.coerce.number().min(0, 'Price must be 0 or more'),
  unit_type: z.enum(['fixed', 'kg', 'percent']).default('fixed'),
  product_service_id: z.string().optional(),
});

const estimateSchema = z.object({
  customer_id: z.string().min(1, 'Customer is required'),
  origin_region: z.string().min(1, 'Region is required'),
  currency: z.string().default('TZS'),
  valid_until: z.string().optional(),
  notes: z.string().optional(),
  line_items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
});

type EstimateFormData = z.infer<typeof estimateSchema>;

interface EditEstimateDialogProps {
  estimate: Estimate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditEstimateDialog({ estimate, open, onOpenChange }: EditEstimateDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateEstimate = useUpdateEstimate();
  const { data: customers } = useCustomers();
  const { data: exchangeRates } = useExchangeRates();
  const { data: regions } = useActiveRegions();
  const { data: productsServices } = useProductsServices();

  const form = useForm<EstimateFormData>({
    resolver: zodResolver(estimateSchema),
    defaultValues: {
      customer_id: estimate.customer_id || '',
      origin_region: estimate.origin_region || '',
      currency: estimate.currency || 'TZS',
      valid_until: estimate.valid_until || '',
      notes: estimate.notes || '',
      line_items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'line_items',
  });

  // Parse notes to extract line items info if available
  const parseNotesForLineItems = (notes: string | null) => {
    if (!notes) return null;
    
    // Try to parse line items from notes format: "Line Items: Description (qty x $price), ..."
    const match = notes.match(/Line Items:\s*(.+)/);
    if (!match) return null;
    
    const items: Array<{
      description: string;
      quantity: number;
      unit_price: number;
      unit_type: 'fixed' | 'kg' | 'percent';
    }> = [];
    
    // Split by comma and parse each item
    const itemParts = match[1].split('),');
    for (const part of itemParts) {
      const trimmed = part.trim().replace(/\)$/, '');
      
      // Check for percentage format: "Description (X%)"
      const percentMatch = trimmed.match(/^(.+?)\s*\((\d+(?:\.\d+)?)%$/);
      if (percentMatch) {
        items.push({
          description: percentMatch[1].trim(),
          quantity: 1,
          unit_price: parseFloat(percentMatch[2]),
          unit_type: 'percent',
        });
        continue;
      }
      
      // Check for fixed/kg format: "Description (qty x $price)"
      const fixedMatch = trimmed.match(/^(.+?)\s*\((\d+(?:\.\d+)?)\s*x\s*[$£€¥]?(\d+(?:\.\d+)?)$/);
      if (fixedMatch) {
        const description = fixedMatch[1].trim();
        const qty = parseFloat(fixedMatch[2]);
        const price = parseFloat(fixedMatch[3]);
        
        // Determine if it's kg or fixed based on description
        const isKg = description.toLowerCase().includes('shipping') || 
                     description.toLowerCase().includes('air cargo') ||
                     description.toLowerCase().includes('kg');
        
        items.push({
          description,
          quantity: qty,
          unit_price: price,
          unit_type: isKg ? 'kg' : 'fixed',
        });
      }
    }
    
    return items.length > 0 ? items : null;
  };

  // Load estimate data when dialog opens
  useEffect(() => {
    if (open) {
      // Try to parse line items from notes first
      const parsedItems = parseNotesForLineItems(estimate.notes);
      
      if (parsedItems && parsedItems.length > 0) {
        // Use parsed line items from notes
        form.reset({
          customer_id: estimate.customer_id || '',
          origin_region: estimate.origin_region || '',
          currency: estimate.currency || 'USD',
          valid_until: estimate.valid_until || '',
          notes: '', // Clear notes since we're using line items
          line_items: parsedItems,
        });
      } else {
        // Build line items from estimate data (legacy format)
        const items: Array<{
          description: string;
          quantity: number;
          unit_price: number;
          unit_type: 'fixed' | 'kg' | 'percent';
          product_service_id?: string;
        }> = [];
        
        // Product cost (for purchase_shipping type)
        if (estimate.product_cost && estimate.product_cost > 0) {
          const productService = productsServices?.find(ps => ps.service_type === 'product');
          items.push({
            description: 'Product Cost',
            quantity: 1,
            unit_price: estimate.product_cost,
            unit_type: 'fixed',
            product_service_id: productService?.id,
          });
        }
        
        // Shipping line item
        if (estimate.weight_kg > 0) {
          const shippingService = productsServices?.find(ps => ps.service_type === 'air_cargo');
          items.push({
            description: `Air Cargo Shipping`,
            quantity: estimate.weight_kg,
            unit_price: estimate.rate_per_kg,
            unit_type: 'kg',
            product_service_id: shippingService?.id,
          });
        }
        
        // Handling fee
        if (estimate.handling_fee && estimate.handling_fee > 0) {
          const handlingService = productsServices?.find(ps => ps.service_type === 'handling');
          // Calculate percentage if we can determine the base
          const baseAmount = (estimate.product_cost || 0) + (estimate.weight_kg * estimate.rate_per_kg);
          const handlingPercent = baseAmount > 0 ? (estimate.handling_fee / baseAmount) * 100 : 0;
          
          items.push({
            description: 'Handling Fee',
            quantity: 1,
            unit_price: handlingPercent > 0 ? handlingPercent : estimate.handling_fee,
            unit_type: handlingPercent > 0 ? 'percent' : 'fixed',
            product_service_id: handlingService?.id,
          });
        }
        
        // Purchase fee
        if (estimate.purchase_fee && estimate.purchase_fee > 0) {
          const customsService = productsServices?.find(ps => ps.service_type === 'customs');
          // Calculate percentage if we can determine the base
          const baseAmount = estimate.product_cost || 0;
          const customsPercent = baseAmount > 0 ? (estimate.purchase_fee / baseAmount) * 100 : 0;
          
          items.push({
            description: 'Customs & Duty Clearance',
            quantity: 1,
            unit_price: customsPercent > 0 ? customsPercent : estimate.purchase_fee,
            unit_type: customsPercent > 0 ? 'percent' : 'fixed',
            product_service_id: customsService?.id,
          });
        }

        // If no items, add a default one
        if (items.length === 0) {
          items.push({ description: '', quantity: 1, unit_price: 0, unit_type: 'fixed' });
        }

        form.reset({
          customer_id: estimate.customer_id || '',
          origin_region: estimate.origin_region || '',
          currency: estimate.currency || 'USD',
          valid_until: estimate.valid_until || '',
          notes: estimate.notes || '',
          line_items: items,
        });
      }
    }
  }, [open, estimate, form, productsServices]);

  const watchedItems = form.watch('line_items');
  const watchedCurrency = form.watch('currency');

  const calculations = useMemo(() => {
    let subtotal = 0;
    let productCost = 0;
    let purchaseFee = 0;
    
    // First pass: calculate base amounts (non-percentage items)
    for (const item of watchedItems) {
      if (item.unit_type !== 'percent') {
        const amount = Number(item.quantity) * Number(item.unit_price);
        subtotal += amount;
        
        // Track product cost for percentage calculations
        if (item.description?.toLowerCase().includes('product')) {
          productCost += amount;
        }
      }
    }
    
    // Second pass: calculate percentage-based items
    for (const item of watchedItems) {
      if (item.unit_type === 'percent') {
        // Determine base amount for percentage
        const isCustoms = item.description?.toLowerCase().includes('customs') || 
                          item.description?.toLowerCase().includes('duty');
        const baseAmount = isCustoms ? productCost : subtotal;
        const amount = (Number(item.unit_price) / 100) * baseAmount;
        purchaseFee += amount;
      }
    }
    
    const total = subtotal + purchaseFee;
    
    return { subtotal, productCost, purchaseFee, total };
  }, [watchedItems]);

  const currencySymbol = CURRENCY_SYMBOLS[watchedCurrency] || watchedCurrency;

  const getLineItemAmount = (item: typeof watchedItems[0], index: number) => {
    if (item.unit_type === 'percent') {
      // Calculate the base amount for percentage
      const isCustoms = item.description?.toLowerCase().includes('customs') || 
                        item.description?.toLowerCase().includes('duty');
      
      let baseAmount = 0;
      if (isCustoms) {
        // Customs is based on product cost only
        for (const i of watchedItems) {
          if (i.unit_type !== 'percent' && i.description?.toLowerCase().includes('product')) {
            baseAmount += Number(i.quantity) * Number(i.unit_price);
          }
        }
      } else {
        // Handling is based on subtotal
        for (const i of watchedItems) {
          if (i.unit_type !== 'percent') {
            baseAmount += Number(i.quantity) * Number(i.unit_price);
          }
        }
      }
      
      return (Number(item.unit_price) / 100) * baseAmount;
    }
    return Number(item.quantity) * Number(item.unit_price);
  };

  const onSubmit = async (data: EstimateFormData) => {
    setIsSubmitting(true);
    try {
      // Calculate weight from kg-based items
      const totalWeight = data.line_items.reduce((sum, item) => {
        if (item.unit_type === 'kg') {
          return sum + Number(item.quantity);
        }
        return sum;
      }, 0);
      
      // Get average rate per kg
      const shippingItems = data.line_items.filter(item => item.unit_type === 'kg');
      const avgRate = shippingItems.length > 0 
        ? shippingItems.reduce((sum, item) => sum + Number(item.unit_price), 0) / shippingItems.length
        : 0;

      // Build notes from line items
      const notesFromItems = `Line Items: ${data.line_items.map(i => 
        `${i.description} (${i.unit_type === 'percent' ? `${i.unit_price}%` : `${i.quantity} x ${currencySymbol}${i.unit_price}`})`
      ).join(', ')}`;

      await updateEstimate.mutateAsync({
        id: estimate.id,
        customer_id: data.customer_id,
        origin_region: data.origin_region as any,
        currency: data.currency,
        valid_until: data.valid_until || null,
        notes: data.notes || notesFromItems,
        weight_kg: totalWeight,
        rate_per_kg: avgRate,
        handling_fee: 0, // Handled in total calculation
        subtotal: calculations.subtotal,
        total: calculations.total,
        product_cost: calculations.productCost,
        purchase_fee: calculations.purchaseFee,
      });

      toast.success('Estimate updated successfully');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Failed to update estimate: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Estimate {estimate.estimate_number}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
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

              <FormField
                control={form.control}
                name="origin_region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origin Region</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="CNY">CNY (¥)</SelectItem>
                        <SelectItem value="AED">AED (د.إ)</SelectItem>
                        <SelectItem value="TZS">TZS</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="valid_until"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid Until</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Line Items</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ description: '', quantity: 1, unit_price: 0, unit_type: 'fixed' })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {fields.map((field, index) => {
                const item = watchedItems[index];
                const amount = getLineItemAmount(item, index);
                
                return (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-start p-3 bg-muted/50 rounded-lg">
                    <div className="col-span-4">
                      <FormField
                        control={form.control}
                        name={`line_items.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Description</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Item description" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name={`line_items.${index}.unit_type`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="fixed">Fixed</SelectItem>
                                <SelectItem value="kg">Per kg</SelectItem>
                                <SelectItem value="percent">Percent</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name={`line_items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              {item?.unit_type === 'kg' ? 'Weight (kg)' : item?.unit_type === 'percent' ? 'Base' : 'Qty'}
                            </FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number" 
                                step="0.01" 
                                min="0"
                                disabled={item?.unit_type === 'percent'}
                              />
                            </FormControl>
                            <FormMessage />
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
                            <FormLabel className="text-xs">
                              {item?.unit_type === 'percent' ? 'Rate (%)' : `Price (${currencySymbol})`}
                            </FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.01" min="0" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="col-span-1 pt-6">
                      <p className="text-sm font-medium">
                        {currencySymbol}{amount.toFixed(2)}
                      </p>
                    </div>

                    <div className="col-span-1 pt-6">
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <Separator />

            <div className="flex justify-end">
              <div className="text-right space-y-1">
                <p className="text-lg font-bold">
                  Total: {currencySymbol}{calculations.total.toFixed(2)}
                </p>
                {watchedCurrency !== 'TZS' && exchangeRates && (
                  <p className="text-sm text-muted-foreground">
                    ≈ TZS {convertToTZS(calculations.total, watchedCurrency, exchangeRates).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Additional notes..." rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || calculations.total <= 0}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
