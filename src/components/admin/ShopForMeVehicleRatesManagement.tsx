import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Save, Loader2 } from 'lucide-react';
import { useRegions } from '@/hooks/useRegions';
import {
  useShopForMeVehicleRates,
  useUpdateShopForMeVehicleRate,
  VEHICLE_TYPES,
  SHIPPING_METHODS,
  type ShopForMeVehicleRate,
} from '@/hooks/useShopForMeVehicleRates';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AgentRegion = Database['public']['Enums']['agent_region'];

export function ShopForMeVehicleRatesManagement() {
  const { data: regions, isLoading: regionsLoading } = useRegions();
  const [selectedRegion, setSelectedRegion] = useState<AgentRegion>('usa');
  const { data: rates, isLoading: ratesLoading } = useShopForMeVehicleRates(selectedRegion);
  const updateRate = useUpdateShopForMeVehicleRate();

  // Local state for editing
  const [editingRates, setEditingRates] = useState<Record<string, Partial<ShopForMeVehicleRate>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleInputChange = (id: string, field: keyof ShopForMeVehicleRate, value: number | boolean) => {
    setEditingRates(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const getDisplayValue = (rate: ShopForMeVehicleRate, field: keyof ShopForMeVehicleRate) => {
    if (editingRates[rate.id] && field in editingRates[rate.id]) {
      return editingRates[rate.id][field];
    }
    return rate[field];
  };

  const handleSave = async (rate: ShopForMeVehicleRate) => {
    const updates = editingRates[rate.id];
    if (!updates || Object.keys(updates).length === 0) {
      toast.info('No changes to save');
      return;
    }

    setSavingId(rate.id);
    try {
      await updateRate.mutateAsync({ id: rate.id, ...updates });
      setEditingRates(prev => {
        const { [rate.id]: _, ...rest } = prev;
        return rest;
      });
    } finally {
      setSavingId(null);
    }
  };

  const hasChanges = (id: string) => {
    return editingRates[id] && Object.keys(editingRates[id]).length > 0;
  };

  const getShippingMethodLabel = (method: string) => {
    return SHIPPING_METHODS.find(m => m.value === method)?.label || method;
  };

  const getShippingMethodBadgeVariant = (method: string) => {
    switch (method) {
      case 'air': return 'default';
      case 'sea_roro': return 'secondary';
      case 'sea_container': return 'outline';
      default: return 'default';
    }
  };

  if (regionsLoading) {
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

  const activeRegions = regions?.filter(r => r.is_active) || [];

  // Group rates by vehicle type
  const groupedRates = rates?.reduce((acc, rate) => {
    if (!acc[rate.vehicle_type]) {
      acc[rate.vehicle_type] = [];
    }
    acc[rate.vehicle_type].push(rate);
    return acc;
  }, {} as Record<string, ShopForMeVehicleRate[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehicle Shipping Rates</CardTitle>
        <CardDescription>
          Configure shipping costs, duty percentages, and handling fees for vehicles by type and shipping method
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedRegion} onValueChange={(val) => setSelectedRegion(val as AgentRegion)}>
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            {activeRegions.map(region => (
              <TabsTrigger key={region.code} value={region.code} className="uppercase">
                {region.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {activeRegions.map(region => (
            <TabsContent key={region.code} value={region.code}>
              {ratesLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="space-y-6">
                  {VEHICLE_TYPES.map(vehicleType => {
                    const vehicleRates = groupedRates?.[vehicleType.value] || [];
                    if (vehicleRates.length === 0) return null;

                    return (
                      <div key={vehicleType.value} className="space-y-2">
                        <h4 className="font-semibold text-lg">{vehicleType.label}</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Shipping Method</TableHead>
                              <TableHead>Base Price ($)</TableHead>
                              <TableHead>Handling Fee ($)</TableHead>
                              <TableHead>Duty (%)</TableHead>
                              <TableHead>Markup (%)</TableHead>
                              <TableHead>Active</TableHead>
                              <TableHead className="w-20">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {vehicleRates.map(rate => (
                              <TableRow key={rate.id}>
                                <TableCell>
                                  <Badge variant={getShippingMethodBadgeVariant(rate.shipping_method)}>
                                    {getShippingMethodLabel(rate.shipping_method)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    step="1"
                                    min="0"
                                    value={getDisplayValue(rate, 'base_shipping_price') as number}
                                    onChange={(e) => handleInputChange(rate.id, 'base_shipping_price', parseFloat(e.target.value) || 0)}
                                    className="w-28"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    step="1"
                                    min="0"
                                    value={getDisplayValue(rate, 'handling_fee') as number}
                                    onChange={(e) => handleInputChange(rate.id, 'handling_fee', parseFloat(e.target.value) || 0)}
                                    className="w-24"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    value={getDisplayValue(rate, 'duty_percentage') as number}
                                    onChange={(e) => handleInputChange(rate.id, 'duty_percentage', parseFloat(e.target.value) || 0)}
                                    className="w-20"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    value={getDisplayValue(rate, 'markup_percentage') as number}
                                    onChange={(e) => handleInputChange(rate.id, 'markup_percentage', parseFloat(e.target.value) || 0)}
                                    className="w-20"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Switch
                                    checked={getDisplayValue(rate, 'is_active') as boolean}
                                    onCheckedChange={(checked) => handleInputChange(rate.id, 'is_active', checked)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    onClick={() => handleSave(rate)}
                                    disabled={!hasChanges(rate.id) || savingId === rate.id}
                                  >
                                    {savingId === rate.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Save className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
