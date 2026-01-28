import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { useAgents } from "@/hooks/useAgents";

const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  unit_price: z.number().min(0, "Unit price must be 0 or greater"),
});

const formSchema = z.object({
  agent_id: z.string().min(1, "Agent is required"),
  currency: z.string().default("USD"),
  due_date: z.string().optional(),
  notes: z.string().optional(),
  line_items: z.array(lineItemSchema).min(1, "At least one line item is required"),
});

type FormData = z.infer<typeof formSchema>;

interface CreateAgentInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAgentInvoiceDialog({
  open,
  onOpenChange,
}: CreateAgentInvoiceDialogProps) {
  const queryClient = useQueryClient();
  const { data: exchangeRates } = useExchangeRates();
  const { data: agents } = useAgents();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      agent_id: "",
      currency: "USD",
      due_date: "",
      notes: "",
      line_items: [{ description: "", quantity: 1, unit_price: 0 }],
    },
  });

  const watchLineItems = form.watch("line_items");
  const watchCurrency = form.watch("currency");
  const watchAgentId = form.watch("agent_id");

  // Get selected agent info
  const selectedAgent = agents?.find((a) => a.user_id === watchAgentId);

  // Calculate totals
  const calculations = useMemo(() => {
    const subtotal = watchLineItems.reduce((sum, item) => {
      return sum + (item.quantity || 0) * (item.unit_price || 0);
    }, 0);

    const total = subtotal;

    // Convert to TZS
    const rate = exchangeRates?.find((r) => r.currency_code === watchCurrency);
    const tzsTotal = rate ? total * rate.rate_to_tzs : null;

    return { subtotal, total, tzsTotal };
  }, [watchLineItems, watchCurrency, exchangeRates]);

  const addLineItem = () => {
    const currentItems = form.getValues("line_items");
    form.setValue("line_items", [
      ...currentItems,
      { description: "", quantity: 1, unit_price: 0 },
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

      // Create invoice with from_agent direction
      const { data: invoice, error: invError } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          invoice_type: "agent_service",
          invoice_direction: "from_agent", // Agent bills us
          agent_id: data.agent_id,
          shipment_id: null, // Not tied to a shipment
          customer_id: null,
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
        item_type: "service",
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.quantity * item.unit_price,
        currency: data.currency,
      }));

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(items);

      if (itemsError) throw itemsError;

      return invoice;
    },
    onSuccess: () => {
      toast.success("Agent invoice created successfully");
      queryClient.invalidateQueries({ queryKey: ["b2b-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["agent-balance"] });
      queryClient.invalidateQueries({ queryKey: ["all-agent-balances"] });
      onOpenChange(false);
      form.reset({
        agent_id: "",
        currency: "USD",
        due_date: "",
        notes: "",
        line_items: [{ description: "", quantity: 1, unit_price: 0 }],
      });
    },
    onError: (error) => {
      console.error("Error creating invoice:", error);
      toast.error("Failed to create invoice");
    },
  });

  const onSubmit = (data: FormData) => {
    createInvoiceMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Agent Invoice</DialogTitle>
          <DialogDescription>
            Create an invoice where an agent bills Astraline for services, commissions, or reimbursements.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Agent Selector */}
            <FormField
              control={form.control}
              name="agent_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Agent *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an agent..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {agents?.map((agent) => (
                        <SelectItem key={agent.user_id} value={agent.user_id}>
                          {agent.profile?.company_name || agent.profile?.full_name || "Unknown Agent"}
                          {agent.profile?.agent_code && (
                            <span className="text-muted-foreground ml-2">
                              ({agent.profile.agent_code})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Selected Agent Info */}
            {selectedAgent && (
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Company</div>
                    <div className="font-medium">
                      {selectedAgent.profile?.company_name || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Contact</div>
                    <div className="font-medium">
                      {selectedAgent.profile?.contact_person_name || selectedAgent.profile?.full_name || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Agent Code</div>
                    <div className="font-mono">
                      {selectedAgent.profile?.agent_code || "-"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Currency and Due Date */}
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
                        <SelectItem value="CNY">CNY</SelectItem>
                        <SelectItem value="AED">AED</SelectItem>
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
                  const lineTotal = (item.quantity || 0) * (item.unit_price || 0);

                  return (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <Input
                          placeholder="Description (e.g., Commission - January 2025)"
                          value={item.description}
                          onChange={(e) => {
                            const items = [...watchLineItems];
                            items[index].description = e.target.value;
                            form.setValue("line_items", items);
                          }}
                        />
                      </div>

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

                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Unit Price"
                          value={item.unit_price}
                          onChange={(e) => {
                            const items = [...watchLineItems];
                            items[index].unit_price = parseFloat(e.target.value) || 0;
                            form.setValue("line_items", items);
                          }}
                        />
                      </div>

                      <div className="col-span-2 text-right font-medium py-2">
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
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>
                  {watchCurrency} {calculations.subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>
                  {watchCurrency} {calculations.total.toFixed(2)}
                </span>
              </div>
              {calculations.tzsTotal && watchCurrency !== "TZS" && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>≈ TZS equivalent</span>
                  <span>TZS {calculations.tzsTotal.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes (optional)..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createInvoiceMutation.isPending}
              >
                {createInvoiceMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Invoice"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
