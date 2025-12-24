import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  DollarSign, 
  MapPin, 
  Edit2, 
  Loader2, 
  Phone, 
  Mail, 
  Building,
  Plus
} from 'lucide-react';
import { 
  useRegionPricing, 
  useAgentAddresses, 
  useUpdateRegionPricing,
  useUpdateAgentAddress,
  useCreateRegionPricing,
  useCreateAgentAddress,
  RegionPricing,
  AgentAddress 
} from '@/hooks/useRegionPricing';
import { REGIONS, CURRENCY_SYMBOLS } from '@/lib/constants';

const pricingSchema = z.object({
  customer_rate_per_kg: z.coerce.number().min(0, 'Rate must be positive'),
  agent_rate_per_kg: z.coerce.number().min(0, 'Rate must be positive'),
  handling_fee: z.coerce.number().min(0, 'Fee must be positive'),
  currency: z.string().min(1, 'Currency is required'),
});

const addressSchema = z.object({
  address_line1: z.string().min(1, 'Address is required'),
  address_line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  postal_code: z.string().optional(),
  country: z.string().min(1, 'Country is required'),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
});

type PricingFormValues = z.infer<typeof pricingSchema>;
type AddressFormValues = z.infer<typeof addressSchema>;

export function RegionManagement() {
  const { data: pricing, isLoading: pricingLoading } = useRegionPricing();
  const { data: addresses, isLoading: addressesLoading } = useAgentAddresses();
  const updatePricing = useUpdateRegionPricing();
  const updateAddress = useUpdateAgentAddress();
  const createPricing = useCreateRegionPricing();
  const createAddress = useCreateAgentAddress();

  const [editingPricing, setEditingPricing] = useState<RegionPricing | null>(null);
  const [editingAddress, setEditingAddress] = useState<{ region: string; address: AgentAddress | null } | null>(null);

  const pricingForm = useForm<PricingFormValues>({
    resolver: zodResolver(pricingSchema),
  });

  const addressForm = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
  });

  const openPricingDialog = (regionPricing: RegionPricing) => {
    setEditingPricing(regionPricing);
    pricingForm.reset({
      customer_rate_per_kg: regionPricing.customer_rate_per_kg,
      agent_rate_per_kg: regionPricing.agent_rate_per_kg,
      handling_fee: regionPricing.handling_fee || 0,
      currency: regionPricing.currency,
    });
  };

  const openAddressDialog = (region: string, address: AgentAddress | null) => {
    setEditingAddress({ region, address });
    if (address) {
      addressForm.reset({
        address_line1: address.address_line1,
        address_line2: address.address_line2 || '',
        city: address.city,
        postal_code: address.postal_code || '',
        country: address.country,
        contact_name: address.contact_name || '',
        contact_phone: address.contact_phone || '',
        contact_email: address.contact_email || '',
      });
    } else {
      addressForm.reset({
        address_line1: '',
        address_line2: '',
        city: '',
        postal_code: '',
        country: '',
        contact_name: '',
        contact_phone: '',
        contact_email: '',
      });
    }
  };

  const handlePricingSubmit = async (values: PricingFormValues) => {
    if (editingPricing) {
      await updatePricing.mutateAsync({
        id: editingPricing.id,
        ...values,
      });
      setEditingPricing(null);
    }
  };

  const handleAddressSubmit = async (values: AddressFormValues) => {
    if (editingAddress) {
      if (editingAddress.address) {
        await updateAddress.mutateAsync({
          id: editingAddress.address.id,
          ...values,
          contact_email: values.contact_email || null,
        });
      } else {
        await createAddress.mutateAsync({
          region: editingAddress.region as 'europe' | 'dubai' | 'china' | 'india',
          address_line1: values.address_line1,
          address_line2: values.address_line2 || undefined,
          city: values.city,
          postal_code: values.postal_code || undefined,
          country: values.country,
          contact_name: values.contact_name || undefined,
          contact_phone: values.contact_phone || undefined,
          contact_email: values.contact_email || undefined,
        });
      }
      setEditingAddress(null);
    }
  };

  const isLoading = pricingLoading || addressesLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  // Get pricing and address for each region
  const regionData = Object.entries(REGIONS).map(([key, region]) => ({
    key,
    ...region,
    pricing: pricing?.find(p => p.region === key),
    address: addresses?.find(a => a.region === key),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Region Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Manage pricing and warehouse addresses for each region
          </p>
        </div>
      </div>

      <Accordion type="single" collapsible className="space-y-3">
        {regionData.map((region) => {
          const currencySymbol = region.pricing 
            ? CURRENCY_SYMBOLS[region.pricing.currency] || region.pricing.currency
            : '$';

          return (
            <AccordionItem 
              key={region.key} 
              value={region.key}
              className="border rounded-lg bg-card shadow-sm overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-2xl">{region.flag}</span>
                  <div className="text-left">
                    <div className="font-semibold">{region.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {region.pricing 
                        ? `${currencySymbol}${region.pricing.customer_rate_per_kg}/kg`
                        : 'No pricing set'
                      }
                    </div>
                  </div>
                  {!region.pricing && (
                    <Badge variant="outline" className="ml-auto mr-4 text-amber-600 border-amber-300">
                      Setup Required
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Pricing Card */}
                  <Card className="border-0 shadow-none bg-muted/30">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-primary" />
                          Pricing
                        </CardTitle>
                        {region.pricing && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openPricingDialog(region.pricing!)}
                          >
                            <Edit2 className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {region.pricing ? (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Customer Rate</span>
                            <span className="font-medium">
                              {currencySymbol}{region.pricing.customer_rate_per_kg}/kg
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Agent Rate</span>
                            <span className="font-medium">
                              {currencySymbol}{region.pricing.agent_rate_per_kg}/kg
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Handling Fee</span>
                            <span className="font-medium">
                              {currencySymbol}{region.pricing.handling_fee || 0}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Currency</span>
                            <span className="font-medium">{region.pricing.currency}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-sm text-muted-foreground mb-2">
                            No pricing configured
                          </p>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setEditingPricing({
                                id: '',
                                region: region.key as any,
                                customer_rate_per_kg: 0,
                                agent_rate_per_kg: 0,
                                handling_fee: 0,
                                currency: 'USD',
                                created_at: null,
                                updated_at: null,
                              });
                              pricingForm.reset({
                                customer_rate_per_kg: 0,
                                agent_rate_per_kg: 0,
                                handling_fee: 0,
                                currency: 'USD',
                              });
                            }}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Set Pricing
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Address Card */}
                  <Card className="border-0 shadow-none bg-muted/30">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary" />
                          Warehouse Address
                        </CardTitle>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openAddressDialog(region.key, region.address || null)}
                        >
                          {region.address ? (
                            <>
                              <Edit2 className="w-3 h-3 mr-1" />
                              Edit
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3 mr-1" />
                              Add
                            </>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {region.address ? (
                        <div className="space-y-2 text-sm">
                          <div className="flex items-start gap-2">
                            <Building className="w-4 h-4 text-muted-foreground mt-0.5" />
                            <div>
                              <div>{region.address.address_line1}</div>
                              {region.address.address_line2 && (
                                <div>{region.address.address_line2}</div>
                              )}
                              <div>
                                {region.address.city}
                                {region.address.postal_code && `, ${region.address.postal_code}`}
                              </div>
                              <div>{region.address.country}</div>
                            </div>
                          </div>
                          {region.address.contact_name && (
                            <div className="flex items-center gap-2 pt-2 border-t">
                              <span className="text-muted-foreground">Contact:</span>
                              <span>{region.address.contact_name}</span>
                            </div>
                          )}
                          {region.address.contact_phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              <span>{region.address.contact_phone}</span>
                            </div>
                          )}
                          {region.address.contact_email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-3 h-3 text-muted-foreground" />
                              <span>{region.address.contact_email}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-sm text-muted-foreground">
                            No address configured
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Pricing Edit Dialog */}
      <Dialog open={!!editingPricing} onOpenChange={(open) => !open && setEditingPricing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPricing?.id ? 'Edit' : 'Set'} Pricing - {editingPricing && REGIONS[editingPricing.region]?.label}
            </DialogTitle>
            <DialogDescription>
              Configure the shipping rates for this region.
            </DialogDescription>
          </DialogHeader>
          <Form {...pricingForm}>
            <form onSubmit={pricingForm.handleSubmit(handlePricingSubmit)} className="space-y-4">
              <FormField
                control={pricingForm.control}
                name="customer_rate_per_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Rate (per kg)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={pricingForm.control}
                name="agent_rate_per_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent Rate (per kg)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={pricingForm.control}
                name="handling_fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Handling Fee (flat)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={pricingForm.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <Input placeholder="USD" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditingPricing(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updatePricing.isPending || createPricing.isPending}>
                  {(updatePricing.isPending || createPricing.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Save Pricing
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Address Edit Dialog */}
      <Dialog open={!!editingAddress} onOpenChange={(open) => !open && setEditingAddress(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingAddress?.address ? 'Edit' : 'Add'} Warehouse Address - {editingAddress && REGIONS[editingAddress.region as keyof typeof REGIONS]?.label}
            </DialogTitle>
            <DialogDescription>
              Set the warehouse address that customers will ship to for this region.
            </DialogDescription>
          </DialogHeader>
          <Form {...addressForm}>
            <form onSubmit={addressForm.handleSubmit(handleAddressSubmit)} className="space-y-4">
              <FormField
                control={addressForm.control}
                name="address_line1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 1</FormLabel>
                    <FormControl>
                      <Input placeholder="Street address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addressForm.control}
                name="address_line2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 2 (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Apt, suite, unit, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addressForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addressForm.control}
                  name="postal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Postal code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={addressForm.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="Country" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-medium mb-3">Contact Information (Optional)</h4>
                <div className="space-y-4">
                  <FormField
                    control={addressForm.control}
                    name="contact_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Contact person" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={addressForm.control}
                      name="contact_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 234 567 8900" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addressForm.control}
                      name="contact_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="email@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditingAddress(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateAddress.isPending || createAddress.isPending}>
                  {(updateAddress.isPending || createAddress.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Save Address
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
