import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function useCustomerEstimates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: estimates = [], isLoading } = useQuery({
    queryKey: ["customer-estimates", user?.id],
    queryFn: async () => {
      // First get customer ID
      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!customer) return [];

      const { data, error } = await supabase
        .from("estimates")
        .select("*")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const respondToEstimate = useMutation({
    mutationFn: async ({
      estimateId,
      response,
      comments,
    }: {
      estimateId: string;
      response: "approved" | "denied";
      comments?: string;
    }) => {
      // Update estimate with customer response
      const { data: estimate, error: updateError } = await supabase
        .from("estimates")
        .update({
          customer_response: response,
          customer_comments: comments || null,
          responded_at: new Date().toISOString(),
        })
        .eq("id", estimateId)
        .select()
        .single();

      if (updateError) throw updateError;

      // If approved, auto-convert to invoice
      if (response === "approved" && estimate) {
        // Generate invoice number
        const { data: invoiceNumber } = await supabase.rpc(
          "generate_document_number",
          { prefix: "INV" }
        );

        // Create invoice from estimate
        const { data: invoice, error: invoiceError } = await supabase
          .from("invoices")
          .insert({
            invoice_number: invoiceNumber,
            customer_id: estimate.customer_id,
            shipment_id: estimate.shipment_id,
            estimate_id: estimate.id,
            amount: estimate.total,
            currency: estimate.currency,
            invoice_type: estimate.estimate_type,
            rate_per_kg: estimate.rate_per_kg,
            product_cost: estimate.product_cost,
            purchase_fee: estimate.purchase_fee,
            status: "pending",
            due_date: new Date(
              Date.now() + 14 * 24 * 60 * 60 * 1000
            ).toISOString(),
          })
          .select()
          .single();

        if (invoiceError) throw invoiceError;

        // Link invoice to estimate
        await supabase
          .from("estimates")
          .update({ converted_to_invoice_id: invoice.id, status: "closed" })
          .eq("id", estimateId);

        return { estimate, invoice };
      }

      return { estimate, invoice: null };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["customer-estimates"] });
      queryClient.invalidateQueries({ queryKey: ["customer-invoices"] });
      toast.success(
        variables.response === "approved"
          ? "Estimate approved! Invoice has been created."
          : "Estimate declined. We'll follow up with you."
      );
    },
    onError: (error) => {
      console.error("Error responding to estimate:", error);
      toast.error("Failed to submit response");
    },
  });

  return {
    estimates,
    isLoading,
    respondToEstimate,
  };
}
