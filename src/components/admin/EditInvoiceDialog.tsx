import { useState, useMemo, useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Package } from 'lucide-react';
import { Invoice, useUpdateInvoice } from '@/hooks/useInvoices';
import { useInvoiceItems, useCreateInvoiceItem, useUpdateInvoiceItem, useDeleteInvoiceItem } from '@/hooks/useInvoiceItems';
import { useCustomers, useShipments } from '@/hooks/useShipments';
import { useExchangeRates, convertToTZS } from '@/hooks/useExchangeRates';
import { useProductsServices, SERVICE_TYPES } from '@/hooks/useProductsServices';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { toast } from 'sonner';

const lineItemSchema = z.object({
  id: z.string().optional(),
  product_service_id: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  tracking_number: z.string().optional(),
  quantity: z.coerce.number().min(0, 'Quantity must be 0 or more'),
  unit_price: z.coerce.number().min(0, 'Price must be 0 or more'),
  item_type: z.string().default('other'),
  unit_type: z.string().optional(),
  shipment_id: z.string().optional(),
});

const invoiceSchema = z.object({
  customer_id: z.string().min(1, 'Customer is required'),
  currency: z.string().default('USD'),
  shipment_ids: z.array(z.string()).optional(),
  discount: z.string().optional(),
  payment_terms: z.string().default('net_30'),
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

interface EditInvoiceDialogProps {
  invoice: Invoice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditInvoiceDialog({ invoice, open, onOpenChange }: EditInvoiceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const updateInvoice = useUpdateInvoice();
  const { data: invoiceItems, isLoading: isLoadingItems } = useInvoiceItems(open ? invoice.id : '');
  const createInvoiceItem = useCreateInvoiceItem();
  const updateInvoiceItem = useUpdateInvoiceItem();
  const deleteInvoiceItem = useDeleteInvoiceItem();
  const { data: customers } = useCustomers();
  const { data: allShipments } = useShipments();
  const { data: exchangeRates } = useExchangeRates();
  const { data: productsServices } = useProductsServices({ active: true });

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

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customer_id: '',
      currency: 'USD',
      shipment_ids: [],
      discount: '',
      payment_terms: 'net_30',
      tax_rate: 0,
      notes: '',
      line_items: [{ description: '', quantity: 1, unit_price: 0, item_type: 'other', unit_type: 'fixed' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'line_items',
  });

  const watchLineItems = useWatch({ control: form.control, name: 'line_items' });
  const watchDiscount = useWatch({ control: form.control, name: 'discount' });
  const watchTaxRate = useWatch({ control: form.control, name: 'tax_rate' });
  const watchCurrency = useWatch({ control: form.control, name: 'currency' });
  const watchCustomerId = useWatch({ control: form.control, name: 'customer_id' });

  // Filter shipments by selected customer (for linking additional shipments)
  const customerShipments = useMemo(() => {
    if (!allShipments || !watchCustomerId) return [];
    return allShipments.filter(s => s.customer_id === watchCustomerId);
  }, [allShipments, watchCustomerId]);

  // Reset initialization flag when dialog closes
  useEffect(() => {
    if (!open) {
      setHasInitialized(false);
    }
  }, [open]);

  // Initialize form when dialog opens AND data is loaded
  useEffect(() => {
    if (open && !hasInitialized && !isLoadingItems) {
      let lineItems;
      
      if (invoiceItems && invoiceItems.length > 0) {
        // Use existing invoice items - preserve the product_service_id
        lineItems = invoiceItems.map(item => ({
          id: item.id,
          product_service_id: item.product_service_id || '',
          description: item.description || '',
          tracking_number: '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          item_type: item.item_type,
          unit_type: item.unit_type || 'fixed',
          shipment_id: '',
        }));
      } else if (invoice.amount && invoice.amount > 0) {
        lineItems = [{
          product_service_id: '',
          description: invoice.shipment_id ? 'Shipping charges' : 'Invoice amount',
          tracking_number: '',
          quantity: 1,
          unit_price: invoice.amount,
          item_type: 'freight' as const,
          unit_type: 'fixed',
          shipment_id: '',
        }];
      } else {
        lineItems = [{ product_service_id: '', description: '', tracking_number: '', quantity: 1, unit_price: 0, item_type: 'other', unit_type: 'fixed', shipment_id: '' }];
      }

      // Get linked shipment IDs
      const linkedShipmentIds: string[] = [];
      if (invoice.shipment_id) {
        linkedShipmentIds.push(invoice.shipment_id);
      }

      form.reset({
        customer_id: invoice.customer_id || '',
        currency: invoice.currency || 'USD',
        shipment_ids: linkedShipmentIds,
        discount: '',
        payment_terms: 'net_30',
        tax_rate: 0,
        notes: invoice.notes || '',
        line_items: lineItems,
      });
      setHasInitialized(true);
    }
  }, [open, hasInitialized, isLoadingItems, invoice, invoiceItems, form]);

  // Calculate totals with cascading percentages
  const calculations = useMemo(() => {
    let runningTotal = 0;
    const lineItemAmounts: number[] = [];

    watchLineItems.forEach((item) => {
      if (item.unit_type === 'percent') {
        const percentageAmount = runningTotal * (Number(item.unit_price) / 100);
        lineItemAmounts.push(percentageAmount);
        runningTotal += percentageAmount;
      } else {
        const itemAmount = Number(item.quantity) * Number(item.unit_price);
        lineItemAmounts.push(itemAmount);
        runningTotal += itemAmount;
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

    return { subtotal, discountAmount, taxAmount, total, tzsSubtotal, tzsDiscount, tzsTax, tzsTotal, lineItemAmounts };
  }, [watchLineItems, watchDiscount, watchTaxRate, watchCurrency, exchangeRates]);

  const currencySymbol = CURRENCY_SYMBOLS[watchCurrency] || '$';

  const onSubmit = async (data: InvoiceFormData) => {
    setIsSubmitting(true);
    try {
      const tzs = exchangeRates ? convertToTZS(calculations.total, data.currency, exchangeRates) : null;

      await updateInvoice.mutateAsync({
        id: invoice.id,
        customer_id: data.customer_id,
        amount: calculations.total,
        currency: data.currency,
        amount_in_tzs: tzs,
        notes: data.notes || null,
      });

      // Handle line items
      const existingIds = invoiceItems?.map(i => i.id) || [];
      const formIds = data.line_items.map(i => i.id).filter(Boolean) as string[];

      // Delete removed items
      for (const existingId of existingIds) {
        if (!formIds.includes(existingId)) {
          await deleteInvoiceItem.mutateAsync({ id: existingId, invoiceId: invoice.id });
        }
      }

      // Update or create items with cascading calculations
      let runningTotal = 0;
      for (let i = 0; i < data.line_items.length; i++) {
        const item = data.line_items[i];
        let amount: number;
        
        if (item.unit_type === 'percent') {
          amount = runningTotal * (Number(item.unit_price) / 100);
        } else {
          amount = Number(item.quantity) * Number(item.unit_price);
        }
        runningTotal += amount;

        if (item.id && existingIds.includes(item.id)) {
          await updateInvoiceItem.mutateAsync({
            id: item.id,
            description: item.description,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            amount,
            item_type: (item.item_type || 'other') as 'freight' | 'customs' | 'handling' | 'insurance' | 'duty' | 'transit' | 'other',
          });
        } else {
          await createInvoiceItem.mutateAsync({
            invoice_id: invoice.id,
            description: item.description,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            amount,
            item_type: (item.item_type || 'other') as 'freight' | 'customs' | 'handling' | 'insurance' | 'duty' | 'transit' | 'other',
            currency: data.currency,
            weight_kg: null,
            unit_type: (item.unit_type || 'fixed') as 'fixed' | 'percent' | 'kg',
            product_service_id: item.product_service_id || null,
          });
        }
      }

      toast.success('Invoice updated successfully');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Failed to update invoice: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddLineItem = () => {
    append({ product_service_id: '', description: '', tracking_number: '', quantity: 1, unit_price: 0, item_type: 'other', unit_type: 'fixed', shipment_id: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[calc(100vw-var(--sidebar-width,256px)-2rem)] sm:max-h-[calc(100vh-2rem)] h-[calc(100vh-2rem)] overflow-y-auto fixed right-4 left-auto top-4 translate-x-0 translate-y-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary">
            Edit Invoice {invoice.invoice_number}
          </DialogTitle>
        </DialogHeader>

        {isLoadingItems ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
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
                    <p className="font-medium">{format(new Date(invoice.created_at), 'MMMM dd, yyyy')}</p>
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

                {/* Linked Shipments */}
                <div className="mt-4">
                  <FormField
                    control={form.control}
                    name="shipment_ids"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">
                          Linked Shipments
                        </FormLabel>
                        {customerShipments.length > 0 ? (
                          <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto bg-muted/30">
                            {customerShipments.map((shipment) => {
                              const isChecked = field.value?.includes(shipment.id) ?? false;
                              return (
                                <div key={shipment.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`shipment-${shipment.id}`}
                                    checked={isChecked}
                                    onCheckedChange={(checked) => {
                                      const currentValues = field.value || [];
                                      if (checked) {
                                        field.onChange([...currentValues, shipment.id]);
                                      } else {
                                        field.onChange(currentValues.filter((id: string) => id !== shipment.id));
                                      }
                                    }}
                                  />
                                  <label
                                    htmlFor={`shipment-${shipment.id}`}
                                    className="text-sm font-medium leading-none cursor-pointer"
                                  >
                                    {shipment.tracking_number} ({shipment.total_weight_kg} kg) - {shipment.origin_region}
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground py-2">No shipments found for this customer</p>
                        )}
                        {field.value && field.value.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {field.value.length} shipment(s) linked
                          </p>
                        )}
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
                  <div className="col-span-2">Product/Service</div>
                  <div className="col-span-2">Description</div>
                  <div className="col-span-2">Tracking #</div>
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
                    const lineTotal = calculations.lineItemAmounts[index] || 0;

                    return (
                      <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-2">
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
                                    <SelectItem value="none">
                                      <span className="flex items-center gap-2">
                                        <Package className="h-3 w-3" />
                                        Custom item
                                      </span>
                                    </SelectItem>
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
                        <div className="col-span-2">
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
                        <div className="col-span-2">
                          <FormField
                            control={form.control}
                            name={`line_items.${index}.tracking_number`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input 
                                    placeholder="Tracking #" 
                                    {...field} 
                                    value={field.value || ''}
                                    className="text-xs bg-muted/50"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
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
                                      min="0.01"
                                      className="text-center text-xs"
                                      value={field.value}
                                      onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                        <div className="col-span-2">
                          <FormField
                            control={form.control}
                            name={`line_items.${index}.unit_price`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <div className="relative">
                                    <Input 
                                      type="number" 
                                      step="0.01"
                                      min="0"
                                      max={isPercentage ? 100 : undefined}
                                      className={`text-right text-xs ${isPercentage ? 'pr-6' : ''}`}
                                      value={field.value}
                                      onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                    />
                                    {isPercentage && (
                                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                                    )}
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="col-span-2 text-right font-medium text-sm">
                          {currencySymbol}{lineTotal.toFixed(2)}
                          {isPercentage && (
                            <span className="block text-xs text-muted-foreground">({unitPrice}%)</span>
                          )}
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
                  onClick={() => onOpenChange(false)}
                  className="px-6"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || calculations.total <= 0}
                  className="px-6 bg-primary hover:bg-primary/90"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
