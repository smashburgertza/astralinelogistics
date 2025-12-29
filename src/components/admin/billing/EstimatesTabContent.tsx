import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { 
  Plus, FileText, ArrowRight, Trash2, CheckCircle, XCircle, Clock,
  Package, Truck
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  useEstimates,
  useCreateEstimate,
  useUpdateEstimateStatus,
  useConvertEstimateToInvoice,
  useDeleteEstimate,
  type EstimateType,
} from '@/hooks/useEstimates';
import { useCustomers, useShipments } from '@/hooks/useShipments';
import { useRegionPricing } from '@/hooks/useRegionPricing';
import { useExchangeRates, convertToTZS } from '@/hooks/useExchangeRates';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { useActiveRegions, regionsToMap } from '@/hooks/useRegions';

const estimateSchema = z.object({
  estimate_type: z.enum(['shipping', 'purchase_shipping']).default('shipping'),
  customer_id: z.string().min(1, 'Customer is required'),
  shipment_id: z.string().optional(),
  origin_region: z.string().min(1, 'Origin region is required'),
  weight_kg: z.coerce.number().min(0.1, 'Weight must be greater than 0'),
  rate_per_kg: z.coerce.number().min(0, 'Rate is required'),
  handling_fee: z.coerce.number().min(0, 'Handling fee is required'),
  currency: z.string().default('USD'),
  notes: z.string().optional(),
  valid_days: z.coerce.number().min(1).default(30),
  product_cost: z.coerce.number().min(0).default(0),
  purchase_fee: z.coerce.number().min(0).default(0),
});

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle },
  converted: { label: 'Converted', color: 'bg-blue-100 text-blue-800', icon: FileText },
};

