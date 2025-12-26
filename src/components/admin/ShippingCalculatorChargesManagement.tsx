import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Loader2, DollarSign, Percent, PoundSterling, Copy } from 'lucide-react';
import { toast } from 'sonner';
import {
  useShippingCalculatorCharges,
  useCreateShippingCalculatorCharge,
  useUpdateShippingCalculatorCharge,
  useDeleteShippingCalculatorCharge,
  ShippingCalculatorCharge,
  REGION_CURRENCIES,
  REGION_LABELS,
} from '@/hooks/useShippingCalculatorCharges';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type AgentRegion = Database['public']['Enums']['agent_region'];

const REGIONS: AgentRegion[] = ['usa', 'uk', 'europe', 'dubai', 'china', 'india'];

const APPLIES_TO_OPTIONS = [
  { value: 'shipping_cost', label: 'Shipping Cost' },
  { value: 'cif_value', label: 'CIF Value' },
  { value: 'order_total', label: 'Order Total' },
];

interface ChargeFormData {
  charge_key: string;
  charge_name: string;
  charge_type: 'fixed' | 'percentage';
  charge_value: number;
  applies_to: string;
  description: string;
  is_active: boolean;
  display_order: number;
  region: AgentRegion;
  currency: string;
}

export function ShippingCalculatorChargesManagement() {
  const queryClient = useQueryClient();
  const { data: charges, isLoading } = useShippingCalculatorCharges();
  const createCharge = useCreateShippingCalculatorCharge();
  const updateCharge = useUpdateShippingCalculatorCharge();
  const deleteCharge = useDeleteShippingCalculatorCharge();

  const [selectedRegion, setSelectedRegion] = useState<AgentRegion>('usa');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const [copyTargetRegion, setCopyTargetRegion] = useState<AgentRegion | ''>('');
  const [isCopying, setIsCopying] = useState(false);
  const [editingCharge, setEditingCharge] = useState<ShippingCalculatorCharge | null>(null);

  const getDefaultFormData = (region: AgentRegion): ChargeFormData => ({
    charge_key: '',
    charge_name: '',
    charge_type: 'fixed',
    charge_value: 0,
    applies_to: 'order_total',
    description: '',
    is_active: true,
    display_order: 0,
    region,
    currency: REGION_CURRENCIES[region],
  });

  const [formData, setFormData] = useState<ChargeFormData>(getDefaultFormData('usa'));

  const handleRegionChange = (region: AgentRegion) => {
    setSelectedRegion(region);
  };

  const handleOpenCreate = () => {
    setFormData(getDefaultFormData(selectedRegion));
    setIsCreateOpen(true);
  };

  const handleCopyToRegion = async () => {
    if (!copyTargetRegion) {
      toast.error('Please select a target region');
      return;
    }

    const sourceCharges = charges?.filter(c => c.region === selectedRegion) || [];
    if (sourceCharges.length === 0) {
      toast.error('No charges to copy from this region');
      return;
    }

    setIsCopying(true);
    try {
      const targetCurrency = REGION_CURRENCIES[copyTargetRegion];
      const newCharges = sourceCharges.map(charge => ({
        charge_key: charge.charge_key,
        charge_name: charge.charge_name,
        charge_type: charge.charge_type,
        charge_value: charge.charge_value,
        applies_to: charge.applies_to,
        description: charge.description,
        is_active: charge.is_active,
        display_order: charge.display_order,
        region: copyTargetRegion,
        currency: targetCurrency,
      }));

      const { error } = await supabase
        .from('shipping_calculator_charges')
        .insert(newCharges);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['shipping-calculator-charges'] });
      toast.success(`Copied ${sourceCharges.length} charges to ${REGION_LABELS[copyTargetRegion]}`);
      setIsCopyOpen(false);
      setCopyTargetRegion('');
    } catch (error) {
      toast.error('Failed to copy charges');
    } finally {
      setIsCopying(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.charge_key || !formData.charge_name) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await createCharge.mutateAsync(formData);
      toast.success('Charge created successfully');
      setIsCreateOpen(false);
      setFormData(getDefaultFormData(selectedRegion));
    } catch (error) {
      toast.error('Failed to create charge');
    }
  };

  const handleUpdate = async () => {
    if (!editingCharge) return;

    try {
      await updateCharge.mutateAsync({
        id: editingCharge.id,
        ...formData,
      });
      toast.success('Charge updated successfully');
      setEditingCharge(null);
      setFormData(getDefaultFormData(selectedRegion));
    } catch (error) {
      toast.error('Failed to update charge');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this charge?')) return;

    try {
      await deleteCharge.mutateAsync(id);
      toast.success('Charge deleted successfully');
    } catch (error) {
      toast.error('Failed to delete charge');
    }
  };

  const handleToggleActive = async (charge: ShippingCalculatorCharge) => {
    try {
      await updateCharge.mutateAsync({
        id: charge.id,
        is_active: !charge.is_active,
      });
      toast.success(`Charge ${charge.is_active ? 'disabled' : 'enabled'}`);
    } catch (error) {
      toast.error('Failed to update charge');
    }
  };

  const openEditDialog = (charge: ShippingCalculatorCharge) => {
    setEditingCharge(charge);
    setFormData({
      charge_key: charge.charge_key,
      charge_name: charge.charge_name,
      charge_type: charge.charge_type,
      charge_value: charge.charge_value,
      applies_to: charge.applies_to,
      description: charge.description || '',
      is_active: charge.is_active,
      display_order: charge.display_order,
      region: charge.region,
      currency: charge.currency,
    });
  };

  const getCurrencySymbol = (currency: string) => {
    return currency === 'GBP' ? '£' : '$';
  };

  const CurrencyIcon = ({ currency }: { currency: string }) => {
    return currency === 'GBP' ? (
      <PoundSterling className="h-4 w-4 text-muted-foreground" />
    ) : (
      <DollarSign className="h-4 w-4 text-muted-foreground" />
    );
  };

  const ChargeForm = ({ onSubmit, isSubmitting }: { onSubmit: () => void; isSubmitting: boolean }) => {
    const currency = REGION_CURRENCIES[formData.region];
    const currencySymbol = getCurrencySymbol(currency);

    return (
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="charge_key">Charge Key *</Label>
            <Input
              id="charge_key"
              value={formData.charge_key}
              onChange={(e) => setFormData({ ...formData, charge_key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
              placeholder="e.g. inspection_fee"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="charge_name">Display Name *</Label>
            <Input
              id="charge_name"
              value={formData.charge_name}
              onChange={(e) => setFormData({ ...formData, charge_name: e.target.value })}
              placeholder="e.g. Inspection Fee"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="charge_type">Charge Type</Label>
            <Select
              value={formData.charge_type}
              onValueChange={(value: 'fixed' | 'percentage') => setFormData({ ...formData, charge_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed Amount ({currencySymbol})</SelectItem>
                <SelectItem value="percentage">Percentage (%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="charge_value">Value</Label>
            <div className="relative">
              <Input
                id="charge_value"
                type="number"
                step="0.01"
                min="0"
                value={formData.charge_value}
                onChange={(e) => setFormData({ ...formData, charge_value: parseFloat(e.target.value) || 0 })}
                className="pl-8"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {formData.charge_type === 'fixed' ? currencySymbol : '%'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="applies_to">Applies To</Label>
            <Select
              value={formData.applies_to}
              onValueChange={(value) => setFormData({ ...formData, applies_to: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPLIES_TO_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="display_order">Display Order</Label>
            <Input
              id="display_order"
              type="number"
              min="0"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of this charge"
          />
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
          <Label htmlFor="is_active">Active</Label>
        </div>

        <DialogFooter>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editingCharge ? 'Update Charge' : 'Create Charge'}
          </Button>
        </DialogFooter>
      </div>
    );
  };

  const regionCharges = charges?.filter(c => c.region === selectedRegion) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Additional Shipping Charges</CardTitle>
            <CardDescription>
              Configure region-specific fees like inspection, agency fees, etc.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={isCopyOpen} onOpenChange={setIsCopyOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={regionCharges.length === 0}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to Region
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Copy Charges to Another Region</DialogTitle>
                  <DialogDescription>
                    Copy all {regionCharges.length} charges from {REGION_LABELS[selectedRegion]} to another region. 
                    Values will be copied as-is but currency will be updated to match the target region.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Target Region</Label>
                    <Select
                      value={copyTargetRegion}
                      onValueChange={(v) => setCopyTargetRegion(v as AgentRegion)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select target region" />
                      </SelectTrigger>
                      <SelectContent>
                        {REGIONS.filter(r => r !== selectedRegion).map((region) => (
                          <SelectItem key={region} value={region}>
                            {REGION_LABELS[region]} ({REGION_CURRENCIES[region]})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {copyTargetRegion && (
                    <p className="text-sm text-muted-foreground">
                      This will create {regionCharges.length} new charges in {REGION_LABELS[copyTargetRegion]} with {REGION_CURRENCIES[copyTargetRegion]} currency.
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCopyOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCopyToRegion} disabled={!copyTargetRegion || isCopying}>
                    {isCopying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Copy Charges
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Charge
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    Create New Charge for {REGION_LABELS[selectedRegion]}
                  </DialogTitle>
                  <DialogDescription>
                    Add a new charge in {REGION_CURRENCIES[selectedRegion]} for shipments from {REGION_LABELS[selectedRegion]}
                  </DialogDescription>
                </DialogHeader>
                <ChargeForm onSubmit={handleCreate} isSubmitting={createCharge.isPending} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedRegion} onValueChange={(v) => handleRegionChange(v as AgentRegion)}>
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            {REGIONS.map((region) => {
              const count = charges?.filter(c => c.region === region).length || 0;
              return (
                <TabsTrigger key={region} value={region} className="gap-2">
                  {REGION_LABELS[region]}
                  <Badge variant="secondary" className="text-xs">
                    {REGION_CURRENCIES[region]}
                  </Badge>
                  {count > 0 && (
                    <Badge variant="outline" className="text-xs ml-1">
                      {count}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {REGIONS.map((region) => (
            <TabsContent key={region} value={region}>
              {regionCharges.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Applies To</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {regionCharges.map((charge) => (
                      <TableRow key={charge.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{charge.charge_name}</p>
                            <p className="text-xs text-muted-foreground">{charge.charge_key}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {charge.charge_type === 'fixed' ? (
                              <CurrencyIcon currency={charge.currency} />
                            ) : (
                              <Percent className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="capitalize">{charge.charge_type}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {charge.charge_type === 'fixed' 
                            ? `${getCurrencySymbol(charge.currency)}${charge.charge_value}` 
                            : `${charge.charge_value}%`}
                        </TableCell>
                        <TableCell className="capitalize">
                          {charge.applies_to.replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={charge.is_active}
                            onCheckedChange={() => handleToggleActive(charge)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Dialog open={editingCharge?.id === charge.id} onOpenChange={(open) => !open && setEditingCharge(null)}>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(charge)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit Charge</DialogTitle>
                                  <DialogDescription>
                                    Update the charge details for {REGION_LABELS[charge.region]}
                                  </DialogDescription>
                                </DialogHeader>
                                <ChargeForm onSubmit={handleUpdate} isSubmitting={updateCharge.isPending} />
                              </DialogContent>
                            </Dialog>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(charge.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  <p>No charges configured for {REGION_LABELS[region]}.</p>
                  <p className="text-sm mt-1">Click "Create Charge" to add fees in {REGION_CURRENCIES[region]}.</p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
