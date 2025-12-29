// Shipment Upload Form - Agent portal for creating shipments (billing type auto-derived)
import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Package, 
  MapPin, 
  CheckCircle, 
  Plus,
  Trash2,
  Globe,
  Route,
  DollarSign,
  Save
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCustomers } from '@/hooks/useShipments';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { useAgentAssignedRegions } from '@/hooks/useAgentRegions';
import { useTransitRoutesByRegion, TRANSIT_POINT_LABELS, TransitPointType } from '@/hooks/useTransitRoutes';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PrintableLabels } from './PrintableLabels';
import { useGetOrCreateBatch } from '@/hooks/useCargoBatches';
import { Database } from '@/integrations/supabase/types';
import { BillingPartyType } from '@/lib/billingParty';
import { useAgentSettings } from '@/hooks/useAgents';
import { CustomerSelector } from './CustomerSelector';

type AgentRegion = Database['public']['Enums']['agent_region'];

// Generate a unique barcode for each parcel
const generateBarcode = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PKG-${timestamp}-${random}`;
};

// Generate invoice number
const generateInvoiceNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `AGT-${year}${month}-${random}`;
};

// Generate tracking number (same format as database function)
const generateTrackingNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `AST${year}${month}${day}${random}`;
};

interface ShipmentLine {
  id: string;
  customer_id: string;
  customer_name: string;
  description: string;
  weight_kg: number;
}

interface ParcelEntry {
  id: string;
  barcode: string;
  weight_kg: number;
  description?: string;
}

interface CompletedShipment {
  tracking_number: string;
  customer_name: string;
  customer_phone?: string;
  origin_region: string;
  created_at: string;
  parcels: ParcelEntry[];
}

const DEFAULT_CONSIGNEE = "Astraline Logistics Limited";

// Available currencies for agent to choose from
const AVAILABLE_CURRENCIES = [
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
];

// CustomerSelector is now imported from ./CustomerSelector

export function ShipmentUploadForm() {
  const { user, getRegion } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const draftId = searchParams.get('draft');
  
  const defaultRegion = getRegion();
  const { data: assignedRegions = [], isLoading: regionsLoading } = useAgentAssignedRegions();
  
  // State for selected region (for multi-region agents)
  const [selectedRegion, setSelectedRegion] = useState<AgentRegion | undefined>(defaultRegion);
  
  // Routing state (billing party is now automatic based on cargo type)
  const [transitPoint, setTransitPoint] = useState<TransitPointType>('direct');
  
  // Track if editing an existing draft
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  
  // Agent's consolidated cargo (not tracked individually)
  const [agentCargoWeight, setAgentCargoWeight] = useState<number>(0);
  
  // Agent-defined pricing
  const [ratePerKg, setRatePerKg] = useState<number>(0);
  const [currency, setCurrency] = useState<string>('GBP');
  
  // Set default region when assigned regions load
  useEffect(() => {
    if (assignedRegions.length > 0 && !selectedRegion) {
      setSelectedRegion(assignedRegions[0].region_code);
    } else if (defaultRegion && !selectedRegion) {
      setSelectedRegion(defaultRegion);
    }
  }, [assignedRegions, defaultRegion, selectedRegion]);
  
  const hasMultipleRegions = assignedRegions.length > 1;
  const currentRegionInfo = assignedRegions.find(r => r.region_code === selectedRegion);
  
  const { data: customers, isLoading: customersLoading } = useCustomers();
  const { data: transitRoutes = [] } = useTransitRoutesByRegion(selectedRegion);
  const { data: agentSettings } = useAgentSettings();
  const getOrCreateBatch = useGetOrCreateBatch();
  
  // Check if agent can have consolidated cargo
  const canHaveConsolidatedCargo = agentSettings?.can_have_consolidated_cargo ?? false;
  
  // Filter available transit options based on configured routes
  const availableTransitPoints = useMemo(() => {
    const points: { value: TransitPointType; label: string; additionalCost?: number }[] = [
      { value: 'direct', label: 'Direct' }
    ];
    
    transitRoutes.forEach(route => {
      if (route.is_active && route.transit_point !== 'direct') {
        points.push({
          value: route.transit_point,
          label: TRANSIT_POINT_LABELS[route.transit_point],
          additionalCost: route.additional_cost,
        });
      }
    });
    
    return points;
  }, [transitRoutes]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [completedShipments, setCompletedShipments] = useState<CompletedShipment[] | null>(null);
  
  const [lines, setLines] = useState<ShipmentLine[]>([
    { id: crypto.randomUUID(), customer_id: '', customer_name: '', description: '', weight_kg: 0 }
  ]);
  
  // Load draft data when draftId is present in URL
  useEffect(() => {
    const loadDraft = async () => {
      if (!draftId || !user?.id) return;
      
      setIsLoadingDraft(true);
      try {
        // Fetch the draft shipment with its parcels
        const { data: draft, error } = await supabase
          .from('shipments')
          .select('*, parcels(*), customers(name, email)')
          .eq('id', draftId)
          .eq('is_draft', true)
          .eq('agent_id', user.id)
          .single();
        
        if (error) throw error;
        if (!draft) {
          toast.error('Draft not found');
          return;
        }
        
        // Set the editing state
        setEditingDraftId(draftId);
        
        // Populate form with draft data
        setSelectedRegion(draft.origin_region);
        setTransitPoint(draft.transit_point || 'direct');
        setRatePerKg(draft.rate_per_kg || 0);
        
        // Check if this is agent cargo
        if (draft.agent_cargo_weight_kg && draft.agent_cargo_weight_kg > 0) {
          setAgentCargoWeight(draft.agent_cargo_weight_kg);
        }
        
        // Create a line from the draft data
        const newLines: ShipmentLine[] = [{
          id: crypto.randomUUID(),
          customer_id: draft.customer_id || '',
          customer_name: draft.customer_name || draft.customers?.name || '',
          description: draft.description || '',
          weight_kg: draft.total_weight_kg || 0,
        }];
        
        setLines(newLines);
        toast.info('Draft loaded - you can continue editing');
        
      } catch (error: any) {
        console.error('Failed to load draft:', error);
        toast.error('Failed to load draft');
      } finally {
        setIsLoadingDraft(false);
      }
    };
    
    loadDraft();
  }, [draftId, user?.id]);

  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;
  
  // Get additional transit cost if not direct
  const transitAdditionalCost = useMemo(() => {
    if (transitPoint === 'direct') return 0;
    const route = transitRoutes.find(r => r.transit_point === transitPoint);
    return route?.additional_cost || 0;
  }, [transitPoint, transitRoutes]);

  // Calculate amount for a line (weight × rate per kg + transit cost)
  const calculateLineAmount = (weight: number) => {
    if (!weight || weight <= 0 || !ratePerKg || ratePerKg <= 0) return 0;
    return (weight * ratePerKg) + transitAdditionalCost;
  };

  // Calculate totals
  const totals = useMemo(() => {
    const totalWeight = lines.reduce((sum, line) => sum + (line.weight_kg || 0), 0);
    const totalAmount = lines.reduce((sum, line) => sum + calculateLineAmount(line.weight_kg), 0);
    const validLines = lines.filter(l => l.customer_id && l.weight_kg > 0);
    return { totalWeight, totalAmount, validLines: validLines.length };
  }, [lines, ratePerKg, transitAdditionalCost]);

  // Add new line
  const addLine = () => {
    setLines([...lines, { 
      id: crypto.randomUUID(), 
      customer_id: '', 
      customer_name: '',
      description: '', 
      weight_kg: 0 
    }]);
  };

  // Remove line
  const removeLine = (id: string) => {
    if (lines.length > 1) {
      setLines(lines.filter(l => l.id !== id));
    }
  };

  // Update line
  const updateLine = (id: string, field: keyof ShipmentLine, value: any) => {
    setLines(lines.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  // Update customer (both id and name)
  const updateLineCustomer = (id: string, customerId: string, customerName: string) => {
    setLines(lines.map(l => l.id === id ? { ...l, customer_id: customerId, customer_name: customerName } : l));
  };

  // Reset form
  const resetForm = () => {
    setCompletedShipments(null);
    setLines([{ id: crypto.randomUUID(), customer_id: '', customer_name: '', description: '', weight_kg: 0 }]);
    setTransitPoint('direct');
    setRatePerKg(0);
    setAgentCargoWeight(0);
    setEditingDraftId(null);
    // Clear draft from URL
    if (draftId) {
      setSearchParams({});
    }
  };

  // Save as draft function
  const onSaveAsDraft = async () => {
    const validLines = lines.filter(l => (l.customer_id || l.customer_name) && l.weight_kg > 0);
    
    if (validLines.length === 0 && (!canHaveConsolidatedCargo || agentCargoWeight <= 0)) {
      toast.error('Please add at least one shipment to save as draft');
      return;
    }

    if (!selectedRegion) {
      toast.error('Please select a region');
      return;
    }

    setIsSavingDraft(true);

    try {
      // If editing an existing draft, update it
      if (editingDraftId) {
        const line = validLines[0]; // For now, we work with the first line
        const customer = customers?.find(c => c.id === line?.customer_id);
        const lineAmount = calculateLineAmount(line?.weight_kg || 0);

        const { error: updateError } = await supabase
          .from('shipments')
          .update({
            customer_id: line?.customer_id || null,
            customer_name: line?.customer_name || customer?.name || null,
            origin_region: selectedRegion,
            total_weight_kg: line?.weight_kg || 0,
            description: line?.description || null,
            transit_point: transitPoint,
            rate_per_kg: ratePerKg || 0,
            total_revenue: lineAmount,
            agent_cargo_weight_kg: agentCargoWeight > 0 ? agentCargoWeight : null,
          })
          .eq('id', editingDraftId)
          .eq('is_draft', true);

        if (updateError) throw updateError;

        // Update parcel weight if exists
        if (line) {
          await supabase
            .from('parcels')
            .update({
              weight_kg: line.weight_kg,
              description: line.description || null,
            })
            .eq('shipment_id', editingDraftId);
        }

        toast.success('Draft updated successfully!');
        return; // Don't reset form when just saving draft
      }

      // Creating new draft
      // Get or create batch
      let batchId: string | null = null;
      try {
        batchId = await getOrCreateBatch.mutateAsync({
          originRegion: selectedRegion,
          cargoType: 'air',
        });
      } catch (batchError) {
        console.error('Failed to create batch:', batchError);
      }

      // Create ONE draft shipment with all parcels
      const trackingNumber = generateTrackingNumber();
      const totalWeight = validLines.reduce((sum, l) => sum + l.weight_kg, 0) + agentCargoWeight;
      const totalAmount = validLines.reduce((sum, l) => sum + calculateLineAmount(l.weight_kg), 0) +
        (canHaveConsolidatedCargo && agentCargoWeight > 0 ? (agentCargoWeight * (ratePerKg || 0)) + transitAdditionalCost : 0);
      
      // Use first customer info for the draft shipment header
      const firstLine = validLines[0];
      const firstCustomer = firstLine ? customers?.find(c => c.id === firstLine.customer_id) : null;
      
      // Build description from all lines
      const descriptions = validLines
        .map(l => l.description || l.customer_name)
        .filter(Boolean)
        .join(', ');

      const { data: shipment, error: shipmentError } = await supabase
        .from('shipments')
        .insert({
          customer_id: firstLine?.customer_id || null,
          customer_name: firstLine?.customer_name || firstCustomer?.name || null,
          origin_region: selectedRegion,
          total_weight_kg: totalWeight,
          description: descriptions || null,
          warehouse_location: null,
          created_by: user?.id,
          agent_id: user?.id,
          tracking_number: trackingNumber,
          batch_id: batchId,
          billing_party: agentCargoWeight > 0 ? 'agent_collect' as BillingPartyType : 'customer_direct' as BillingPartyType,
          transit_point: transitPoint,
          rate_per_kg: ratePerKg || 0,
          total_revenue: totalAmount,
          agent_cargo_weight_kg: agentCargoWeight > 0 ? agentCargoWeight : null,
          is_draft: true,
        })
        .select()
        .single();

      if (shipmentError) throw shipmentError;

      // Create parcels for each line
      const parcelsToInsert = validLines.map(line => ({
        shipment_id: shipment.id,
        barcode: generateBarcode(),
        weight_kg: line.weight_kg,
        description: line.description || line.customer_name || null,
      }));

      // Add agent cargo parcel if present
      if (canHaveConsolidatedCargo && agentCargoWeight > 0) {
        parcelsToInsert.push({
          shipment_id: shipment.id,
          barcode: generateBarcode(),
          weight_kg: agentCargoWeight,
          description: "Agent's Consolidated Cargo",
        });
      }

      if (parcelsToInsert.length > 0) {
        const { error: parcelsError } = await supabase
          .from('parcels')
          .insert(parcelsToInsert);

        if (parcelsError) throw parcelsError;
      }

      toast.success('Draft saved successfully! You can continue editing from My Shipments.');
      resetForm();
    } catch (error: any) {
      toast.error(`Failed to save draft: ${error.message}`);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const onSubmit = async () => {
    // Allow lines with either customer_id OR customer_name, and valid weight
    const validLines = lines.filter(l => (l.customer_id || l.customer_name) && l.weight_kg > 0);
    
    // Must have at least one customer shipment OR agent cargo (if permitted)
    if (validLines.length === 0 && (!canHaveConsolidatedCargo || agentCargoWeight <= 0)) {
      toast.error('Please add at least one shipment with customer and weight');
      return;
    }

    if (!selectedRegion) {
      toast.error('Please select a region');
      return;
    }

    if (!ratePerKg || ratePerKg <= 0) {
      toast.error('Please set a rate per KG');
      return;
    }

    setIsSubmitting(true);
    const createdShipments: CompletedShipment[] = [];

    try {
      // If editing a draft, delete the old draft first (we'll create a finalized version)
      if (editingDraftId) {
        // Delete parcels first
        await supabase.from('parcels').delete().eq('shipment_id', editingDraftId);
        // Delete the draft shipment
        await supabase.from('shipments').delete().eq('id', editingDraftId).eq('is_draft', true);
      }

      // Get or create batch
      let batchId: string | null = null;
      try {
        batchId = await getOrCreateBatch.mutateAsync({
          originRegion: selectedRegion,
          cargoType: 'air',
        });
      } catch (batchError) {
        console.error('Failed to create batch:', batchError);
      }

      // Create each shipment and its invoice
      for (const line of validLines) {
        const parcelBarcode = generateBarcode();
        const trackingNumber = generateTrackingNumber();
        const customer = customers?.find(c => c.id === line.customer_id);
        const lineAmount = calculateLineAmount(line.weight_kg);

        const { data: shipment, error: shipmentError } = await supabase
          .from('shipments')
          .insert({
            customer_id: line.customer_id || null,
            customer_name: line.customer_name || customer?.name || null,
            origin_region: selectedRegion,
            total_weight_kg: line.weight_kg,
            description: line.description || null,
            warehouse_location: null,
            created_by: user?.id,
            agent_id: user?.id,
            tracking_number: trackingNumber,
            batch_id: batchId,
            billing_party: 'customer_direct' as BillingPartyType, // Customer shipments always billed directly
            transit_point: transitPoint,
            rate_per_kg: ratePerKg,
            total_revenue: lineAmount,
          })
          .select()
          .single();

        if (shipmentError) throw shipmentError;

        const { error: parcelError } = await supabase
          .from('parcels')
          .insert({
            shipment_id: shipment.id,
            barcode: parcelBarcode,
            weight_kg: line.weight_kg,
            description: line.description || null,
          });

        if (parcelError) throw parcelError;

        // NOTE: Invoice creation is now handled manually by admin
        // Agent just uploads shipments, admin creates invoices with additional charges later

        createdShipments.push({
          tracking_number: shipment.tracking_number,
          customer_name: customer?.name || line.customer_name,
          customer_phone: customer?.phone || '',
          origin_region: selectedRegion,
          created_at: shipment.created_at || new Date().toISOString(),
          parcels: [{
            id: crypto.randomUUID(),
            barcode: parcelBarcode,
            weight_kg: line.weight_kg,
            description: line.description
          }]
        });
      }

      // Create a separate shipment for agent's consolidated cargo if any
      // Agent's own cargo: Astraline bills the agent for clearing/handling services (to_agent)
      if (agentCargoWeight > 0) {
        const agentTrackingNumber = generateTrackingNumber();
        
        const { data: agentShipment, error: agentShipmentError } = await supabase
          .from('shipments')
          .insert({
            customer_id: null,
            customer_name: 'Agent Cargo (Consolidated)',
            origin_region: selectedRegion,
            total_weight_kg: agentCargoWeight,
            agent_cargo_weight_kg: agentCargoWeight,
            description: 'Consolidated agent cargo - not tracked individually',
            warehouse_location: null,
            created_by: user?.id,
            agent_id: user?.id,
            tracking_number: agentTrackingNumber,
            batch_id: batchId,
            billing_party: 'agent_collect' as BillingPartyType,
            shipment_owner: 'agent', // Agent owns this cargo
            transit_point: transitPoint,
            rate_per_kg: ratePerKg,
            total_revenue: 0, // No customer revenue for agent-owned cargo
          })
          .select()
          .single();

        if (agentShipmentError) {
          console.error('Failed to create agent cargo shipment:', agentShipmentError);
        }
        // NOTE: Invoice will be created by admin via B2B Invoices page
        // Admin creates "to_agent" invoice to bill agent for clearing services
      }

      setCompletedShipments(createdShipments);
      const agentCargoMsg = agentCargoWeight > 0 ? ` + agent cargo (${agentCargoWeight}kg)` : '';
      toast.success(`${createdShipments.length} shipment(s)${agentCargoMsg} created successfully`);
    } catch (error: any) {
      toast.error(`Failed to create shipments: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show printable labels if shipments are completed
  if (completedShipments && completedShipments.length > 0) {
    return (
      <PrintableLabels
        shipment={completedShipments[0]}
        parcels={completedShipments[0].parcels}
        onBack={resetForm}
      />
    );
  }

  if (!selectedRegion && !regionsLoading && assignedRegions.length === 0) {
    return (
      <Card className="max-w-xl mx-auto">
        <CardContent className="py-12 text-center">
          <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Region Not Assigned</h3>
          <p className="text-muted-foreground">
            You don't have a region assigned to your account. Please contact an administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoadingDraft) {
    return (
      <Card className="max-w-xl mx-auto">
        <CardContent className="py-12 text-center">
          <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-semibold mb-2">Loading Draft</h3>
          <p className="text-muted-foreground">
            Please wait while we load your draft...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="shadow-lg border-0">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-heading text-lg">
                  {editingDraftId ? 'Continue Draft Shipment' : 'New Shipments'}
                </CardTitle>
                <CardDescription>
                  {editingDraftId ? 'Edit and finalize your draft shipment' : 'Add multiple shipment entries'}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              {/* Region Selector */}
              {regionsLoading ? (
                <Badge variant="outline" className="gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading...
                </Badge>
              ) : assignedRegions.length > 1 ? (
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <Select
                    value={selectedRegion}
                    onValueChange={(value) => setSelectedRegion(value as AgentRegion)}
                  >
                    <SelectTrigger className="w-[200px] bg-background">
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-[100]">
                      {assignedRegions.map((r) => (
                        <SelectItem key={r.region_code} value={r.region_code}>
                          <span className="flex items-center gap-2">
                            <span>{r.flag_emoji}</span>
                            <span>{r.region_name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : currentRegionInfo ? (
                <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  {currentRegionInfo.flag_emoji} {currentRegionInfo.region_name}
                </Badge>
              ) : null}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Pricing & Routing Card */}
      <Card className="shadow-lg border-0">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rate Per KG - Agent defines this */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Rate Per KG</Label>
              </div>
              <div className="flex gap-2">
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.symbol} {c.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={ratePerKg || ''}
                  onChange={(e) => setRatePerKg(parseFloat(e.target.value) || 0)}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Transit Point Selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Route className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Transit Route</Label>
              </div>
              <Select
                value={transitPoint}
                onValueChange={(value) => setTransitPoint(value as TransitPointType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableTransitPoints.map((point) => (
                    <SelectItem key={point.value} value={point.value}>
                      {point.label}
                      {point.additionalCost ? ` (+${currencySymbol}${point.additionalCost})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipment Lines Table */}
      <Card className="shadow-lg border-0">
        <CardContent className="p-0">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 p-4 bg-muted/50 border-b text-sm font-medium text-muted-foreground">
            <div className="col-span-4">Customer Name</div>
            <div className="col-span-4">Description</div>
            <div className="col-span-2 text-right">Weight (kg)</div>
            <div className="col-span-2 text-right">Amount ({currencySymbol})</div>
          </div>

          {/* Table Body */}
          <div className="divide-y">
            {lines.map((line, index) => {
              const amount = calculateLineAmount(line.weight_kg);
              return (
                <div key={line.id} className="grid grid-cols-12 gap-2 p-3 items-center group hover:bg-muted/30">
                  {/* Customer Name */}
                  <div className="col-span-4">
                    <CustomerSelector
                      value={line.customer_id}
                      customerName={line.customer_name}
                      onChange={(id, name) => updateLineCustomer(line.id, id, name)}
                      customers={customers}
                      isLoading={customersLoading}
                    />
                  </div>

                  {/* Description */}
                  <div className="col-span-4">
                    <Input
                      placeholder="e.g., Electronics, Clothing..."
                      value={line.description}
                      onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                      className="h-10"
                    />
                  </div>

                  {/* Weight */}
                  <div className="col-span-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={line.weight_kg || ''}
                      onChange={(e) => updateLine(line.id, 'weight_kg', parseFloat(e.target.value) || 0)}
                      className="h-10 text-right"
                    />
                  </div>

                  {/* Amount (calculated) */}
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <span className={cn(
                      "font-semibold tabular-nums",
                      amount > 0 ? "text-primary" : "text-muted-foreground"
                    )}>
                      {currencySymbol}{amount.toFixed(2)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      onClick={() => removeLine(line.id)}
                      disabled={lines.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Line Button */}
          <div className="p-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLine}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Line
            </Button>
          </div>

          {/* Totals Row */}
          <div className="grid grid-cols-12 gap-2 p-4 bg-muted/50 border-t font-medium">
            <div className="col-span-4 text-muted-foreground">
              {totals.validLines} shipment{totals.validLines !== 1 ? 's' : ''}
            </div>
            <div className="col-span-4"></div>
            <div className="col-span-2 text-right">
              <span className="text-muted-foreground text-sm">Total:</span>{' '}
              <span className="font-bold">{totals.totalWeight.toFixed(2)} kg</span>
            </div>
            <div className="col-span-2 text-right">
              <span className={cn(
                "text-xl font-bold",
                totals.totalAmount > 0 ? "text-primary" : "text-muted-foreground"
              )}>
                {currencySymbol}{totals.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent's Consolidated Cargo Section - Only shown if agent has permission */}
      {canHaveConsolidatedCargo && (
        <Card className="shadow-lg border-0 bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <Package className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="font-medium">Agent's Cargo (Consolidated)</h3>
                  <p className="text-sm text-muted-foreground">
                    Not tracked individually - for billing purposes only
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="agent-cargo-weight" className="text-sm text-muted-foreground">
                  Weight (kg):
                </Label>
                <Input
                  id="agent-cargo-weight"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={agentCargoWeight || ''}
                  onChange={(e) => setAgentCargoWeight(parseFloat(e.target.value) || 0)}
                  className="w-32 h-10 text-right"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Section */}
      <Card className="shadow-lg border-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="text-sm text-muted-foreground">
              {ratePerKg > 0 ? (
                <>
                  <span className="font-medium text-foreground">Rate:</span> {currencySymbol}{ratePerKg}/kg
                  {transitAdditionalCost > 0 && (
                    <span className="ml-4">
                      <span className="font-medium text-foreground">Transit:</span> +{currencySymbol}{transitAdditionalCost}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-amber-600">Set a rate per KG to finalize</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Save as Draft Button */}
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-12 px-6"
                disabled={isSavingDraft || isSubmitting || (totals.validLines === 0 && (!canHaveConsolidatedCargo || agentCargoWeight <= 0))}
                onClick={onSaveAsDraft}
              >
                {isSavingDraft ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    Save Draft
                  </>
                )}
              </Button>

              {/* Create (Finalize) Button */}
              <Button
                type="button"
                size="lg"
                className="h-12 px-8 text-lg font-semibold"
                disabled={isSubmitting || isSavingDraft || (totals.validLines === 0 && (!canHaveConsolidatedCargo || agentCargoWeight <= 0)) || !ratePerKg || ratePerKg <= 0}
                onClick={onSubmit}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Finalize Shipment{totals.validLines + (canHaveConsolidatedCargo && agentCargoWeight > 0 ? 1 : 0) !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
