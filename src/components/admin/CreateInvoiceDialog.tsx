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
import { useCreateInvoice } from '@/hooks/useInvoices';
import { useCustomers, useShipments } from '@/hooks/useShipments';
import { useExchangeRates, convertToTZS } from '@/hooks/useExchangeRates';
import { useChartOfAccounts } from '@/hooks/useAccounting';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';

const lineItemSchema = z.object({
  account_id: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  unit_price: z.coerce.number().min(0, 'Price must be 0 or more'),
});

const invoiceSchema = z.object({
  customer_id: z.string().min(1, 'Customer is required'),
  shipment_id: z.string().optional(),
  currency: z.string().default('USD'),
  payment_terms: z.string().default('net_30'),
  discount: z.string().optional(),
  tax_rate: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().optional(),
  line_items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

const PAYMENT_TERMS = [
  { value: 'due_receipt', label: 'Due on Receipt' },
  { value: 'net_7', label: 'Net 7 Days' },
  { value: 'net_15', label: 'Net 15 Days' },
  { value: 'net_30', label: 'Net 30 Days' },
  { value: 'net_60', label: 'Net 60 Days' },
];

interface CreateInvoiceDialogProps {
  trigger?: React.ReactNode;
}

export function CreateInvoiceDialog({ trigger }: CreateInvoiceDialogProps) {
  const [open, setOpen] = useState(false);
  const createInvoice = useCreateInvoice();
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

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customer_id: '',
      shipment_id: '',
      currency: 'USD',
      payment_terms: 'net_30',
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
        currency: 'USD',
        payment_terms: 'net_30',
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

  const watchLineItems = useWatch({ control: form.control, name: 'line_items' });
  const watchDiscount = useWatch({ control: form.control, name: 'discount' });
  const watchTaxRate = useWatch({ control: form.control, name: 'tax_rate' });
  const watchCurrency = useWatch({ control: form.control, name: 'currency' });
  const watchCustomerId = useWatch({ control: form.control, name: 'customer_id' });

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

  const getDueDays = (terms: string) => {
    switch (terms) {
      case 'due_receipt': return 0;
      case 'net_7': return 7;
      case 'net_15': return 15;
      case 'net_30': return 30;
      case 'net_60': return 60;
      default: return 30;
    }
  };

  const onSubmit = async (data: InvoiceFormData) => {
    const { data: invoiceNumber } = await supabase.rpc('generate_document_number', { prefix: 'INV' });

    const tzs = exchangeRates ? convertToTZS(calculations.total, data.currency, exchangeRates) : null;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + getDueDays(data.payment_terms));

    await createInvoice.mutateAsync({
      invoice_number: invoiceNumber || `INV-${Date.now()}`,
      customer_id: data.customer_id,
      shipment_id: data.shipment_id || null,
      amount: calculations.total,
      currency: data.currency,
      amount_in_tzs: tzs,
      due_date: dueDate.toISOString().split('T')[0],
      notes: data.notes || null,
      status: 'pending',
    });

    form.reset();
    setOpen(false);
  };

  const handleAddLineItem = () => {
    append({ account_id: '', description: '', quantity: 1, unit_price: 0 });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Invoice
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[calc(100vw-var(--sidebar-width,256px)-2rem)] sm:max-h-[calc(100vh-2rem)] h-[calc(100vh-2rem)] overflow-y-auto fixed right-4 left-auto top-4 translate-x-0 translate-y-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary">
            Generate Invoice
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
                  <p className="text-xs text-muted-foreground mb-2">Invoice Date</p>
                  <p className="font-medium">{format(new Date(), 'MMMM dd, yyyy')}</p>
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

              {/* Optional Shipment Link */}
              <div className="mt-4">
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
              </div>
            </div>

            {/* Line Items Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Invoice Line Items</h3>
              
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

            {/* Discount, Payment Terms & Summary */}
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column - Discount & Payment Terms */}
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
                  name="payment_terms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Terms</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PAYMENT_TERMS.map((term) => (
                            <SelectItem key={term.value} value={term.value}>
                              {term.label}
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
                  <span>Total Amount Due</span>
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
                disabled={createInvoice.isPending || calculations.total <= 0}
                className="px-6"
              >
                {createInvoice.isPending ? 'Saving...' : 'Save'}
              </Button>
              <Button 
                type="submit" 
                disabled={createInvoice.isPending || calculations.total <= 0}
                className="px-6 bg-primary hover:bg-primary/90"
              >
                {createInvoice.isPending ? 'Saving...' : 'Save & Send'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
