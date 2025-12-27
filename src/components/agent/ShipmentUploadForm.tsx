import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Package, 
  DollarSign, 
  Weight, 
  MapPin, 
  User, 
  CheckCircle, 
  Building2,
  ChevronsUpDown,
  Check
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCustomers } from '@/hooks/useShipments';
import { useRegionPricingByRegion, calculateShipmentCost } from '@/hooks/useRegionPricing';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { useRegions } from '@/hooks/useRegions';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PrintableLabels } from './PrintableLabels';
import { useGetOrCreateBatch } from '@/hooks/useCargoBatches';

// Generate a unique barcode for each parcel
const generateBarcode = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PKG-${timestamp}-${random}`;
};

// Parcel type for the form
interface ParcelEntry {
  id: string;
  barcode: string;
  weight_kg: number;
  description?: string;
}

const formSchema = z.object({
  customer_id: z.string().min(1, 'Please select a customer'),
  description: z.string().max(500, 'Description must be under 500 characters').optional(),
  weight_kg: z.number().min(0.01, 'Weight must be greater than 0'),
});

type FormValues = z.infer<typeof formSchema>;

interface CompletedShipment {
  tracking_number: string;
  customer_name: string;
  customer_phone?: string;
  origin_region: string;
  created_at: string;
  parcels: ParcelEntry[];
}

const CONSIGNEE = "Astraline Logistics Limited";

export function ShipmentUploadForm() {
  const { user, getRegion } = useAuth();
  const region = getRegion();
  const { data: regions = [] } = useRegions();
  const regionInfo = region ? regions.find(r => r.code === region) : null;
  
  const { data: customers, isLoading: customersLoading } = useCustomers();
  const { data: pricing, isLoading: pricingLoading } = useRegionPricingByRegion(region);
  const getOrCreateBatch = useGetOrCreateBatch();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedShipment, setCompletedShipment] = useState<CompletedShipment | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_id: '',
      description: '',
      weight_kg: 0,
    },
  });

  const weightKg = form.watch('weight_kg') || 0;
  const selectedCustomerId = form.watch('customer_id');

  // Get selected customer info
  const selectedCustomer = useMemo(() => {
    return customers?.find(c => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    if (!customerSearch) return customers;
    const search = customerSearch.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(search) ||
      c.phone?.toLowerCase().includes(search) ||
      c.email?.toLowerCase().includes(search)
    );
  }, [customers, customerSearch]);

  // Calculate cost based on weight
  const cost = calculateShipmentCost(weightKg, pricing);
  const currencySymbol = CURRENCY_SYMBOLS[cost.currency] || cost.currency;

  // Reset form for a new shipment
  const resetForm = () => {
    setCompletedShipment(null);
    form.reset();
    setCustomerSearch('');
  };

  const onSubmit = async (values: FormValues) => {
    if (!region || values.weight_kg <= 0) {
      toast.error('Please enter a valid weight');
      return;
    }

    setIsSubmitting(true);

    try {
      const customerName = selectedCustomer?.name || '';
      const customerPhone = selectedCustomer?.phone || '';

      // Get or create batch for this week and region
      let batchId: string | null = null;
      try {
        batchId = await getOrCreateBatch.mutateAsync({
          originRegion: region,
          cargoType: 'air',
        });
      } catch (batchError) {
        console.error('Failed to create batch:', batchError);
      }

      // Generate barcode for the single parcel
      const parcelBarcode = generateBarcode();

      // Create the shipment
      const { data: shipment, error: shipmentError } = await supabase
        .from('shipments')
        .insert({
          customer_id: values.customer_id,
          origin_region: region,
          total_weight_kg: values.weight_kg,
          description: values.description || null,
          warehouse_location: null,
          created_by: user?.id,
          agent_id: user?.id,
          tracking_number: '',
          batch_id: batchId,
        })
        .select()
        .single();

      if (shipmentError) throw shipmentError;

      // Create single parcel linked to the shipment
      const { error: parcelsError } = await supabase
        .from('parcels')
        .insert({
          shipment_id: shipment.id,
          barcode: parcelBarcode,
          weight_kg: values.weight_kg,
          description: values.description || null,
        });

      if (parcelsError) throw parcelsError;

      // Set completed shipment to show labels
      setCompletedShipment({
        tracking_number: shipment.tracking_number,
        customer_name: customerName,
        customer_phone: customerPhone,
        origin_region: region,
        created_at: shipment.created_at || new Date().toISOString(),
        parcels: [{ 
          id: crypto.randomUUID(), 
          barcode: parcelBarcode, 
          weight_kg: values.weight_kg,
          description: values.description 
        }],
      });

      toast.success('Shipment created successfully');
    } catch (error: any) {
      toast.error(`Failed to create shipment: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show printable labels if shipment is completed
  if (completedShipment) {
    return (
      <PrintableLabels
        shipment={completedShipment}
        parcels={completedShipment.parcels}
        onBack={resetForm}
      />
    );
  }

  if (!region) {
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
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-3">
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-heading text-lg">New Shipment</CardTitle>
                  <CardDescription>Enter shipment details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Consignee - Read Only */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      Consignee
                    </label>
                    <div className="h-12 px-4 rounded-lg border bg-muted/50 flex items-center">
                      <span className="font-semibold text-foreground">{CONSIGNEE}</span>
                    </div>
                  </div>

                  {/* Customer Name with Autocomplete */}
                  <FormField
                    control={form.control}
                    name="customer_id"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          Customer Name
                        </FormLabel>
                        <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={customerOpen}
                                className={cn(
                                  "h-12 justify-between font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value && selectedCustomer
                                  ? selectedCustomer.name
                                  : "Search customer..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0" align="start">
                            <Command shouldFilter={false}>
                              <CommandInput 
                                placeholder="Type to search customers..." 
                                value={customerSearch}
                                onValueChange={setCustomerSearch}
                              />
                              <CommandList>
                                {customersLoading ? (
                                  <div className="p-4 text-center">
                                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                                  </div>
                                ) : filteredCustomers.length === 0 ? (
                                  <CommandEmpty>No customer found.</CommandEmpty>
                                ) : (
                                  <CommandGroup>
                                    {filteredCustomers.map((customer) => (
                                      <CommandItem
                                        key={customer.id}
                                        value={customer.id}
                                        onSelect={() => {
                                          field.onChange(customer.id);
                                          setCustomerOpen(false);
                                          setCustomerSearch('');
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            field.value === customer.id
                                              ? "opacity-100"
                                              : "opacity-0"
                                          )}
                                        />
                                        <div className="flex flex-col">
                                          <span className="font-medium">{customer.name}</span>
                                          {customer.phone && (
                                            <span className="text-xs text-muted-foreground">
                                              {customer.phone}
                                            </span>
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Description */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g., Electronics, Clothing, Documents..."
                            className="min-h-[80px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Weight */}
                  <FormField
                    control={form.control}
                    name="weight_kg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Weight className="w-4 h-4 text-muted-foreground" />
                          Weight (kg)
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              className="h-12 pr-12 text-lg"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                              kg
                            </span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Amount - Auto Calculated */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      Amount
                      <Badge variant="secondary" className="text-xs font-normal">Auto-calculated</Badge>
                    </label>
                    <div className="h-12 px-4 rounded-lg border bg-muted/50 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {weightKg.toFixed(2)} kg × {currencySymbol}{pricing?.customer_rate_per_kg || 0}/kg
                      </span>
                      <span className={cn(
                        "text-xl font-bold",
                        cost.total > 0 ? "text-primary" : "text-muted-foreground"
                      )}>
                        {currencySymbol}{cost.total.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-14 text-lg font-semibold"
                    disabled={isSubmitting || pricingLoading || weightKg <= 0}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Creating Shipment...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Create Shipment
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Summary Sidebar */}
        <div className="lg:col-span-2">
          <Card className="shadow-lg border-0 sticky top-24">
            <CardHeader className="pb-4">
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Region Badge */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Origin</span>
                <Badge variant="outline" className="gap-1.5">
                  {regionInfo?.flag_emoji} {regionInfo?.name}
                </Badge>
              </div>

              {/* Consignee */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Consignee</span>
                <span className="font-medium text-sm">Astraline</span>
              </div>

              {/* Customer */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Customer</span>
                <span className="font-medium text-sm truncate max-w-[150px]">
                  {selectedCustomer?.name || '-'}
                </span>
              </div>

              {/* Weight Display */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Weight</span>
                <span className="font-semibold">{weightKg.toFixed(2)} kg</span>
              </div>

              {/* Rate Display */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Rate</span>
                <span className="font-semibold">{currencySymbol}{pricing?.customer_rate_per_kg || 0}/kg</span>
              </div>

              <Separator />

              {/* Cost Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{currencySymbol}{cost.subtotal.toFixed(2)}</span>
                </div>
                
                {cost.handlingFee > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Handling Fee</span>
                    <span className="font-medium">{currencySymbol}{cost.handlingFee.toFixed(2)}</span>
                  </div>
                )}

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total</span>
                  <span className={cn(
                    "text-2xl font-bold",
                    cost.total > 0 ? "text-primary" : "text-muted-foreground"
                  )}>
                    {currencySymbol}{cost.total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Info Note */}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-xs text-muted-foreground">
                  Amount is calculated based on weight and the region rate. Final invoice may vary based on actual measurements.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
