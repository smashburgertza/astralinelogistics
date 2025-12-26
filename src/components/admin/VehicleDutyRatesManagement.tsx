import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Edit2, Trash2, Percent, DollarSign, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface VehicleDutyRate {
  id: string;
  rate_key: string;
  rate_name: string;
  rate_type: 'percentage' | 'fixed';
  rate_value: number;
  applies_to: string;
  engine_cc_min: number | null;
  engine_cc_max: number | null;
  vehicle_age_min: number | null;
  vehicle_category: string | null;
  display_order: number;
  is_active: boolean;
  description: string | null;
}

const APPLIES_TO_OPTIONS = [
  { value: 'cif_value', label: 'CIF Value' },
  { value: 'dutiable_value', label: 'Dutiable Value (CIF + Import Duty + Excise)' },
  { value: 'fixed', label: 'Fixed Amount' },
];

const VEHICLE_CATEGORIES = [
  { value: 'non_utility', label: 'Non-Utility Vehicle' },
  { value: 'utility', label: 'Utility Vehicle' },
];

export function VehicleDutyRatesManagement() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<VehicleDutyRate | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    rate_key: '',
    rate_name: '',
    rate_type: 'percentage' as 'percentage' | 'fixed',
    rate_value: 0,
    applies_to: 'cif_value',
    engine_cc_min: '',
    engine_cc_max: '',
    vehicle_age_min: '',
    vehicle_category: '',
    display_order: 0,
    is_active: true,
    description: '',
  });

  const { data: rates = [], isLoading } = useQuery({
    queryKey: ['vehicle-duty-rates-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_duty_rates')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as VehicleDutyRate[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<VehicleDutyRate, 'id'>) => {
      const { error } = await supabase.from('vehicle_duty_rates').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-duty-rates-all'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-duty-rates'] });
      toast.success('Duty rate created');
      setDialogOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<VehicleDutyRate> & { id: string }) => {
      const { error } = await supabase.from('vehicle_duty_rates').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-duty-rates-all'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-duty-rates'] });
      toast.success('Duty rate updated');
      setDialogOpen(false);
      setEditingRate(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vehicle_duty_rates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-duty-rates-all'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-duty-rates'] });
      toast.success('Duty rate deleted');
      setDeleteId(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resetForm = () => {
    setFormData({
      rate_key: '',
      rate_name: '',
      rate_type: 'percentage',
      rate_value: 0,
      applies_to: 'cif_value',
      engine_cc_min: '',
      engine_cc_max: '',
      vehicle_age_min: '',
      vehicle_category: '',
      display_order: rates.length,
      is_active: true,
      description: '',
    });
  };

  const handleOpenDialog = (rate?: VehicleDutyRate) => {
    if (rate) {
      setEditingRate(rate);
      setFormData({
        rate_key: rate.rate_key,
        rate_name: rate.rate_name,
        rate_type: rate.rate_type,
        rate_value: rate.rate_value,
        applies_to: rate.applies_to,
        engine_cc_min: rate.engine_cc_min?.toString() || '',
        engine_cc_max: rate.engine_cc_max?.toString() || '',
        vehicle_age_min: rate.vehicle_age_min?.toString() || '',
        vehicle_category: rate.vehicle_category || '',
        display_order: rate.display_order,
        is_active: rate.is_active,
        description: rate.description || '',
      });
    } else {
      setEditingRate(null);
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    const data = {
      rate_key: formData.rate_key,
      rate_name: formData.rate_name,
      rate_type: formData.rate_type,
      rate_value: formData.rate_value,
      applies_to: formData.applies_to,
      engine_cc_min: formData.engine_cc_min ? parseInt(formData.engine_cc_min) : null,
      engine_cc_max: formData.engine_cc_max ? parseInt(formData.engine_cc_max) : null,
      vehicle_age_min: formData.vehicle_age_min ? parseInt(formData.vehicle_age_min) : null,
      vehicle_category: formData.vehicle_category || null,
      display_order: formData.display_order,
      is_active: formData.is_active,
      description: formData.description || null,
    };

    if (editingRate) {
      updateMutation.mutate({ id: editingRate.id, ...data });
    } else {
      createMutation.mutate(data as Omit<VehicleDutyRate, 'id'>);
    }
  };

  const handleToggleActive = (rate: VehicleDutyRate) => {
    updateMutation.mutate({ id: rate.id, is_active: !rate.is_active });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  // Group rates by category
  const importDuties = rates.filter(r => r.rate_key === 'import_duty');
  const exciseDuties = rates.filter(r => r.rate_key.startsWith('excise_duty_'));
  const vatRates = rates.filter(r => r.rate_key === 'vat');
  const oldVehicleFees = rates.filter(r => r.rate_key.startsWith('old_vehicle_'));
  const fixedFees = rates.filter(r => r.rate_type === 'fixed');
  const otherRates = rates.filter(r => 
    !importDuties.includes(r) && 
    !exciseDuties.includes(r) && 
    !vatRates.includes(r) && 
    !oldVehicleFees.includes(r) &&
    !fixedFees.includes(r)
  );

  const RateCard = ({ rate }: { rate: VehicleDutyRate }) => (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{rate.rate_name}</span>
          {rate.rate_type === 'percentage' ? (
            <Badge variant="outline" className="gap-1">
              <Percent className="h-3 w-3" />
              {rate.rate_value}%
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <DollarSign className="h-3 w-3" />
              {rate.rate_value.toLocaleString()} TZS
            </Badge>
          )}
          {!rate.is_active && (
            <Badge variant="secondary">Inactive</Badge>
          )}
        </div>
        {(rate.engine_cc_min || rate.engine_cc_max) && (
          <p className="text-sm text-muted-foreground mt-1">
            Engine: {rate.engine_cc_min || 0}cc - {rate.engine_cc_max || '∞'}cc
          </p>
        )}
        {rate.vehicle_age_min && (
          <p className="text-sm text-muted-foreground">
            Age: {rate.vehicle_age_min}+ years
          </p>
        )}
        {rate.description && (
          <p className="text-sm text-muted-foreground">{rate.description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={rate.is_active}
          onCheckedChange={() => handleToggleActive(rate)}
        />
        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(rate)}>
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setDeleteId(rate.id)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );

  const RateSection = ({ title, rates, description }: { title: string; rates: VehicleDutyRate[]; description?: string }) => (
    rates.length > 0 && (
      <div className="space-y-2">
        <div>
          <h3 className="font-medium text-sm">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {rates.map(rate => <RateCard key={rate.id} rate={rate} />)}
      </div>
    )
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Vehicle Import Duty Rates</CardTitle>
            <CardDescription>
              Configure Tanzania vehicle import duties, excise taxes, VAT, and registration fees
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rate
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {rates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No duty rates configured. Add your first rate to get started.
          </div>
        ) : (
          <>
            <RateSection 
              title="Import Duty" 
              rates={importDuties} 
              description="Applied on CIF value"
            />
            <RateSection 
              title="Excise Duty" 
              rates={exciseDuties} 
              description="Based on engine capacity (cc)"
            />
            <RateSection 
              title="VAT" 
              rates={vatRates} 
              description="Applied on dutiable value"
            />
            <RateSection 
              title="Old Vehicle Surcharge" 
              rates={oldVehicleFees} 
              description="Additional fee for vehicles 8+ years old"
            />
            <RateSection 
              title="Fixed Fees" 
              rates={fixedFees} 
              description="Registration and plate number fees"
            />
            <RateSection title="Other Rates" rates={otherRates} />
          </>
        )}

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">How Duty Calculation Works</h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Import Duty = CIF Value × Import Duty Rate</li>
            <li>Excise Duty = CIF Value × Excise Rate (based on engine CC)</li>
            <li>Old Vehicle Fee = CIF Value × Old Vehicle Rate (if applicable)</li>
            <li>Dutiable Value = CIF + Import Duty + Excise + Old Vehicle Fee</li>
            <li>VAT = Dutiable Value × VAT Rate</li>
            <li>Total = All duties + Fixed fees (registration, plates)</li>
          </ol>
        </div>
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRate ? 'Edit Duty Rate' : 'Add Duty Rate'}</DialogTitle>
            <DialogDescription>
              Configure the duty rate details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rate Key</Label>
                <Input
                  placeholder="e.g. import_duty, excise_duty_1500"
                  value={formData.rate_key}
                  onChange={e => setFormData(p => ({ ...p, rate_key: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Rate Name</Label>
                <Input
                  placeholder="e.g. Import Duty"
                  value={formData.rate_name}
                  onChange={e => setFormData(p => ({ ...p, rate_name: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.rate_type}
                  onValueChange={v => setFormData(p => ({ ...p, rate_type: v as 'percentage' | 'fixed' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (TZS)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Value {formData.rate_type === 'percentage' ? '(%)' : '(TZS)'}</Label>
                <Input
                  type="number"
                  step={formData.rate_type === 'percentage' ? '0.1' : '1000'}
                  value={formData.rate_value}
                  onChange={e => setFormData(p => ({ ...p, rate_value: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Applies To</Label>
              <Select
                value={formData.applies_to}
                onValueChange={v => setFormData(p => ({ ...p, applies_to: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPLIES_TO_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Engine CC Min (optional)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 0"
                  value={formData.engine_cc_min}
                  onChange={e => setFormData(p => ({ ...p, engine_cc_min: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Engine CC Max (optional)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 1500"
                  value={formData.engine_cc_max}
                  onChange={e => setFormData(p => ({ ...p, engine_cc_max: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vehicle Age Min (years)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 8"
                  value={formData.vehicle_age_min}
                  onChange={e => setFormData(p => ({ ...p, vehicle_age_min: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Vehicle Category</Label>
                <Select
                  value={formData.vehicle_category}
                  onValueChange={v => setFormData(p => ({ ...p, vehicle_category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any</SelectItem>
                    {VEHICLE_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input
                type="number"
                value={formData.display_order}
                onChange={e => setFormData(p => ({ ...p, display_order: parseInt(e.target.value) || 0 }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Brief description of this rate"
                value={formData.description}
                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={checked => setFormData(p => ({ ...p, is_active: checked }))}
              />
              <Label>Active</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingRate ? 'Save Changes' : 'Create Rate'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Duty Rate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this duty rate? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
