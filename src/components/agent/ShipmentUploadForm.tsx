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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Plus, 
  Trash2, 
  Phone,
  QrCode
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCustomers, useCreateShipment } from '@/hooks/useShipments';
import { useRegionPricingByRegion, calculateShipmentCost } from '@/hooks/useRegionPricing';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { useRegions } from '@/hooks/useRegions';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PrintableLabels } from './PrintableLabels';

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
  customer_mode: z.enum(['existing', 'new']),
  customer_id: z.string().optional(),
  customer_name: z.string().max(100, 'Name must be under 100 characters').optional(),
  customer_phone: z.string().max(20, 'Phone must be under 20 characters').optional(),
  description: z.string().max(500, 'Description must be under 500 characters').optional(),
  warehouse_location: z.string().max(100, 'Location must be under 100 characters').optional(),
}).refine((data) => {
  if (data.customer_mode === 'existing') {
    return !!data.customer_id;
  } else {
    return !!data.customer_name && data.customer_name.trim().length > 0;
  }
}, {
  message: "Please select a customer or enter customer details",
  path: ["customer_id"],
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

export function ShipmentUploadForm() {
  const { user, getRegion } = useAuth();
  const region = getRegion();
  const { data: regions = [] } = useRegions();
  const regionInfo = region ? regions.find(r => r.code === region) : null;
  
  const { data: customers, isLoading: customersLoading } = useCustomers();
  const { data: pricing, isLoading: pricingLoading } = useRegionPricingByRegion(region);
  const createShipment = useCreateShipment();
  
  const [parcels, setParcels] = useState<ParcelEntry[]>([
    { id: crypto.randomUUID(), barcode: generateBarcode(), weight_kg: 0 }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedShipment, setCompletedShipment] = useState<CompletedShipment | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_mode: 'existing',
      customer_id: '',
      customer_name: '',
      customer_phone: '',
      description: '',
      warehouse_location: '',
    },
  });

  const customerMode = form.watch('customer_mode');

  // Calculate total weight from all parcels
  const totalWeight = useMemo(() => {
    return parcels.reduce((sum, parcel) => sum + (parcel.weight_kg || 0), 0);
  }, [parcels]);

  const cost = calculateShipmentCost(totalWeight, pricing);
  const currencySymbol = CURRENCY_SYMBOLS[cost.currency] || cost.currency;

  // Add a new parcel entry
  const addParcel = () => {
    setParcels([...parcels, { 
      id: crypto.randomUUID(), 
      barcode: generateBarcode(), 
      weight_kg: 0 
    }]);
  };

  // Remove a parcel entry
  const removeParcel = (id: string) => {
    if (parcels.length > 1) {
      setParcels(parcels.filter(p => p.id !== id));
    }
  };

  // Update a parcel's weight
  const updateParcelWeight = (id: string, weight: number) => {
    setParcels(parcels.map(p => 
      p.id === id ? { ...p, weight_kg: weight } : p
    ));
  };

  // Update a parcel's description
  const updateParcelDescription = (id: string, description: string) => {
    setParcels(parcels.map(p => 
      p.id === id ? { ...p, description } : p
    ));
  };

  // Reset form for a new shipment
  const resetForm = () => {
    setCompletedShipment(null);
    setParcels([{ id: crypto.randomUUID(), barcode: generateBarcode(), weight_kg: 0 }]);
    form.reset();
  };

  const onSubmit = async (values: FormValues) => {
    if (!region || totalWeight <= 0) {
      toast.error('Please add at least one parcel with weight');
      return;
    }

    setIsSubmitting(true);

    try {
      let customerId = values.customer_id;
      let customerName = '';
      let customerPhone = '';

      // If new customer mode, create the customer first
      if (values.customer_mode === 'new' && values.customer_name) {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            name: values.customer_name.trim(),
            phone: values.customer_phone?.trim() || null,
          })
          .select()
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;
        customerName = values.customer_name.trim();
        customerPhone = values.customer_phone?.trim() || '';
      } else {
        // Get existing customer name
        const existingCustomer = customers?.find(c => c.id === customerId);
        customerName = existingCustomer?.name || '';
        customerPhone = existingCustomer?.phone || '';
      }

      // Create the shipment
      const { data: shipment, error: shipmentError } = await supabase
        .from('shipments')
        .insert({
          customer_id: customerId,
          origin_region: region,
          total_weight_kg: totalWeight,
          description: values.description || null,
          warehouse_location: values.warehouse_location || null,
          created_by: user?.id,
          agent_id: user?.id,
          tracking_number: '', // Generated by DB trigger
        })
        .select()
        .single();

      if (shipmentError) throw shipmentError;

      // Create all parcels linked to the shipment
      const validParcels = parcels.filter(p => p.weight_kg > 0);
      const parcelInserts = validParcels.map(p => ({
        shipment_id: shipment.id,
        barcode: p.barcode,
        weight_kg: p.weight_kg,
        description: p.description || null,
      }));

      if (parcelInserts.length > 0) {
        const { error: parcelsError } = await supabase
          .from('parcels')
          .insert(parcelInserts);

        if (parcelsError) throw parcelsError;
      }

      // Set completed shipment to show labels
      setCompletedShipment({
        tracking_number: shipment.tracking_number,
        customer_name: customerName,
        customer_phone: customerPhone,
        origin_region: region,
        created_at: shipment.created_at || new Date().toISOString(),
        parcels: validParcels,
      });

      toast.success(`Shipment created with ${parcelInserts.length} parcel(s)`);
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
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Section */}
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-heading text-lg">Customer Details</CardTitle>
                  <CardDescription>Select existing or enter new customer</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <div className="space-y-4">
                  {/* Customer Mode Toggle */}
                  <FormField
                    control={form.control}
                    name="customer_mode"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={field.value === 'existing' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => field.onChange('existing')}
                          >
                            Existing Customer
                          </Button>
                          <Button
                            type="button"
                            variant={field.value === 'new' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => field.onChange('new')}
                          >
                            New Customer
                          </Button>
                        </div>
                      </FormItem>
                    )}
                  />

                  {customerMode === 'existing' ? (
                    <FormField
                      control={form.control}
                      name="customer_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Customer</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12">
                                <SelectValue placeholder="Select a customer" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {customersLoading ? (
                                <div className="p-4 text-center">
                                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                                </div>
                              ) : customers?.length === 0 ? (
                                <div className="p-4 text-center text-muted-foreground">
                                  No customers found
                                </div>
                              ) : (
                                customers?.map((customer) => (
                                  <SelectItem key={customer.id} value={customer.id}>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{customer.name}</span>
                                      {customer.phone && (
                                        <span className="text-muted-foreground text-sm">
                                          ({customer.phone})
                                        </span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="customer_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              Customer Name
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter customer name"
                                className="h-12"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="customer_phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              Phone Number
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter phone number"
                                className="h-12"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              </Form>
            </CardContent>
          </Card>

          {/* Parcels Section */}
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="font-heading text-lg">Parcels</CardTitle>
                    <CardDescription>Add each parcel with its weight</CardDescription>
                  </div>
                </div>
                <Button 
                  type="button" 
                  onClick={addParcel}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Parcel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {parcels.map((parcel, index) => (
                  <div 
                    key={parcel.id}
                    className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30"
                  >
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3">
                      {/* Parcel Number */}
                      <div className="sm:col-span-1 flex items-center">
                        <Badge variant="secondary" className="h-8 w-8 rounded-full flex items-center justify-center p-0">
                          {index + 1}
                        </Badge>
                      </div>
                      
                      {/* Barcode (auto-generated, read-only) */}
                      <div className="sm:col-span-4">
                        <label className="text-xs text-muted-foreground mb-1 block">Barcode</label>
                        <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-background">
                          <QrCode className="w-4 h-4 text-muted-foreground" />
                          <code className="text-sm font-mono text-muted-foreground">{parcel.barcode}</code>
                        </div>
                      </div>
                      
                      {/* Weight */}
                      <div className="sm:col-span-3">
                        <label className="text-xs text-muted-foreground mb-1 block">Weight (kg)</label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={parcel.weight_kg || ''}
                            onChange={(e) => updateParcelWeight(parcel.id, parseFloat(e.target.value) || 0)}
                            className="h-10 pr-8"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            kg
                          </span>
                        </div>
                      </div>
                      
                      {/* Description */}
                      <div className="sm:col-span-4">
                        <label className="text-xs text-muted-foreground mb-1 block">Description (optional)</label>
                        <Input
                          placeholder="e.g., Electronics, Clothing"
                          value={parcel.description || ''}
                          onChange={(e) => updateParcelDescription(parcel.id, e.target.value)}
                          className="h-10"
                        />
                      </div>
                    </div>
                    
                    {/* Remove Button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => removeParcel(parcel.id)}
                      disabled={parcels.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Total Weight Display */}
              <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Weight className="w-4 h-4 text-primary" />
                    <span className="font-medium">Total Weight</span>
                    <span className="text-muted-foreground">({parcels.length} parcel{parcels.length !== 1 ? 's' : ''})</span>
                  </div>
                  <span className="text-2xl font-bold text-primary">{totalWeight.toFixed(2)} kg</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Details */}
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-heading text-lg">Additional Details</CardTitle>
                  <CardDescription>Optional shipment information</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shipment Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="General description of the shipment contents..."
                            className="min-h-[80px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="warehouse_location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Warehouse Location</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Rack A-12, Bay 3"
                            className="h-12"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Cost Summary Sidebar */}
        <div className="lg:col-span-1">
          <Card className="shadow-lg border-0 sticky top-24">
            <CardHeader className="pb-4">
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Cost Summary
              </CardTitle>
              <CardDescription>Auto-calculated from region pricing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Region Badge */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Origin Region</span>
                <Badge variant="outline" className="gap-1.5">
                  {regionInfo?.flag_emoji} {regionInfo?.name}
                </Badge>
              </div>

              {/* Parcel Count */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Parcels</span>
                <span className="font-semibold">{parcels.filter(p => p.weight_kg > 0).length}</span>
              </div>

              {/* Weight Display */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Total Weight</span>
                <span className="font-semibold">{totalWeight.toFixed(2)} kg</span>
              </div>

              {/* Rate Display */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Rate per kg</span>
                <span className="font-semibold">{currencySymbol}{pricing?.customer_rate_per_kg || 0}</span>
              </div>

              <Separator />

              {/* Cost Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Subtotal ({totalWeight.toFixed(2)} kg × {currencySymbol}{pricing?.customer_rate_per_kg || 0})
                  </span>
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
                  <span className="font-semibold">Estimated Total</span>
                  <span className={cn(
                    "text-2xl font-bold",
                    cost.total > 0 ? "text-primary" : "text-muted-foreground"
                  )}>
                    {currencySymbol}{cost.total.toFixed(2)}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Submit Button */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-14 text-lg font-semibold"
                    disabled={isSubmitting || pricingLoading || totalWeight <= 0}
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

              {/* Info Note */}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-xs text-muted-foreground">
                  Each parcel gets a unique barcode for tracking. Final invoice may vary based on actual measurements.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
