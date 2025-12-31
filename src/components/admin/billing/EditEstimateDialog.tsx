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
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { toast } from 'sonner';

const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().min(0, 'Quantity must be 0 or more'),
  unit_price: z.coerce.number().min(0, 'Price must be 0 or more'),
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

  // Load estimate data when dialog opens
  useEffect(() => {
    if (open) {
      // Build line items from estimate data
      const items = [];
      
      // Shipping line item
      if (estimate.weight_kg > 0) {
        items.push({
          description: `Shipping ${estimate.weight_kg}kg @ ${CURRENCY_SYMBOLS[estimate.currency] || '$'}${estimate.rate_per_kg}/kg`,
          quantity: estimate.weight_kg,
          unit_price: estimate.rate_per_kg,
        });
      }
      
      // Handling fee
      if (estimate.handling_fee > 0) {
        items.push({
          description: 'Handling Fee',
          quantity: 1,
          unit_price: estimate.handling_fee,
        });
      }
      
      // Product cost (for purchase_shipping type)
      if (estimate.product_cost > 0) {
        items.push({
          description: 'Product Cost',
          quantity: 1,
          unit_price: estimate.product_cost,
        });
      }
      
      // Purchase fee
      if (estimate.purchase_fee > 0) {
        items.push({
          description: 'Purchase Fee',
          quantity: 1,
          unit_price: estimate.purchase_fee,
        });
      }

      // If no items, add a default one
      if (items.length === 0) {
        items.push({ description: '', quantity: 1, unit_price: 0 });
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
  }, [open, estimate, form]);

  const watchedItems = form.watch('line_items');
  const watchedCurrency = form.watch('currency');

  const calculations = useMemo(() => {
    const subtotal = watchedItems.reduce((sum, item) => {
      return sum + (Number(item.quantity) * Number(item.unit_price));
    }, 0);
    return { subtotal, total: subtotal };
  }, [watchedItems]);

  const currencySymbol = CURRENCY_SYMBOLS[watchedCurrency] || watchedCurrency;

  const onSubmit = async (data: EstimateFormData) => {
    setIsSubmitting(true);
    try {
      // Calculate weight and rate from first line item (assuming it's shipping)
      const shippingItem = data.line_items[0];
      const weight_kg = Number(shippingItem?.quantity || 0);
      const rate_per_kg = Number(shippingItem?.unit_price || 0);
      
      // Get handling fee from second item if exists
      const handling_fee = data.line_items.length > 1 
        ? Number(data.line_items[1]?.unit_price || 0)
        : 0;

      await updateEstimate.mutateAsync({
        id: estimate.id,
        customer_id: data.customer_id,
        origin_region: data.origin_region as any,
        currency: data.currency,
        valid_until: data.valid_until || null,
        notes: data.notes || null,
        weight_kg,
        rate_per_kg,
        handling_fee,
        subtotal: calculations.subtotal,
        total: calculations.total,
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                        <SelectItem value="TZS">TZS (TSh)</SelectItem>
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
                  onClick={() => append({ description: '', quantity: 1, unit_price: 0 })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-start p-3 bg-muted/50 rounded-lg">
                  <div className="col-span-5">
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
                      name={`line_items.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Qty</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" min="0" />
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
                          <FormLabel className="text-xs">Price</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" min="0" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="col-span-2 pt-6">
                    <p className="text-sm font-medium">
                      {currencySymbol}{(Number(watchedItems[index]?.quantity || 0) * Number(watchedItems[index]?.unit_price || 0)).toFixed(2)}
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
              ))}
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
