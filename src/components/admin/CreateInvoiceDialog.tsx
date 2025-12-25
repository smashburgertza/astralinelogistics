import { useState, useEffect } from 'react';
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
import { Plus, ArrowRight } from 'lucide-react';
import { useCreateInvoice } from '@/hooks/useInvoices';
import { useCustomers, useShipments } from '@/hooks/useShipments';
import { useExchangeRates, convertToTZS } from '@/hooks/useExchangeRates';
import { supabase } from '@/integrations/supabase/client';

const invoiceSchema = z.object({
  customer_id: z.string().min(1, 'Customer is required'),
  shipment_id: z.string().optional(),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  currency: z.string().default('USD'),
  due_date: z.string().optional(),
  notes: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

export function CreateInvoiceDialog() {
  const [open, setOpen] = useState(false);
  const createInvoice = useCreateInvoice();
  const { data: customers } = useCustomers();
  const { data: shipments } = useShipments();
  const { data: exchangeRates } = useExchangeRates();

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      currency: 'USD',
      amount: 0,
    },
  });

  const watchAmount = form.watch('amount');
  const watchCurrency = form.watch('currency');

  // Calculate TZS equivalent
  const amountInTZS = exchangeRates && watchAmount && watchCurrency
    ? convertToTZS(watchAmount, watchCurrency, exchangeRates)
    : 0;

  const onSubmit = async (data: InvoiceFormData) => {
    // Generate invoice number
    const { data: invoiceNumber } = await supabase.rpc('generate_document_number', { prefix: 'INV' });

    // Calculate TZS amount
    const tzs = exchangeRates ? convertToTZS(data.amount, data.currency, exchangeRates) : null;

    await createInvoice.mutateAsync({
      invoice_number: invoiceNumber || `INV-${Date.now()}`,
      customer_id: data.customer_id,
      shipment_id: data.shipment_id || null,
      amount: data.amount,
      currency: data.currency,
      amount_in_tzs: tzs,
      due_date: data.due_date || null,
      notes: data.notes || null,
      status: 'pending',
    });

    form.reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

            <FormField
              control={form.control}
              name="shipment_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shipment (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Link to shipment" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {shipments?.map((shipment) => (
                        <SelectItem key={shipment.id} value={shipment.id}>
                          {shipment.tracking_number}
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
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
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
                        {exchangeRates?.map((rate) => (
                          <SelectItem key={rate.currency_code} value={rate.currency_code}>
                            {rate.currency_code} - {rate.currency_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* TZS Equivalent Display */}
            {watchCurrency !== 'TZS' && watchAmount > 0 && (
              <Card className="p-4 bg-primary/5 border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Invoice Amount</p>
                    <p className="text-lg font-semibold">{watchCurrency} {watchAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Equivalent in TZS</p>
                    <p className="text-lg font-bold text-primary">TZS {amountInTZS.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Rate: 1 {watchCurrency} = {exchangeRates?.find(r => r.currency_code === watchCurrency)?.rate_to_tzs.toLocaleString() || '?'} TZS
                </p>
              </Card>
            )}

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

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createInvoice.isPending}>
                {createInvoice.isPending ? 'Creating...' : 'Create Invoice'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
