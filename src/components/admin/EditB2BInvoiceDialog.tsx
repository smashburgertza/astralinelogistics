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
import { useUpdateInvoice } from '@/hooks/useInvoices';
import { useInvoiceItems, useCreateInvoiceItem, useUpdateInvoiceItem, useDeleteInvoiceItem } from '@/hooks/useInvoiceItems';
import { useExchangeRates, convertToTZS } from '@/hooks/useExchangeRates';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { toast } from 'sonner';

const lineItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().min(0, 'Quantity must be 0 or more'),
  unit_price: z.coerce.number().min(0, 'Price must be 0 or more'),
  item_type: z.string().default('other'),
});

const invoiceSchema = z.object({
  currency: z.string().default('USD'),
  due_date: z.string().optional(),
  notes: z.string().optional(),
  line_items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface B2BInvoice {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: string;
  invoice_direction: 'from_agent' | 'to_agent';
  due_date: string | null;
  notes?: string | null;
  agent_name?: string | null;
}

interface EditB2BInvoiceDialogProps {
  invoice: B2BInvoice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditB2BInvoiceDialog({ invoice, open, onOpenChange }: EditB2BInvoiceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateInvoice = useUpdateInvoice();
  const { data: invoiceItems } = useInvoiceItems(invoice.id);
  const createInvoiceItem = useCreateInvoiceItem();
  const updateInvoiceItem = useUpdateInvoiceItem();
  const deleteInvoiceItem = useDeleteInvoiceItem();
  const { data: exchangeRates } = useExchangeRates();

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      currency: invoice.currency || 'USD',
      due_date: invoice.due_date || '',
      notes: invoice.notes || '',
      line_items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'line_items',
  });

  // Load invoice items when available
  useEffect(() => {
    if (invoiceItems && invoiceItems.length > 0) {
      form.setValue('line_items', invoiceItems.map(item => ({
        id: item.id,
        description: item.description || '',
        quantity: item.quantity,
        unit_price: item.unit_price,
        item_type: item.item_type,
      })));
    } else if (open && (!invoiceItems || invoiceItems.length === 0)) {
      // If no items, add a default based on invoice amount
      form.setValue('line_items', [{
        description: 'Shipping charges',
        quantity: 1,
        unit_price: invoice.amount,
        item_type: 'shipping',
      }]);
    }
  }, [invoiceItems, open, form, invoice.amount]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        currency: invoice.currency || 'USD',
        due_date: invoice.due_date || '',
        notes: invoice.notes || '',
        line_items: invoiceItems?.map(item => ({
          id: item.id,
          description: item.description || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          item_type: item.item_type,
        })) || [{
          description: 'Shipping charges',
          quantity: 1,
          unit_price: invoice.amount,
          item_type: 'shipping',
        }],
      });
    }
  }, [open, invoice, invoiceItems, form]);

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
            unit_type: 'fixed',
            product_service_id: null,
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit {invoice.invoice_direction === 'from_agent' ? 'Agent Invoice' : 'Invoice to Agent'} - {invoice.invoice_number}
          </DialogTitle>
        </DialogHeader>

        <div className="text-sm text-muted-foreground mb-4">
          Agent: {invoice.agent_name || 'Unknown'}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
            </div>

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
      </DialogContent>
    </Dialog>
  );
}
