import { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { useCreateEstimate } from '@/hooks/useEstimates';
import { useCustomers, useShipments } from '@/hooks/useShipments';
import { useExchangeRates, convertToTZS } from '@/hooks/useExchangeRates';
import { useChartOfAccounts } from '@/hooks/useAccounting';
import { CURRENCY_SYMBOLS } from '@/lib/constants';

const lineItemSchema = z.object({
  account_id: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  unit_price: z.coerce.number().min(0, 'Price must be 0 or more'),
});

const estimateSchema = z.object({
  customer_id: z.string().min(1, 'Customer is required'),
  shipment_id: z.string().optional(),
  origin_region: z.string().min(1, 'Region is required'),
  currency: z.string().default('USD'),
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
}

export function CreateEstimateDialog({ trigger, open: controlledOpen, onOpenChange, regions = [] }: CreateEstimateDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const createEstimate = useCreateEstimate();
  const { data: customers } = useCustomers();
  const { data: shipments } = useShipments();
  const { data: exchangeRates } = useExchangeRates();
  const { data: accounts } = useChartOfAccounts({ active: true });

  // Group accounts by type for the dropdown
  const groupedAccounts = useMemo(() => {
    if (!accounts) return { revenue: [], expense: [] };
    return {
      revenue: accounts.filter(a => a.account_type === 'revenue'),
      expense: accounts.filter(a => a.account_type === 'expense'),
    };
  }, [accounts]);

  const form = useForm<EstimateFormData>({
    resolver: zodResolver(estimateSchema),
    defaultValues: {
      customer_id: '',
      shipment_id: '',
      origin_region: '',
      currency: 'USD',
      valid_days: 30,
      discount: '',
      tax_rate: 0,
      notes: '',
      line_items: [
        { account_id: '', description: '', quantity: 1, unit_price: 0 },
      ],
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        customer_id: '',
        shipment_id: '',
        origin_region: '',
        currency: 'USD',
        valid_days: 30,
        discount: '',
        tax_rate: 0,
        notes: '',
        line_items: [
          { account_id: '', description: '', quantity: 1, unit_price: 0 },
        ],
      });
    }
  }, [open, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'line_items',
  });

  const watchLineItems = form.watch('line_items');
  const watchDiscount = form.watch('discount');
  const watchTaxRate = form.watch('tax_rate');
  const watchCurrency = form.watch('currency');
  const watchCustomerId = form.watch('customer_id');

  const selectedCustomer = customers?.find(c => c.id === watchCustomerId);

  // Calculate totals
  const calculations = useMemo(() => {
    const subtotal = watchLineItems.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price);
    }, 0);

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
    };
  }, [watchLineItems, watchDiscount, watchTaxRate, watchCurrency, exchangeRates]);

  const currencySymbol = CURRENCY_SYMBOLS[watchCurrency] || '$';

  const onSubmit = async (data: EstimateFormData) => {
    // For estimates, we'll store line items info in the existing fields
    // Using the first line item as the primary description
    const totalWeight = data.line_items.reduce((sum, item) => sum + item.quantity, 0);
    const avgRate = calculations.subtotal / totalWeight || 0;

    await createEstimate.mutateAsync({
      customer_id: data.customer_id,
      shipment_id: data.shipment_id || undefined,
      origin_region: data.origin_region,
      weight_kg: totalWeight,
      rate_per_kg: avgRate,
      handling_fee: 0,
      currency: data.currency,
      notes: data.notes || `Line Items: ${data.line_items.map(i => `${i.description} (${i.quantity} x ${currencySymbol}${i.unit_price})`).join(', ')}`,
      valid_days: data.valid_days,
      estimate_type: 'shipping',
      product_cost: 0,
      purchase_fee: 0,
    });

    form.reset();
    setOpen(false);
  };

  const handleAddLineItem = () => {
    append({ account_id: '', description: '', quantity: 1, unit_price: 0 });
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
            Generate Estimate
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
                            <SelectItem value="TZS">TZS (TSh)</SelectItem>
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
                  const lineTotal = quantity * unitPrice;

                  return (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-3">
                        <FormField
                          control={form.control}
                          name={`line_items.${index}.account_id`}
                          render={({ field }) => (
                            <FormItem>
                              <Select 
                                onValueChange={(val) => field.onChange(val === "none" ? "" : val)} 
                                value={field.value || "none"}
                              >
                                <FormControl>
                                  <SelectTrigger className="text-xs">
                                    <SelectValue placeholder="Select service" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">No account</SelectItem>
                                  {groupedAccounts.revenue.length > 0 && (
                                    <SelectGroup>
                                      <SelectLabel className="text-xs font-semibold text-primary">Revenue</SelectLabel>
                                      {groupedAccounts.revenue.map((account) => (
                                        <SelectItem key={account.id} value={account.id} className="text-xs">
                                          {account.account_code} - {account.account_name}
                                        </SelectItem>
                                      ))}
                                    </SelectGroup>
                                  )}
                                  {groupedAccounts.expense.length > 0 && (
                                    <SelectGroup>
                                      <SelectLabel className="text-xs font-semibold text-destructive">Costs/Expenses</SelectLabel>
                                      {groupedAccounts.expense.map((account) => (
                                        <SelectItem key={account.id} value={account.id} className="text-xs">
                                          {account.account_code} - {account.account_name}
                                        </SelectItem>
                                      ))}
                                    </SelectGroup>
                                  )}
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
                      <div className="col-span-1">
                        <FormField
                          control={form.control}
                          name={`line_items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1"
                                  className="text-center text-xs"
                                  {...field} 
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
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  min="0"
                                  className="text-right text-xs"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
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
