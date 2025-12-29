import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowDownLeft,
  ArrowUpRight,
  MoreHorizontal,
  CheckCircle,
  FileText,
  Plus,
  Package,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { CreateAgentCargoInvoiceDialog } from "./CreateAgentCargoInvoiceDialog";
import { InvoiceDetailDialog } from "./InvoiceDetailDialog";

interface B2BInvoice {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: string;
  invoice_direction: "from_agent" | "to_agent";
  created_at: string;
  due_date: string | null;
  paid_at: string | null;
  agent_id: string;
  agent_name: string | null;
  agent_code: string | null;
  company_name: string | null;
  shipment_tracking: string | null;
  shipment_weight: number | null;
}

interface AgentCargoShipment {
  id: string;
  tracking_number: string;
  agent_cargo_weight_kg: number;
  origin_region: string;
  created_at: string;
  agent_id: string;
  agent_name: string | null;
  agent_code: string | null;
  company_name: string | null;
  batch_number: string | null;
  invoiced: boolean;
  invoice_id: string | null;
  invoice_number: string | null;
  invoice_status: string | null;
}

const regionFlags: Record<string, string> = {
  uk: "🇬🇧",
  uae: "🇦🇪",
  china: "🇨🇳",
  turkey: "🇹🇷",
  usa: "🇺🇸",
};

