import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useProductsServices } from "@/hooks/useProductsServices";
import { createAgentBillingJournalEntry } from "@/lib/journalEntryUtils";

const lineItemSchema = z.object({
  product_service_id: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0),
  unit_price: z.number().min(0),
  unit_type: z.string().optional(),
});

const formSchema = z.object({
  currency: z.string().default("USD"),
  due_date: z.string().optional(),
  notes: z.string().optional(),
  line_items: z.array(lineItemSchema).min(1, "At least one line item is required"),
});

type FormData = z.infer<typeof formSchema>;

interface AgentCargoShipment {
  id: string;
  tracking_number: string;
  agent_cargo_weight_kg: number;
  origin_region: string;
  agent_id: string;
  agent_name: string | null;
  agent_code: string | null;
  company_name: string | null;
}

interface CreateAgentCargoInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipment: AgentCargoShipment;
}

export function CreateAgentCargoInvoiceDialog({
  open,
  onOpenChange,
  shipment,
}: CreateAgentCargoInvoiceDialogProps) {
  const queryClient = useQueryClient();
  const { data: exchangeRates } = useExchangeRates();
  const { data: productsServices } = useProductsServices();

  // Get clearing rate from region pricing
  const { data: regionPricing } = useQuery({
    queryKey: ["region-pricing", shipment.origin_region],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("region_pricing")
        .select("*")
        .eq("region", shipment.origin_region as "china" | "dubai" | "europe" | "india" | "uk" | "usa")
        .eq("cargo_type", "air")
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currency: "USD",
      due_date: "",
      notes: "",
      line_items: [],
    },
  });

  // Initialize line items with agent cargo weight
  useEffect(() => {
    if (shipment && regionPricing) {
      const agentRate = regionPricing.agent_rate_per_kg || 0;
      
      form.setValue("line_items", [
        {
          description: `Agent Cargo Clearing - ${shipment.tracking_number}`,
          quantity: shipment.agent_cargo_weight_kg,
          unit_price: agentRate,
          unit_type: "kg",
        },
      ]);
    }
  }, [shipment, regionPricing, form]);

  const watchLineItems = form.watch("line_items");
  const watchCurrency = form.watch("currency");

  // Calculate totals with cascading percentages
  const calculations = useMemo(() => {
    let runningTotal = 0;
    const lineItemAmounts: number[] = [];

    watchLineItems.forEach((item) => {
      if (item.unit_type === 'percent') {
        const percentageAmount = runningTotal * (item.unit_price / 100);
        lineItemAmounts.push(percentageAmount);
        runningTotal += percentageAmount;
      } else {
        const itemAmount = item.quantity * item.unit_price;
        lineItemAmounts.push(itemAmount);
        runningTotal += itemAmount;
      }
    });

    const subtotal = runningTotal;
    const total = subtotal;

    // Convert to TZS
    const rate = exchangeRates?.find((r) => r.currency_code === watchCurrency);
    const tzsTotal = rate ? total * rate.rate_to_tzs : null;

    return { subtotal, total, tzsTotal, lineItemAmounts };
  }, [watchLineItems, watchCurrency, exchangeRates]);

  const addLineItem = () => {
    const currentItems = form.getValues("line_items");
    form.setValue("line_items", [
      ...currentItems,
      { description: "", quantity: 1, unit_price: 0, unit_type: "unit" },
    ]);
  };

  const removeLineItem = (index: number) => {
    const currentItems = form.getValues("line_items");
    if (currentItems.length > 1) {
      form.setValue(
        "line_items",
        currentItems.filter((_, i) => i !== index)
      );
    }
  };

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Generate invoice number
      const { data: invoiceNumber, error: numError } = await supabase.rpc(
        "generate_invoice_number"
      );
      if (numError) throw numError;

      // Create invoice
      const { data: invoice, error: invError } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          invoice_type: "agent_cargo",
          invoice_direction: "to_agent",
          agent_id: shipment.agent_id,
          shipment_id: shipment.id,
          amount: calculations.total,
          currency: data.currency,
          amount_in_tzs: calculations.tzsTotal,
          due_date: data.due_date || null,
          notes: data.notes || null,
          status: "pending",
        })
        .select()
        .single();

      if (invError) throw invError;

      // Create invoice items
      const items = data.line_items.map((item) => ({
        invoice_id: invoice.id,
        item_type: item.unit_type === 'percent' ? 'fee_percentage' : 'clearing',
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        weight_kg: item.unit_type === 'kg' ? item.quantity : null,
        amount: calculations.lineItemAmounts[data.line_items.indexOf(item)],
        currency: data.currency,
      }));

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(items);

      if (itemsError) throw itemsError;

      // Create journal entry for billing the agent (to_agent invoice)
      try {
        await createAgentBillingJournalEntry({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoice_number,
          amount: calculations.total,
          currency: data.currency,
          exchangeRate: calculations.tzsTotal ? calculations.tzsTotal / calculations.total : 1,
          agentName: shipment.company_name || shipment.agent_name || undefined,
        });
      } catch (journalError) {
        console.error("Failed to create journal entry:", journalError);
      }

      return invoice;
    },
    onSuccess: () => {
      toast.success("Invoice created successfully");
      queryClient.invalidateQueries({ queryKey: ["agent-cargo-shipments"] });
      queryClient.invalidateQueries({ queryKey: ["b2b-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["agent-balance"] });
      queryClient.invalidateQueries({ queryKey: ["all-agent-balances"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["trial-balance"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      console.error("Error creating invoice:", error);
      toast.error("Failed to create invoice");
    },
  });

  const onSubmit = (data: FormData) => {
    createInvoiceMutation.mutate(data);
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = productsServices?.find((p) => p.id === productId);
    if (product) {
      const currentItems = form.getValues("line_items");
      currentItems[index] = {
        ...currentItems[index],
        product_service_id: productId,
        description: product.name,
        unit_price: product.unit_price,
        unit_type: product.unit || "unit",
      };
      form.setValue("line_items", currentItems);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Agent Cargo Invoice</DialogTitle>
          <DialogDescription>
            Create an invoice to bill the agent for clearing their cargo.
          </DialogDescription>
        </DialogHeader>

        {/* Shipment Info */}
        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Agent</div>
              <div className="font-medium">
                {shipment.company_name || shipment.agent_name}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Tracking #</div>
              <div className="font-mono">{shipment.tracking_number}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Region</div>
              <div className="uppercase">{shipment.origin_region}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Agent Cargo</div>
              <div className="font-medium">{shipment.agent_cargo_weight_kg} kg</div>
            </div>
          </div>
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="TZS">TZS</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
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

            {/* Line Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel>Line Items</FormLabel>
                <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {watchLineItems.map((item, index) => {
                  const isPercentage = item.unit_type === 'percent';
                  const lineTotal = calculations.lineItemAmounts[index] || 0;

                  return (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        <Select
                          value={item.product_service_id || "custom"}
                          onValueChange={(value) => {
                            if (value !== "custom") {
                              handleProductSelect(index, value);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select service..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="custom">Custom Item</SelectItem>
                            {productsServices?.filter(p => p.is_active).map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-3">
                        <Input
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => {
                            const items = [...watchLineItems];
                            items[index].description = e.target.value;
                            form.setValue("line_items", items);
                          }}
                        />
                      </div>

                      {!isPercentage && (
                        <div className="col-span-2">
                          <Input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => {
                              const items = [...watchLineItems];
                              items[index].quantity = parseFloat(e.target.value) || 0;
                              form.setValue("line_items", items);
                            }}
                          />
                        </div>
                      )}

                      <div className={isPercentage ? "col-span-2" : "col-span-2"}>
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder="Price"
                            value={item.unit_price}
                            onChange={(e) => {
                              const items = [...watchLineItems];
                              items[index].unit_price = parseFloat(e.target.value) || 0;
                              form.setValue("line_items", items);
                            }}
                          />
                          {isPercentage && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              %
                            </span>
                          )}
                        </div>
                      </div>

                      <div className={`${isPercentage ? 'col-span-2' : 'col-span-1'} text-right font-medium`}>
                        {watchCurrency} {lineTotal.toFixed(2)}
                      </div>

                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(index)}
                          disabled={watchLineItems.length <= 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Totals */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>
                  {watchCurrency} {calculations.total.toFixed(2)}
                </span>
              </div>
              {calculations.tzsTotal && watchCurrency !== "TZS" && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Total in TZS</span>
                  <span>TZS {calculations.tzsTotal.toLocaleString()}</span>
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createInvoiceMutation.isPending}>
                {createInvoiceMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Create Invoice
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
