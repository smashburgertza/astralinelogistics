import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package, FileText, Plus, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { CreateAgentCargoInvoiceDialog } from "./CreateAgentCargoInvoiceDialog";

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

export function AgentCargoBilling() {
  const [selectedShipment, setSelectedShipment] = useState<AgentCargoShipment | null>(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);

  const { data: agentCargoShipments, isLoading } = useQuery({
    queryKey: ["agent-cargo-shipments"],
    queryFn: async () => {
      // Get shipments with agent cargo
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

      // Get agent profiles and batch info
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

  const totalUnbilledWeight = agentCargoShipments
    ?.filter(s => !s.invoiced)
    .reduce((sum, s) => sum + (s.agent_cargo_weight_kg || 0), 0) || 0;

  const totalUnbilledCount = agentCargoShipments?.filter(s => !s.invoiced).length || 0;

  const handleCreateInvoice = (shipment: AgentCargoShipment) => {
    setSelectedShipment(shipment);
    setInvoiceDialogOpen(true);
  };

  const regionFlags: Record<string, string> = {
    uk: "🇬🇧",
    uae: "🇦🇪",
    china: "🇨🇳",
    turkey: "🇹🇷",
    usa: "🇺🇸",
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unbilled Agent Cargo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUnbilledWeight.toFixed(1)} kg</div>
            <p className="text-xs text-muted-foreground">
              {totalUnbilledCount} shipment{totalUnbilledCount !== 1 ? 's' : ''} pending invoice
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Agent Cargo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agentCargoShipments?.reduce((sum, s) => sum + (s.agent_cargo_weight_kg || 0), 0).toFixed(1) || 0} kg
            </div>
            <p className="text-xs text-muted-foreground">
              {agentCargoShipments?.length || 0} total shipments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Billed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {agentCargoShipments?.filter(s => s.invoiced).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Invoices created
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Shipments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Agent Cargo Shipments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : !agentCargoShipments?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              No agent cargo shipments found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Tracking #</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead className="text-right">Agent Cargo (kg)</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentCargoShipments.map((shipment) => (
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
                    <TableCell className="text-sm text-muted-foreground">
                      {shipment.batch_number || "-"}
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
                    <TableCell>
                      {shipment.invoiced ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Invoiced
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-300">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {shipment.invoiced ? (
                        <Button variant="ghost" size="sm">
                          <FileText className="h-4 w-4 mr-1" />
                          {shipment.invoice_number}
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleCreateInvoice(shipment)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Create Invoice
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
    </div>
  );
}
