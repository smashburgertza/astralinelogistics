import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Plus, ArrowRight, Truck, Package, FileText } from 'lucide-react';
import { useCreateInvoice } from '@/hooks/useInvoices';
import { useCustomers, useShipments } from '@/hooks/useShipments';
import { useRegionPricing } from '@/hooks/useRegionPricing';
import { useExchangeRates, convertToTZS } from '@/hooks/useExchangeRates';
import { useActiveRegions } from '@/hooks/useRegions';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';

const invoiceSchema = z.object({
  invoice_type: z.enum(['shipping', 'purchase_shipping']).default('shipping'),
  customer_id: z.string().min(1, 'Customer is required'),
  shipment_id: z.string().optional(),
  origin_region: z.string().min(1, 'Origin region is required'),
  weight_kg: z.coerce.number().min(0.1, 'Weight must be greater than 0'),
  rate_per_kg: z.coerce.number().min(0, 'Rate is required'),
  handling_fee: z.coerce.number().min(0).default(0),
  currency: z.string().default('USD'),
  due_days: z.coerce.number().min(1).default(30),
  notes: z.string().optional(),
  product_cost: z.coerce.number().min(0).default(0),
  purchase_fee: z.coerce.number().min(0).default(0),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface CreateInvoiceDialogProps {
  trigger?: React.ReactNode;
}

export function CreateInvoiceDialog({ trigger }: CreateInvoiceDialogProps) {
  const [open, setOpen] = useState(false);
  const createInvoice = useCreateInvoice();
  const { data: customers } = useCustomers();
  const { data: shipments } = useShipments();
  const { data: pricing } = useRegionPricing();
  const { data: exchangeRates } = useExchangeRates();
  const { data: regions } = useActiveRegions();

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoice_type: 'shipping',
      customer_id: '',
      shipment_id: '',
      origin_region: '',
      weight_kg: 0,
      rate_per_kg: 0,
      handling_fee: 0,
      currency: 'USD',
      due_days: 30,
      notes: '',
      product_cost: 0,
      purchase_fee: 0,
    },
  });

  const invoiceType = form.watch('invoice_type');
  const selectedRegion = form.watch('origin_region');
  const selectedShipment = form.watch('shipment_id');
  const weightKg = form.watch('weight_kg');
  const ratePerKg = form.watch('rate_per_kg');
  const handlingFee = form.watch('handling_fee');
  const productCost = form.watch('product_cost');
  const purchaseFee = form.watch('purchase_fee');
  const currency = form.watch('currency');

  // Auto-fill rate when region changes
  useEffect(() => {
    if (selectedRegion && pricing) {
      const regionPricing = pricing.find(p => p.region === selectedRegion);
      if (regionPricing) {
        form.setValue('rate_per_kg', regionPricing.customer_rate_per_kg);
        form.setValue('handling_fee', regionPricing.handling_fee || 0);
      }
    }
  }, [selectedRegion, pricing, form]);

  // Auto-fill from shipment when selected
  useEffect(() => {
    if (selectedShipment && shipments) {
      const shipment = shipments.find(s => s.id === selectedShipment);
      if (shipment) {
        form.setValue('weight_kg', shipment.total_weight_kg);
        form.setValue('origin_region', shipment.origin_region);
        if (shipment.customer_id) {
          form.setValue('customer_id', shipment.customer_id);
        }
      }
    }
  }, [selectedShipment, shipments, form]);

  // Calculate totals
  const shippingSubtotal = weightKg * ratePerKg;
  const totalProductCost = invoiceType === 'purchase_shipping' ? productCost : 0;
  const totalPurchaseFee = invoiceType === 'purchase_shipping' ? purchaseFee : 0;
  const totalAmount = shippingSubtotal + handlingFee + totalProductCost + totalPurchaseFee;
  
  const amountInTZS = exchangeRates && totalAmount && currency
    ? convertToTZS(totalAmount, currency, exchangeRates)
    : 0;

  const currencySymbol = CURRENCY_SYMBOLS[currency] || '$';

  const onSubmit = async (data: InvoiceFormData) => {
    // Generate invoice number
    const { data: invoiceNumber } = await supabase.rpc('generate_document_number', { prefix: 'INV' });

    // Calculate totals
    const shipping = data.weight_kg * data.rate_per_kg;
    const productTotal = data.invoice_type === 'purchase_shipping' ? data.product_cost : 0;
    const purchaseTotal = data.invoice_type === 'purchase_shipping' ? data.purchase_fee : 0;
    const total = shipping + data.handling_fee + productTotal + purchaseTotal;
    
    // Calculate TZS amount
    const tzs = exchangeRates ? convertToTZS(total, data.currency, exchangeRates) : null;

    // Calculate due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + data.due_days);

    await createInvoice.mutateAsync({
      invoice_number: invoiceNumber || `INV-${Date.now()}`,
      invoice_type: data.invoice_type,
      customer_id: data.customer_id,
      shipment_id: data.shipment_id || null,
      amount: total,
      rate_per_kg: data.rate_per_kg,
      currency: data.currency,
      amount_in_tzs: tzs,
      due_date: dueDate.toISOString().split('T')[0],
      notes: data.notes || null,
      product_cost: productTotal,
      purchase_fee: purchaseTotal,
      status: 'pending',
    });

    form.reset();
    setOpen(false);
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create Invoice
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Invoice Type Selector */}
            <FormField
              control={form.control}
              name="invoice_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice Type</FormLabel>
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className={`cursor-pointer rounded-lg border-2 p-3 transition-all ${
                        field.value === 'shipping'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/50'
                      }`}
                      onClick={() => field.onChange('shipping')}
                    >
                      <div className="flex items-center gap-2">
                        <Truck className="h-5 w-5 text-primary" />
                        <span className="font-medium">Shipping Only</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Freight and handling charges
                      </p>
                    </div>
                    <div
                      className={`cursor-pointer rounded-lg border-2 p-3 transition-all ${
                        field.value === 'purchase_shipping'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/50'
                      }`}
                      onClick={() => field.onChange('purchase_shipping')}
                    >
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-amber-500" />
                        <span className="font-medium">Purchase + Shipping</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Product cost plus freight
                      </p>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="shipment_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From Shipment (optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select shipment to auto-fill" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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
                          {customer.name} {customer.company_name && `(${customer.company_name})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
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
                        {(regions || []).map((region) => (
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

              <FormField
                control={form.control}
                name="weight_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (kg)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="rate_per_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rate/kg</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="handling_fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Handling Fee</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="AED">AED</SelectItem>
                        <SelectItem value="TZS">TZS</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Purchase Cost Fields - Only for purchase_shipping */}
            {invoiceType === 'purchase_shipping' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <FormField
                  control={form.control}
                  name="product_cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Cost</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="purchase_fee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Fee</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="due_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Due (days)</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <Separator />

            {/* Totals Summary */}
            <Card className="p-4 bg-muted/50">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping ({weightKg} kg × {currencySymbol}{ratePerKg})</span>
                  <span>{currencySymbol}{shippingSubtotal.toFixed(2)}</span>
                </div>
                {handlingFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Handling Fee</span>
                    <span>{currencySymbol}{handlingFee.toFixed(2)}</span>
                  </div>
                )}
                {invoiceType === 'purchase_shipping' && productCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Product Cost</span>
                    <span>{currencySymbol}{productCost.toFixed(2)}</span>
                  </div>
                )}
                {invoiceType === 'purchase_shipping' && purchaseFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Purchase Fee</span>
                    <span>{currencySymbol}{purchaseFee.toFixed(2)}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{currencySymbol}{totalAmount.toFixed(2)}</span>
                </div>
                {currency !== 'TZS' && totalAmount > 0 && (
                  <div className="flex items-center justify-end gap-2 text-muted-foreground">
                    <ArrowRight className="h-4 w-4" />
                    <span>TZS {amountInTZS.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                )}
              </div>
            </Card>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createInvoice.isPending || totalAmount <= 0}>
                {createInvoice.isPending ? 'Creating...' : 'Create Invoice'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
