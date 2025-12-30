import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays } from "date-fns";

interface SidebarCounts {
  shipments: number;
  customers: number;
  invoices: number;
  orders: number;
  expenses: number;
  settlements: number;
  approvals: number;
}

export function useSidebarCounts() {
  return useQuery({
    queryKey: ["sidebar-counts"],
    queryFn: async (): Promise<SidebarCounts> => {
      // Get items created in the last 24 hours
      const since = subDays(new Date(), 1).toISOString();

      // Run all count queries in parallel
      const [
        shipmentsResult,
        customersResult,
        invoicesResult,
        ordersResult,
        expensesResult,
        settlementsResult,
        approvalsResult,
        pendingPaymentsResult,
      ] = await Promise.all([
        // New shipments (last 24 hours)
        supabase
          .from("shipments")
          .select("*", { count: "exact", head: true })
          .gte("created_at", since),
        
        // New customers (last 24 hours)
        supabase
          .from("customers")
          .select("*", { count: "exact", head: true })
          .gte("created_at", since),
        
        // Unpaid/pending invoices
        supabase
          .from("invoices")
          .select("*", { count: "exact", head: true })
          .in("status", ["pending", "unpaid"]),
        
        // Pending shop orders
        supabase
          .from("order_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        
        // Pending expenses awaiting approval
        supabase
          .from("expenses")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        
        // Pending settlements
        supabase
          .from("settlements")
          .select("*", { count: "exact", head: true })
          .in("status", ["pending", "draft"]),

        // Pending approval requests
        supabase
          .from("approval_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),

        // Pending payment verifications from agents
        supabase
          .from("payments")
          .select("*", { count: "exact", head: true })
          .eq("verification_status", "pending"),
      ]);

      // Combine approval requests and pending payment verifications
      const totalApprovals = (approvalsResult.count || 0) + (pendingPaymentsResult.count || 0);

      return {
        shipments: shipmentsResult.count || 0,
        customers: customersResult.count || 0,
        invoices: invoicesResult.count || 0,
        orders: ordersResult.count || 0,
        expenses: expensesResult.count || 0,
        settlements: settlementsResult.count || 0,
        approvals: totalApprovals,
      };
    },
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  });
}
