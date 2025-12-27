// Shipment Upload Form - Agent portal for creating shipments (billing type auto-derived)
import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  Building2,
  ChevronsUpDown,
  Check,
  Plus,
  Trash2,
  Globe,
  Route,
  DollarSign
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
import { BillingPartyType, BILLING_PARTIES } from '@/lib/billingParty';

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

function CustomerSelector({ 
  value, 
  customerName,
  onChange, 
  customers, 
  isLoading 
}: { 
  value: string;
  customerName: string;
  onChange: (id: string, name: string) => void; 
  customers: any[] | undefined;
  isLoading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    if (!inputValue) return customers.slice(0, 20);
    const searchLower = inputValue.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchLower) ||
      c.phone?.toLowerCase().includes(searchLower)
    ).slice(0, 20);
  }, [customers, inputValue]);

  const selectedCustomer = customers?.find(c => c.id === value);
  const displayValue = selectedCustomer?.name || customerName || '';

  // Handle input blur - use the typed value
  const handleInputBlur = () => {
    if (inputValue.trim() && inputValue !== displayValue) {
      onChange('', inputValue.trim());
    }
    setInputValue('');
  };

  // Handle Enter key - use the typed value
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      onChange('', inputValue.trim());
      setOpen(false);
      setInputValue('');
    }
  };

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen && inputValue.trim()) {
        onChange('', inputValue.trim());
        setInputValue('');
      }
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full h-10 justify-between font-normal text-left",
            !displayValue && "text-muted-foreground"
          )}
        >
          <span className="truncate">
            {displayValue || "Search or type name..."}
          </span>
          <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search or type name..." 
            value={inputValue}
            onValueChange={setInputValue}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
          />
          <CommandList>
            {isLoading ? (
              <div className="p-4 text-center">
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground text-center">
                {inputValue ? `Press Enter to use "${inputValue}"` : 'No customers found. Type a name.'}
              </div>
            ) : (
              <CommandGroup>
                {filteredCustomers.map((customer) => (
                  <CommandItem
                    key={customer.id}
                    value={customer.id}
                    onSelect={() => {
                      onChange(customer.id, customer.name);
                      setOpen(false);
                      setInputValue('');
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === customer.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{customer.name}</span>
                      {customer.phone && (
                        <span className="text-xs text-muted-foreground">{customer.phone}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function ShipmentUploadForm() {
  const { user, getRegion } = useAuth();
  const defaultRegion = getRegion();
  const { data: assignedRegions = [], isLoading: regionsLoading } = useAgentAssignedRegions();
  
  // State for selected region (for multi-region agents)
  const [selectedRegion, setSelectedRegion] = useState<AgentRegion | undefined>(defaultRegion);
  
  // Routing state (billing party is now automatic based on cargo type)
  const [transitPoint, setTransitPoint] = useState<TransitPointType>('direct');
  
  // Consignee state
  const [consignee, setConsignee] = useState<string>(DEFAULT_CONSIGNEE);
  
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
  const getOrCreateBatch = useGetOrCreateBatch();
  
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
  const [completedShipments, setCompletedShipments] = useState<CompletedShipment[] | null>(null);
  
  const [lines, setLines] = useState<ShipmentLine[]>([
    { id: crypto.randomUUID(), customer_id: '', customer_name: '', description: '', weight_kg: 0 }
  ]);

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
    setConsignee(DEFAULT_CONSIGNEE);
    setAgentCargoWeight(0);
  };

  const onSubmit = async () => {
    // Allow lines with either customer_id OR customer_name, and valid weight
    const validLines = lines.filter(l => (l.customer_id || l.customer_name) && l.weight_kg > 0);
    
    // Must have at least one customer shipment OR agent cargo
    if (validLines.length === 0 && agentCargoWeight <= 0) {
      toast.error('Please add at least one shipment or agent cargo weight');
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
            tracking_number: '',
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

        // Customer shipments are always invoiced TO the customer (we bill them)
        const invoiceDirection = 'to_agent'; // Invoice goes to agent for settlement with customer
        
        // Create invoice
        const invoiceNumber = generateInvoiceNumber();
        const transitLabel = transitPoint !== 'direct' ? ` (${TRANSIT_POINT_LABELS[transitPoint]})` : '';
        
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            invoice_number: invoiceNumber,
            customer_id: line.customer_id || null,
            shipment_id: shipment.id,
            amount: lineAmount,
            currency: currency,
            invoice_type: 'shipping',
            status: 'pending',
            created_by: user?.id,
            agent_id: user?.id,
            invoice_direction: invoiceDirection,
            rate_per_kg: ratePerKg,
            notes: `Customer shipment from ${currentRegionInfo?.region_name || selectedRegion}${transitLabel}. Weight: ${line.weight_kg}kg @ ${currencySymbol}${ratePerKg}/kg`,
          })
          .select()
          .single();

        // Create invoice line items for itemized charges
        if (invoice) {
          await supabase.from('invoice_items').insert([
            {
              invoice_id: invoice.id,
              item_type: 'shipping',
              description: `Shipping ${line.weight_kg}kg @ ${currencySymbol}${ratePerKg}/kg`,
              quantity: line.weight_kg,
              unit_price: ratePerKg,
              weight_kg: line.weight_kg,
              amount: line.weight_kg * ratePerKg,
              currency: currency,
            },
            ...(transitAdditionalCost > 0 ? [{
              invoice_id: invoice.id,
              item_type: 'transit_fee',
              description: `Transit via ${TRANSIT_POINT_LABELS[transitPoint]}`,
              quantity: 1,
              unit_price: transitAdditionalCost,
              amount: transitAdditionalCost,
              currency: currency,
            }] : []),
          ]);
        }

        if (invoiceError) {
          console.error('Failed to create invoice:', invoiceError);
          // Don't fail the shipment if invoice creation fails
        }

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
      if (agentCargoWeight > 0) {
        const agentCargoAmount = agentCargoWeight * ratePerKg + transitAdditionalCost;
        
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
            tracking_number: '',
            batch_id: batchId,
            billing_party: 'agent_collect' as BillingPartyType,
            transit_point: transitPoint,
            rate_per_kg: ratePerKg,
            total_revenue: agentCargoAmount,
          })
          .select()
          .single();

        if (agentShipmentError) {
          console.error('Failed to create agent cargo shipment:', agentShipmentError);
        } else {
          // Create invoice FROM agent for their cargo (they collected from their customers)
          const { error: agentInvoiceError } = await supabase
            .from('invoices')
            .insert({
              shipment_id: agentShipment.id,
              customer_id: null,
              agent_id: user?.id,
              invoice_number: '',
              invoice_type: 'shipping',
              amount: agentCargoAmount,
              currency: currency,
              status: 'pending',
              created_by: user?.id,
              invoice_direction: 'from_agent',
              rate_per_kg: ratePerKg,
              notes: `Agent consolidated cargo from ${currentRegionInfo?.region_name || selectedRegion}. Weight: ${agentCargoWeight}kg @ ${currencySymbol}${ratePerKg}/kg`,
            });

          if (agentInvoiceError) {
            console.error('Failed to create agent cargo invoice:', agentInvoiceError);
          }
        }
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
                <CardTitle className="font-heading text-lg">New Shipments</CardTitle>
                <CardDescription>Add multiple shipment entries</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Consignee:</span>
                <Input
                  value={consignee}
                  onChange={(e) => setConsignee(e.target.value)}
                  placeholder="Enter consignee name"
                  className="w-[220px] h-8"
                />
              </div>
              
              {/* Region Selector for multi-region agents */}
              {hasMultipleRegions ? (
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <Select
                    value={selectedRegion}
                    onValueChange={(value) => setSelectedRegion(value as AgentRegion)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignedRegions.map((r) => (
                        <SelectItem key={r.region_code} value={r.region_code}>
                          {r.flag_emoji} {r.region_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <Badge variant="outline" className="gap-1.5">
                  {currentRegionInfo?.flag_emoji} {currentRegionInfo?.region_name}
                </Badge>
              )}
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

      {/* Agent's Consolidated Cargo Section */}
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
              {agentCargoWeight > 0 && ratePerKg > 0 && (
                <Badge variant="secondary" className="text-base px-3 py-1">
                  {currencySymbol}{(agentCargoWeight * ratePerKg + transitAdditionalCost).toFixed(2)}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Section */}
      <Card className="shadow-lg border-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
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
                <span className="text-amber-600">Please set a rate per KG above</span>
              )}
            </div>
            <Button
              type="button"
              size="lg"
              className="h-12 px-8 text-lg font-semibold"
              disabled={isSubmitting || (totals.validLines === 0 && agentCargoWeight <= 0) || !ratePerKg || ratePerKg <= 0}
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
                  Create Shipment{totals.validLines + (agentCargoWeight > 0 ? 1 : 0) !== 1 ? 's' : ''}
                  {agentCargoWeight > 0 && totals.validLines > 0 && ` (${totals.validLines} + Agent)`}
                  {agentCargoWeight > 0 && totals.validLines === 0 && ' (Agent Cargo)'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