export function EstimatesTabContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | EstimateType>('all');
  const { data: estimates, isLoading } = useEstimates();
  const { data: customers } = useCustomers();
  const { data: shipments } = useShipments();
  const { data: pricing } = useRegionPricing();
  const { data: exchangeRates } = useExchangeRates();
  const { data: regions } = useActiveRegions();
  const regionsMap = regionsToMap(regions);
  const createEstimate = useCreateEstimate();
  const updateStatus = useUpdateEstimateStatus();
  const convertToInvoice = useConvertEstimateToInvoice();
  const deleteEstimate = useDeleteEstimate();

  const filteredEstimates = useMemo(() => {
    if (!estimates) return [];
    if (typeFilter === 'all') return estimates;
    return estimates.filter(e => e.estimate_type === typeFilter);
  }, [estimates, typeFilter]);

  const form = useForm({
    resolver: zodResolver(estimateSchema),
    defaultValues: {
      estimate_type: 'shipping' as EstimateType,
      customer_id: '',
      shipment_id: '',
      origin_region: '',
      weight_kg: 0,
      rate_per_kg: 0,
      handling_fee: 0,
      currency: 'USD',
      notes: '',
      valid_days: 30,
      product_cost: 0,
      purchase_fee: 0,
    },
  });

  const estimateType = form.watch('estimate_type');
  const selectedRegion = form.watch('origin_region');
  const selectedShipment = form.watch('shipment_id');
  const weightKg = form.watch('weight_kg');
  const ratePerKg = form.watch('rate_per_kg');
  const handlingFee = form.watch('handling_fee');
  const productCost = form.watch('product_cost');
  const purchaseFee = form.watch('purchase_fee');

  // Auto-fill rate when region changes
  useMemo(() => {
    if (selectedRegion && pricing) {
      const regionPricing = pricing.find(p => p.region === selectedRegion);
      if (regionPricing) {
        form.setValue('rate_per_kg', regionPricing.customer_rate_per_kg);
        form.setValue('handling_fee', regionPricing.handling_fee || 0);
      }
    }
  }, [selectedRegion, pricing]);

  // Auto-fill weight when shipment is selected
  useMemo(() => {
    if (selectedShipment && shipments) {
      const shipment = shipments.find(s => s.id === selectedShipment);
      if (shipment) {
        form.setValue('weight_kg', shipment.total_weight_kg);
        form.setValue('origin_region', shipment.origin_region);
        if (shipment.customer_id) {
          form.setValue('customer_id', shipment.customer_id);
        }
      }
    }
  }, [selectedShipment, shipments]);

  const calculatedTotal = useMemo(() => {
    const shippingSubtotal = weightKg * ratePerKg;
    const totalProductCost = estimateType === 'purchase_shipping' ? productCost : 0;
    const totalPurchaseFee = estimateType === 'purchase_shipping' ? purchaseFee : 0;
    return shippingSubtotal + handlingFee + totalProductCost + totalPurchaseFee;
  }, [weightKg, ratePerKg, handlingFee, productCost, purchaseFee, estimateType]);

  const onSubmit = async (data: z.infer<typeof estimateSchema>) => {
    await createEstimate.mutateAsync({
      customer_id: data.customer_id,
      shipment_id: data.shipment_id || undefined,
      origin_region: data.origin_region,
      weight_kg: data.weight_kg,
      rate_per_kg: data.rate_per_kg,
      handling_fee: data.handling_fee,
      currency: data.currency,
      notes: data.notes,
      valid_days: data.valid_days,
      estimate_type: data.estimate_type as EstimateType,
      product_cost: data.estimate_type === 'purchase_shipping' ? data.product_cost : 0,
      purchase_fee: data.estimate_type === 'purchase_shipping' ? data.purchase_fee : 0,
    });
    form.reset();
    setDialogOpen(false);
  };

  const getStatusBadge = (status: keyof typeof STATUS_CONFIG) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={`${config.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Estimate
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Estimate</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Estimate Type Selector */}
                <FormField
                  control={form.control}
                  name="estimate_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimate Type</FormLabel>
                      <div className="grid grid-cols-2 gap-3">
                        <div
                          className={`cursor-pointer rounded-lg border-2 p-3 transition-all ${
                            field.value === 'shipping'
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-muted-foreground/50'
                          }`}
                          onClick={() => field.onChange('shipping')}
                        >
                          <div className="flex items-center gap-2">
                            <Truck className="h-5 w-5 text-primary" />
                            <span className="font-medium">Shipping Only</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Freight and handling charges
                          </p>
                        </div>
                        <div
                          className={`cursor-pointer rounded-lg border-2 p-3 transition-all ${
                            field.value === 'purchase_shipping'
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-muted-foreground/50'
                          }`}
                          onClick={() => field.onChange('purchase_shipping')}
                        >
                          <div className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-amber-500" />
                            <span className="font-medium">Purchase + Shipping</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Product cost plus freight
                          </p>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="shipment_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Shipment (optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select shipment to auto-fill" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {shipments?.map((shipment) => (
                            <SelectItem key={shipment.id} value={shipment.id}>
                              {shipment.tracking_number} ({shipment.total_weight_kg} kg)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customer_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers?.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="origin_region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Origin Region</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select region" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(regions || []).map((region) => (
                              <SelectItem key={region.code} value={region.code}>
                                {region.flag_emoji} {region.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="weight_kg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight (kg)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="rate_per_kg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rate/kg</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="handling_fee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Handling Fee</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="AED">AED</SelectItem>
                            <SelectItem value="TZS">TZS</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Purchase Cost Fields - Only for purchase_shipping */}
                {estimateType === 'purchase_shipping' && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <FormField
                      control={form.control}
                      name="product_cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Cost</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="purchase_fee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purchase/Sourcing Fee</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <div className="p-4 bg-muted rounded-lg">
                  {estimateType === 'purchase_shipping' && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span>Product Cost</span>
                        <span>{CURRENCY_SYMBOLS[form.watch('currency')] || '$'}{productCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span>Purchase Fee</span>
                        <span>{CURRENCY_SYMBOLS[form.watch('currency')] || '$'}{purchaseFee.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-sm mt-1">
                    <span>Shipping ({weightKg} kg × {ratePerKg})</span>
                    <span>{CURRENCY_SYMBOLS[form.watch('currency')] || '$'}{(weightKg * ratePerKg).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span>Handling Fee</span>
                    <span>{CURRENCY_SYMBOLS[form.watch('currency')] || '$'}{handlingFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold mt-2 pt-2 border-t">
                    <span>Total</span>
                    <span>{CURRENCY_SYMBOLS[form.watch('currency')] || '$'}{calculatedTotal.toFixed(2)}</span>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="valid_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valid For (days)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional notes..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={createEstimate.isPending}>
                  Create Estimate
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Estimates</CardTitle>
              <CardDescription>Manage and convert estimates to invoices</CardDescription>
            </div>
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as 'all' | EstimateType)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="shipping">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4" /> Shipping Only
                  </div>
                </SelectItem>
                <SelectItem value="purchase_shipping">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" /> Purchase + Shipping
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estimate #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead className="w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEstimates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    {estimates?.length === 0 ? 'No estimates yet. Create your first estimate.' : 'No estimates match the selected filter.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredEstimates.map((estimate) => (
                  <TableRow key={estimate.id}>
                    <TableCell className="font-mono font-medium">
                      {estimate.estimate_number}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={estimate.estimate_type === 'purchase_shipping' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}>
                        {estimate.estimate_type === 'purchase_shipping' ? (
                          <><Package className="h-3 w-3 mr-1" /> Purchase</>
                        ) : (
                          <><Truck className="h-3 w-3 mr-1" /> Shipping</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {estimate.customers?.name || '-'}
                    </TableCell>
                    <TableCell>
                      {regionsMap[estimate.origin_region]?.name || estimate.origin_region}
                    </TableCell>
                    <TableCell>{estimate.weight_kg} kg</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-semibold">
                          {CURRENCY_SYMBOLS[estimate.currency] || '$'}{estimate.total.toFixed(2)}
                        </span>
                        {estimate.currency !== 'TZS' && exchangeRates && (
                          <p className="text-xs text-muted-foreground">
                            ≈ TZS {convertToTZS(estimate.total, estimate.currency, exchangeRates).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(estimate.status as keyof typeof STATUS_CONFIG)}
                    </TableCell>
                    <TableCell>
                      {estimate.valid_until ? format(new Date(estimate.valid_until), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {estimate.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus.mutate({ id: estimate.id, status: 'approved' })}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus.mutate({ id: estimate.id, status: 'rejected' })}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {(estimate.status === 'pending' || estimate.status === 'approved') && (
                          <Button
                            size="sm"
                            onClick={() => convertToInvoice.mutate(estimate.id)}
                            disabled={convertToInvoice.isPending}
                          >
                            <ArrowRight className="h-4 w-4 mr-1" />
                            Invoice
                          </Button>
                        )}
                        {estimate.status !== 'converted' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Estimate?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteEstimate.mutate(estimate.id)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
