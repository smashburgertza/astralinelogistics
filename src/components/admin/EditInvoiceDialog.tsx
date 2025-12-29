import { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2 } from 'lucide-react';
import { Invoice, useUpdateInvoice } from '@/hooks/useInvoices';
import { useInvoiceItems, useCreateInvoiceItem, useUpdateInvoiceItem, useDeleteInvoiceItem } from '@/hooks/useInvoiceItems';
import { useCustomers } from '@/hooks/useShipments';
import { useExchangeRates, convertToTZS } from '@/hooks/useExchangeRates';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const lineItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().min(0, 'Quantity must be 0 or more'),
  unit_price: z.coerce.number().min(0, 'Price must be 0 or more'),
  item_type: z.string().default('other'),
});

const invoiceSchema = z.object({
  customer_id: z.string().min(1, 'Customer is required'),
  currency: z.string().default('USD'),
  due_date: z.string().optional(),
  notes: z.string().optional(),
  line_items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

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
  const { data: exchangeRates } = useExchangeRates();

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customer_id: '',
      currency: 'USD',
      due_date: '',
      notes: '',
      line_items: [{ description: '', quantity: 1, unit_price: 0, item_type: 'other' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'line_items',
  });

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
        // Use existing invoice items
        lineItems = invoiceItems.map(item => ({
          id: item.id,
          description: item.description || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          item_type: item.item_type,
        }));
      } else if (invoice.amount && invoice.amount > 0) {
        // No items exist but invoice has an amount - create a default item from invoice data
        lineItems = [{
          description: invoice.shipment_id ? 'Shipping charges' : 'Invoice amount',
          quantity: 1,
          unit_price: invoice.amount,
          item_type: 'freight' as const,
        }];
      } else {
        // No items and no amount - start with empty item
        lineItems = [{ description: '', quantity: 1, unit_price: 0, item_type: 'other' }];
      }

      form.reset({
        customer_id: invoice.customer_id || '',
        currency: invoice.currency || 'USD',
        due_date: invoice.due_date || '',
        notes: invoice.notes || '',
        line_items: lineItems,
      });
      setHasInitialized(true);
    }
  }, [open, hasInitialized, isLoadingItems, invoice, invoiceItems, form]);

  const watchedItems = form.watch('line_items');
  const watchedCurrency = form.watch('currency');

  const calculations = useMemo(() => {
    const subtotal = watchedItems.reduce((sum, item) => {
      return sum + (Number(item.quantity) * Number(item.unit_price));
    }, 0);
    return { subtotal, total: subtotal };
  }, [watchedItems]);

  const currencySymbol = CURRENCY_SYMBOLS[watchedCurrency] || watchedCurrency;

  const onSubmit = async (data: InvoiceFormData) => {
    setIsSubmitting(true);
    try {
      // Calculate TZS amount
      let tzs = calculations.total;
      if (data.currency !== 'TZS' && exchangeRates) {
        tzs = convertToTZS(calculations.total, data.currency, exchangeRates);
      }

      // Update invoice
      await updateInvoice.mutateAsync({
        id: invoice.id,
        customer_id: data.customer_id,
        amount: calculations.total,
        currency: data.currency,
        amount_in_tzs: tzs,
        due_date: data.due_date || null,
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

      // Update or create items
      for (const item of data.line_items) {
        const amount = Number(item.quantity) * Number(item.unit_price);
        if (item.id && existingIds.includes(item.id)) {
          // Update existing
          await updateInvoiceItem.mutateAsync({
            id: item.id,
            description: item.description,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            amount,
            item_type: (item.item_type || 'other') as 'freight' | 'customs' | 'handling' | 'insurance' | 'duty' | 'transit' | 'other',
          });
        } else {
          // Create new
          await createInvoiceItem.mutateAsync({
            invoice_id: invoice.id,
            description: item.description,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            amount,
            item_type: (item.item_type || 'other') as 'freight' | 'customs' | 'handling' | 'insurance' | 'duty' | 'transit' | 'other',
            currency: data.currency,
            weight_kg: null,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Invoice {invoice.invoice_number}</DialogTitle>
        </DialogHeader>

        {isLoadingItems ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
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
              </div>

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Line Items</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ description: '', quantity: 1, unit_price: 0, item_type: 'other' })}
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
        )}
      </DialogContent>
    </Dialog>
  );
}