export function B2BInvoices() {
  const [activeTab, setActiveTab] = useState<"from_agents" | "to_agents">("from_agents");
  const [selectedShipment, setSelectedShipment] = useState<AgentCargoShipment | null>(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<B2BInvoice | null>(null);
  const [invoiceDetailOpen, setInvoiceDetailOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["b2b-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          amount,
          currency,
          status,
          invoice_direction,
          created_at,
          due_date,
          paid_at,
          agent_id,
          shipment_id
        `)
        .not("agent_id", "is", null)
        .in("invoice_direction", ["from_agent", "to_agent"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get agent profiles and shipment info
      const agentIds = [...new Set(data?.map((i) => i.agent_id).filter(Boolean))];
      const shipmentIds = [...new Set(data?.map((i) => i.shipment_id).filter(Boolean))];

      const [profilesRes, shipmentsRes] = await Promise.all([
        agentIds.length > 0
          ? supabase.from("profiles").select("id, full_name, agent_code, company_name").in("id", agentIds)
          : { data: [] },
        shipmentIds.length > 0
          ? supabase.from("shipments").select("id, tracking_number, total_weight_kg").in("id", shipmentIds)
          : { data: [] },
      ]);

      const profilesMap = new Map((profilesRes.data || []).map((p) => [p.id, p]));
      const shipmentsMap = new Map((shipmentsRes.data || []).map((s) => [s.id, s]));

      return data?.map((inv) => {
        const profile = profilesMap.get(inv.agent_id);
        const shipment = shipmentsMap.get(inv.shipment_id);
        return {
          ...inv,
          agent_name: profile?.full_name || null,
          agent_code: profile?.agent_code || null,
          company_name: profile?.company_name || null,
          shipment_tracking: shipment?.tracking_number || null,
          shipment_weight: shipment?.total_weight_kg || null,
        } as B2BInvoice;
      }) || [];
    },
  });

  // Query for agent cargo shipments that need invoicing
  const { data: agentCargoShipments, isLoading: isLoadingCargo } = useQuery({
    queryKey: ["agent-cargo-shipments"],
    queryFn: async () => {
      const { data: shipments, error } = await supabase
        .from("shipments")
        .select(`
          id,
          tracking_number,
          agent_cargo_weight_kg,
          origin_region,
          created_at,
          agent_id,
          batch_id
        `)
        .gt("agent_cargo_weight_kg", 0)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const agentIds = [...new Set(shipments?.map(s => s.agent_id).filter(Boolean))];
      const batchIds = [...new Set(shipments?.map(s => s.batch_id).filter(Boolean))];

      const [profilesRes, batchesRes, invoicesRes] = await Promise.all([
        agentIds.length > 0 
          ? supabase.from("profiles").select("id, full_name, agent_code, company_name").in("id", agentIds)
          : { data: [] },
        batchIds.length > 0
          ? supabase.from("cargo_batches").select("id, batch_number").in("id", batchIds)
          : { data: [] },
        supabase.from("invoices")
          .select("id, invoice_number, shipment_id, status")
          .eq("invoice_direction", "to_agent")
          .in("shipment_id", shipments?.map(s => s.id) || [])
      ]);

      const profilesMap = new Map((profilesRes.data || []).map(p => [p.id, p]));
      const batchesMap = new Map((batchesRes.data || []).map(b => [b.id, b]));
      const invoicesMap = new Map((invoicesRes.data || []).map(i => [i.shipment_id, i]));

      return shipments?.map(s => {
        const profile = profilesMap.get(s.agent_id);
        const batch = batchesMap.get(s.batch_id);
        const invoice = invoicesMap.get(s.id);
        
        return {
          id: s.id,
          tracking_number: s.tracking_number,
          agent_cargo_weight_kg: s.agent_cargo_weight_kg,
          origin_region: s.origin_region,
          created_at: s.created_at,
          agent_id: s.agent_id,
          agent_name: profile?.full_name || null,
          agent_code: profile?.agent_code || null,
          company_name: profile?.company_name || null,
          batch_number: batch?.batch_number || null,
          invoiced: !!invoice,
          invoice_id: invoice?.id || null,
          invoice_number: invoice?.invoice_number || null,
          invoice_status: invoice?.status || null,
        } as AgentCargoShipment;
      }) || [];
    },
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error } = await supabase
        .from("invoices")
        .update({ status: "paid", paid_at: new Date().toISOString(), amount_paid: null })
        .eq("id", invoiceId);
      if (error) throw error;

      // Get the invoice to set amount_paid correctly
      const { data: invoice } = await supabase
        .from("invoices")
        .select("amount")
        .eq("id", invoiceId)
        .single();

      if (invoice) {
        await supabase
          .from("invoices")
          .update({ amount_paid: invoice.amount })
          .eq("id", invoiceId);
      }
    },
    onSuccess: () => {
      toast.success("Invoice marked as paid");
      queryClient.invalidateQueries({ queryKey: ["b2b-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["agent-cargo-shipments"] });
      queryClient.invalidateQueries({ queryKey: ["agent-balance"] });
      queryClient.invalidateQueries({ queryKey: ["all-agent-balances"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: () => {
      toast.error("Failed to update invoice");
    },
  });

  const handleCreateInvoice = (shipment: AgentCargoShipment) => {
    setSelectedShipment(shipment);
    setInvoiceDialogOpen(true);
  };

  const fromAgentInvoices = invoices?.filter((i) => i.invoice_direction === "from_agent") || [];
  const toAgentInvoices = invoices?.filter((i) => i.invoice_direction === "to_agent") || [];
  const unbilledCargoShipments = agentCargoShipments?.filter(s => !s.invoiced) || [];

  const pendingFromAgents = fromAgentInvoices.filter((i) => i.status === "pending");
  const pendingToAgents = toAgentInvoices.filter((i) => i.status === "pending");

  const totalOwedToAgents = pendingFromAgents.reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalOwedByAgents = pendingToAgents.reduce((sum, i) => sum + (i.amount || 0), 0);

  const renderInvoiceTable = (invoiceList: B2BInvoice[]) => {
    if (invoiceList.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          No invoices found
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice #</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>Shipment</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoiceList.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className="font-mono text-sm">
                {invoice.invoice_number}
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">
                    {invoice.company_name || invoice.agent_name || "Unknown"}
                  </div>
                  {invoice.agent_code && (
                    <div className="text-xs text-muted-foreground">
                      {invoice.agent_code}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {invoice.shipment_tracking ? (
                  <div>
                    <div className="font-mono text-sm">{invoice.shipment_tracking}</div>
                    {invoice.shipment_weight && (
                      <div className="text-xs text-muted-foreground">
                        {invoice.shipment_weight} kg
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-right font-medium">
                {invoice.currency} {invoice.amount?.toFixed(2)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(invoice.created_at), "dd MMM yyyy")}
              </TableCell>
              <TableCell>
                <InvoiceStatusBadge status={invoice.status} />
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedInvoice(invoice);
                        setInvoiceDetailOpen(true);
                      }}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    {invoice.status === "pending" && (
                      <DropdownMenuItem
                        onClick={() => markAsPaidMutation.mutate(invoice.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark as Paid
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  We Owe Agents
                </p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                  ${totalOwedToAgents.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {pendingFromAgents.length} pending invoice{pendingFromAgents.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <ArrowUpRight className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Agents Owe Us
                </p>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  ${totalOwedByAgents.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {pendingToAgents.length} pending invoice{pendingToAgents.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <ArrowDownLeft className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            B2B Agent Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "from_agents" | "to_agents")}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="from_agents" className="gap-2">
                <ArrowDownLeft className="h-4 w-4" />
                From Agents ({fromAgentInvoices.length})
              </TabsTrigger>
              <TabsTrigger value="to_agents" className="gap-2">
                <ArrowUpRight className="h-4 w-4" />
                To Agents ({toAgentInvoices.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="from_agents" className="mt-4">
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-800 dark:text-red-200">
                  <strong>Invoices FROM Agents:</strong> Auto-generated when agents upload customer shipments. 
                  Astraline owes agents for shipping their customers' cargo.
                </p>
              </div>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                renderInvoiceTable(fromAgentInvoices)
              )}
            </TabsContent>

            <TabsContent value="to_agents" className="mt-4">
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <p className="text-sm text-emerald-800 dark:text-emerald-200">
                  <strong>Invoices TO Agents:</strong> For agent cargo clearing. 
                  Agents owe Astraline for clearing their own cargo.
                </p>
              </div>

              {/* Unbilled Agent Cargo Shipments */}
              {unbilledCargoShipments.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="h-4 w-4 text-amber-600" />
                    <h4 className="font-medium">Unbilled Agent Cargo ({unbilledCargoShipments.length})</h4>
                  </div>
                  <div className="rounded-lg border border-amber-200 dark:border-amber-800 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-amber-50 dark:bg-amber-950/30">
                          <TableHead>Agent</TableHead>
                          <TableHead>Tracking #</TableHead>
                          <TableHead>Region</TableHead>
                          <TableHead className="text-right">Agent Cargo (kg)</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unbilledCargoShipments.map((shipment) => (
                          <TableRow key={shipment.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {shipment.company_name || shipment.agent_name || "Unknown"}
                                </div>
                                {shipment.agent_code && (
                                  <div className="text-xs text-muted-foreground">
                                    {shipment.agent_code}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {shipment.tracking_number}
                            </TableCell>
                            <TableCell>
                              <span className="flex items-center gap-1">
                                {regionFlags[shipment.origin_region] || "🌍"}
                                <span className="uppercase">{shipment.origin_region}</span>
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {shipment.agent_cargo_weight_kg?.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(shipment.created_at), "dd MMM yyyy")}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleCreateInvoice(shipment)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Create Invoice
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Existing Invoices */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  <h4 className="font-medium">Invoices ({toAgentInvoices.length})</h4>
                </div>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : (
                  renderInvoiceTable(toAgentInvoices)
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Invoice Dialog */}
      {selectedShipment && (
        <CreateAgentCargoInvoiceDialog
          open={invoiceDialogOpen}
          onOpenChange={setInvoiceDialogOpen}
          shipment={selectedShipment}
        />
      )}

      {/* Invoice Detail Dialog */}
      <InvoiceDetailDialog
        invoice={selectedInvoice as any}
        open={invoiceDetailOpen}
        onOpenChange={setInvoiceDetailOpen}
      />
    </div>
  );
}
