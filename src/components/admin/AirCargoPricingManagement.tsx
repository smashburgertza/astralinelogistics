import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, Pencil, Loader2, Plane, DollarSign, PoundSterling } from 'lucide-react';
import { toast } from 'sonner';
import { useRegionPricing, useCreateRegionPricing, useUpdateRegionPricing } from '@/hooks/useRegionPricing';
import { useActiveRegions } from '@/hooks/useRegions';
import { Database } from '@/integrations/supabase/types';

type AgentRegion = Database['public']['Enums']['agent_region'];

const REGION_CURRENCIES: Record<AgentRegion, string> = {
  usa: 'USD',
  dubai: 'USD',
  china: 'USD',
  india: 'USD',
  europe: 'GBP',
  uk: 'GBP',
};

interface PricingFormData {
  region: AgentRegion;
  customer_rate_per_kg: number;
  agent_rate_per_kg: number;
  handling_fee: number;
  currency: string;
}

export function AirCargoPricingManagement() {
  const [serviceTab, setServiceTab] = useState<'door_to_door' | 'airport_to_airport'>('door_to_door');
  const { data: doorToDoorPricing, isLoading: loadingD2D } = useRegionPricing('air', 'door_to_door');
  const { data: airportPricing, isLoading: loadingA2A } = useRegionPricing('air', 'airport_to_airport');
  const { data: regions } = useActiveRegions();
  const createPricing = useCreateRegionPricing();
  const updatePricing = useUpdateRegionPricing();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPricing, setEditingPricing] = useState<any | null>(null);
  const [formData, setFormData] = useState<PricingFormData>({
    region: 'usa',
    customer_rate_per_kg: 0,
    agent_rate_per_kg: 0,
    handling_fee: 0,
    currency: 'USD',
  });

  const isLoading = loadingD2D || loadingA2A;
  const currentPricing = serviceTab === 'door_to_door' ? doorToDoorPricing : airportPricing;

  const handleOpenCreate = () => {
    setFormData({
      region: 'usa',
      customer_rate_per_kg: 0,
      agent_rate_per_kg: 0,
      handling_fee: 0,
      currency: 'USD',
    });
    setEditingPricing(null);
    setIsCreateOpen(true);
  };

  const handleRegionSelect = (region: AgentRegion) => {
    setFormData({
      ...formData,
      region,
      currency: REGION_CURRENCIES[region],
    });
  };

  const handleCreate = async () => {
    try {
      await createPricing.mutateAsync({
        ...formData,
        cargo_type: 'air',
        service_type: serviceTab,
      });
      setIsCreateOpen(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleUpdate = async () => {
    if (!editingPricing) return;

    try {
      await updatePricing.mutateAsync({
        id: editingPricing.id,
        ...formData,
      });
      setEditingPricing(null);
    } catch (error) {
      // Error handled in hook
    }
  };

  const openEditDialog = (pricing: any) => {
    setEditingPricing(pricing);
    setFormData({
      region: pricing.region,
      customer_rate_per_kg: pricing.customer_rate_per_kg,
      agent_rate_per_kg: pricing.agent_rate_per_kg,
      handling_fee: pricing.handling_fee || 0,
      currency: pricing.currency,
    });
  };

  const getCurrencySymbol = (currency: string) => {
    return currency === 'GBP' ? '£' : '$';
  };

  const getRegionName = (regionCode: AgentRegion) => {
    const region = regions?.find(r => r.code === regionCode);
    return region ? `${region.flag_emoji || ''} ${region.name}` : regionCode;
  };

  const existingRegions = currentPricing?.map(p => p.region) || [];
  const availableRegions = (['usa', 'uk', 'europe', 'dubai', 'china', 'india'] as AgentRegion[])
    .filter(r => !existingRegions.includes(r));

  const PricingForm = ({ onSubmit, isSubmitting }: { onSubmit: () => void; isSubmitting: boolean }) => {
    const currencySymbol = getCurrencySymbol(formData.currency);

    return (
      <div className="grid gap-4 py-4">
        {!editingPricing && (
          <div className="space-y-2">
            <Label>Region</Label>
            <Select value={formData.region} onValueChange={(v) => handleRegionSelect(v as AgentRegion)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableRegions.map((region) => (
                  <SelectItem key={region} value={region}>
                    {getRegionName(region)} ({REGION_CURRENCIES[region]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Customer Rate (per kg)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {currencySymbol}
              </span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.customer_rate_per_kg}
                onChange={(e) => setFormData({ ...formData, customer_rate_per_kg: parseFloat(e.target.value) || 0 })}
                className="pl-8"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Agent Rate (per kg)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {currencySymbol}
              </span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.agent_rate_per_kg}
                onChange={(e) => setFormData({ ...formData, agent_rate_per_kg: parseFloat(e.target.value) || 0 })}
                className="pl-8"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Handling Fee</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {currencySymbol}
            </span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.handling_fee}
              onChange={(e) => setFormData({ ...formData, handling_fee: parseFloat(e.target.value) || 0 })}
              className="pl-8"
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editingPricing ? 'Update Pricing' : 'Create Pricing'}
          </Button>
        </DialogFooter>
      </div>
    );
  };

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

  const renderPricingTable = () => {
    if (!currentPricing || currentPricing.length === 0) {
      const label = serviceTab === 'door_to_door' ? 'Door to Door' : 'Airport to Airport';
      return (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          <p>No pricing configured for Air Cargo ({label}).</p>
          <p className="text-sm mt-1">Click "Add Pricing" to configure rates.</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Region</TableHead>
            <TableHead>Customer Rate</TableHead>
            <TableHead>Agent Rate</TableHead>
            <TableHead>Handling Fee</TableHead>
            <TableHead>Currency</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentPricing.map((pricing) => (
            <TableRow key={pricing.id}>
              <TableCell className="font-medium">
                {getRegionName(pricing.region)}
              </TableCell>
              <TableCell>
                {getCurrencySymbol(pricing.currency)}{pricing.customer_rate_per_kg}/kg
              </TableCell>
              <TableCell>
                {getCurrencySymbol(pricing.currency)}{pricing.agent_rate_per_kg}/kg
              </TableCell>
              <TableCell>
                {getCurrencySymbol(pricing.currency)}{pricing.handling_fee || 0}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{pricing.currency}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <Dialog 
                  open={editingPricing?.id === pricing.id} 
                  onOpenChange={(open) => !open && setEditingPricing(null)}
                >
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(pricing)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Air Cargo Pricing</DialogTitle>
                      <DialogDescription>
                        Update {serviceTab === 'door_to_door' ? 'Door to Door' : 'Airport to Airport'} rates for {getRegionName(pricing.region)}
                      </DialogDescription>
                    </DialogHeader>
                    <PricingForm onSubmit={handleUpdate} isSubmitting={updatePricing.isPending} />
                  </DialogContent>
                </Dialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Plane className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle>Air Cargo Pricing</CardTitle>
              <CardDescription>
                Configure rates for Door to Door and Airport to Airport services
              </CardDescription>
            </div>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreate} disabled={availableRegions.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                Add Pricing
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Air Cargo Pricing</DialogTitle>
                <DialogDescription>
                  Configure {serviceTab === 'door_to_door' ? 'Door to Door' : 'Airport to Airport'} rates for a region
                </DialogDescription>
              </DialogHeader>
              <PricingForm onSubmit={handleCreate} isSubmitting={createPricing.isPending} />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={serviceTab} onValueChange={(v) => setServiceTab(v as 'door_to_door' | 'airport_to_airport')}>
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
            <TabsTrigger value="door_to_door">
              Door to Door
              {doorToDoorPricing && doorToDoorPricing.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {doorToDoorPricing.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="airport_to_airport">
              Airport to Airport
              {airportPricing && airportPricing.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {airportPricing.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="door_to_door">
            {renderPricingTable()}
          </TabsContent>

          <TabsContent value="airport_to_airport">
            {renderPricingTable()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}