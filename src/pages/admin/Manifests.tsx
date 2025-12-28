// Admin Manifest Review Page - Review agent uploads, apply pricing, generate invoices
import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Package, Loader2, FileText, DollarSign, CheckCircle2, 
  Users, Scale, Globe, Receipt
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CURRENCY_SYMBOLS } from '@/lib/constants';

const REGION_LABELS: Record<string, string> = {
  europe: '🇬🇧 Europe/UK',
  dubai: '🇦🇪 Dubai',
  china: '🇨🇳 China',
  india: '🇮🇳 India',
};

// Fetch shipments pending pricing (no rate_per_kg set)
function useManifestShipments() {
  return useQuery({
    queryKey: ['manifest-shipments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          *,
          parcels(id, barcode, weight_kg, description),
          cargo_batches(batch_number, arrival_week_start, arrival_week_end)
        `)
        .eq('is_draft', false)
        .is('rate_per_kg', null) // No pricing yet
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export default function AdminManifestsPage() {
  const queryClient = useQueryClient();
  const { data: shipments = [], isLoading } = useManifestShipments();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterRegion, setFilterRegion] = useState<string>('all');
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  const [ratePerKg, setRatePerKg] = useState<number>(0);
  const [currency, setCurrency] = useState<string>('USD');

  // Filter shipments
  const filteredShipments = useMemo(() => {
    return shipments.filter(s => {
      if (filterRegion !== 'all' && s.origin_region !== filterRegion) return false;
      return true;
    });
  }, [shipments, filterRegion]);

  // Group by batch
  const groupedByBatch = useMemo(() => {
    const groups: Record<string, typeof filteredShipments> = {};
    filteredShipments.forEach(s => {
      const batchKey = s.cargo_batches?.batch_number || 'No Batch';
      if (!groups[batchKey]) groups[batchKey] = [];
      groups[batchKey].push(s);
    });
    return groups;
  }, [filteredShipments]);

  // Toggle selection
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Select all in a batch
  const selectBatch = (batchShipments: typeof filteredShipments) => {
    const newSet = new Set(selectedIds);
    const allSelected = batchShipments.every(s => selectedIds.has(s.id));
    
    if (allSelected) {
      batchShipments.forEach(s => newSet.delete(s.id));
    } else {
      batchShipments.forEach(s => newSet.add(s.id));
    }
    setSelectedIds(newSet);
  };

  // Apply pricing mutation
  const applyPricingMutation = useMutation({
    mutationFn: async ({ ids, rate, curr }: { ids: string[]; rate: number; curr: string }) => {
      // Update shipments with pricing
      const { error: updateError } = await supabase
        .from('shipments')
        .update({
          rate_per_kg: rate,
          total_revenue: 0, // Will be calculated per shipment
        })
        .in('id', ids);

      if (updateError) throw updateError;

      // Create invoices for each shipment
      for (const id of ids) {
        const shipment = shipments.find(s => s.id === id);
        if (!shipment) continue;

        const amount = shipment.total_weight_kg * rate;
        const invoiceNumber = `INV-${format(new Date(), 'yyyyMM')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

        // Update shipment revenue
        await supabase
          .from('shipments')
          .update({ total_revenue: amount })
          .eq('id', id);

        // Create invoice
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            invoice_number: invoiceNumber,
            shipment_id: id,
            amount,
            currency: curr,
            invoice_type: 'shipping',
            status: 'pending',
          })
          .select()
          .single();

        if (invoiceError) throw invoiceError;

        // Create invoice item
        await supabase.from('invoice_items').insert({
          invoice_id: invoice.id,
          item_type: 'freight',
          description: `Freight: ${shipment.customer_name} - ${shipment.total_weight_kg}kg`,
          quantity: shipment.total_weight_kg,
          unit_price: rate,
          amount,
          currency: curr,
          weight_kg: shipment.total_weight_kg,
        });
      }

      return { count: ids.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['manifest-shipments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast.success(`Pricing applied and ${data.count} invoice(s) created!`);
      setSelectedIds(new Set());
      setPricingDialogOpen(false);
      setRatePerKg(0);
    },
    onError: (error: any) => {
      toast.error(`Failed to apply pricing: ${error.message}`);
    },
  });

  const handleApplyPricing = () => {
    if (selectedIds.size === 0) {
      toast.error('Please select shipments first');
      return;
    }
    if (!ratePerKg || ratePerKg <= 0) {
      toast.error('Please enter a valid rate per kg');
      return;
    }
    applyPricingMutation.mutate({
      ids: Array.from(selectedIds),
      rate: ratePerKg,
      curr: currency,
    });
  };

  // Stats
  const stats = useMemo(() => {
    const selected = filteredShipments.filter(s => selectedIds.has(s.id));
    return {
      totalPending: filteredShipments.length,
      selectedCount: selected.length,
      selectedWeight: selected.reduce((sum, s) => sum + (s.total_weight_kg || 0), 0),
      estimatedRevenue: selected.reduce((sum, s) => sum + ((s.total_weight_kg || 0) * ratePerKg), 0),
    };
  }, [filteredShipments, selectedIds, ratePerKg]);

  if (isLoading) {
    return (
      <AdminLayout title="Manifests" subtitle="Review agent uploads and apply pricing">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Manifests" subtitle="Review agent uploads and apply pricing">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalPending}</p>
                <p className="text-sm text-muted-foreground">Pending Review</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.selectedCount}</p>
                <p className="text-sm text-muted-foreground">Selected</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Scale className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.selectedWeight.toFixed(1)} kg</p>
                <p className="text-sm text-muted-foreground">Selected Weight</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {CURRENCY_SYMBOLS[currency] || currency}{stats.estimatedRevenue.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Est. Revenue</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Actions */}
        <Card>
          <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Select value={filterRegion} onValueChange={setFilterRegion}>
                <SelectTrigger className="w-[180px]">
                  <Globe className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Regions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {Object.entries(REGION_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 mr-4">
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Rate/kg"
                  value={ratePerKg || ''}
                  onChange={(e) => setRatePerKg(parseFloat(e.target.value) || 0)}
                  className="w-24"
                />
              </div>
              <Button
                onClick={() => setPricingDialogOpen(true)}
                disabled={selectedIds.size === 0 || !ratePerKg}
                className="gap-2"
              >
                <Receipt className="w-4 h-4" />
                Apply Pricing ({selectedIds.size})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Shipments by Batch */}
        {Object.entries(groupedByBatch).length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">All Caught Up!</h3>
              <p className="text-muted-foreground mt-1">
                No pending manifests to review. All shipments have been priced.
              </p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedByBatch).map(([batchNumber, batchShipments]) => {
            const batch = batchShipments[0]?.cargo_batches;
            const allSelected = batchShipments.every(s => selectedIds.has(s.id));
            const someSelected = batchShipments.some(s => selectedIds.has(s.id));
            const batchWeight = batchShipments.reduce((sum, s) => sum + (s.total_weight_kg || 0), 0);

            return (
              <Card key={batchNumber}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={() => selectBatch(batchShipments)}
                        className={someSelected && !allSelected ? 'opacity-50' : ''}
                      />
                      <div>
                        <CardTitle className="text-base font-semibold">{batchNumber}</CardTitle>
                        {batch && (
                          <CardDescription>
                            {format(new Date(batch.arrival_week_start), 'MMM d')} - {format(new Date(batch.arrival_week_end), 'MMM d, yyyy')}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{batchShipments.length} shipments</span>
                      <span>{batchWeight.toFixed(1)} kg</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="w-10 p-3"></th>
                          <th className="text-left p-3 font-medium">Tracking</th>
                          <th className="text-left p-3 font-medium">Customer</th>
                          <th className="text-left p-3 font-medium">Description</th>
                          <th className="text-left p-3 font-medium">Region</th>
                          <th className="text-right p-3 font-medium">Weight</th>
                          <th className="text-right p-3 font-medium">Est. Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {batchShipments.map((shipment) => {
                          const isSelected = selectedIds.has(shipment.id);
                          const estAmount = (shipment.total_weight_kg || 0) * ratePerKg;
                          
                          return (
                            <tr 
                              key={shipment.id}
                              className={cn(
                                "hover:bg-muted/30 cursor-pointer",
                                isSelected && "bg-primary/5"
                              )}
                              onClick={() => toggleSelection(shipment.id)}
                            >
                              <td className="p-3">
                                <Checkbox 
                                  checked={isSelected}
                                  onCheckedChange={() => toggleSelection(shipment.id)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </td>
                              <td className="p-3 font-mono text-xs">
                                {shipment.tracking_number}
                              </td>
                              <td className="p-3 font-medium">
                                {shipment.customer_name || '—'}
                              </td>
                              <td className="p-3 text-muted-foreground">
                                {shipment.description || '—'}
                              </td>
                              <td className="p-3">
                                <Badge variant="outline" className="text-xs">
                                  {REGION_LABELS[shipment.origin_region] || shipment.origin_region}
                                </Badge>
                              </td>
                              <td className="p-3 text-right font-medium">
                                {shipment.total_weight_kg?.toFixed(2)} kg
                              </td>
                              <td className="p-3 text-right">
                                {ratePerKg > 0 ? (
                                  <span className="text-primary font-semibold">
                                    {CURRENCY_SYMBOLS[currency] || currency}{estAmount.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Pricing Confirmation Dialog */}
      <Dialog open={pricingDialogOpen} onOpenChange={setPricingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Pricing & Create Invoices</DialogTitle>
            <DialogDescription>
              This will set the rate for {selectedIds.size} shipment(s) and create invoices.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Shipments</Label>
                <p className="text-2xl font-bold">{selectedIds.size}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Total Weight</Label>
                <p className="text-2xl font-bold">{stats.selectedWeight.toFixed(2)} kg</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Rate per kg</Label>
                <p className="text-2xl font-bold">
                  {CURRENCY_SYMBOLS[currency] || currency}{ratePerKg.toFixed(2)}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Total Revenue</Label>
                <p className="text-2xl font-bold text-primary">
                  {CURRENCY_SYMBOLS[currency] || currency}{stats.estimatedRevenue.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPricingDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleApplyPricing}
              disabled={applyPricingMutation.isPending}
            >
              {applyPricingMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Receipt className="w-4 h-4 mr-2" />
                  Create {selectedIds.size} Invoice(s)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
