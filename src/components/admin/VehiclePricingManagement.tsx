import { useState } from 'react';
import { Car, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useVehiclePricing, VehicleType, ShippingMethod } from '@/hooks/useVehiclePricing';
import { REGIONS } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

const CURRENCIES = ['USD', 'GBP', 'EUR', 'TZS'];

const VEHICLE_LABELS: Record<VehicleType, string> = {
  motorcycle: 'Motorcycle',
  sedan: 'Sedan / Hatchback',
  suv: 'SUV / Crossover',
  truck: 'Truck / Pickup',
};

const SHIPPING_METHOD_LABELS: Record<ShippingMethod, string> = {
  roro: 'RoRo (Roll-on/Roll-off)',
  container: 'Container Shipping',
};

export function VehiclePricingManagement() {
  const { vehiclePricing, isLoading, updatePricing } = useVehiclePricing();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ price: string; currency: string }>({ price: '', currency: '' });
  const [activeMethod, setActiveMethod] = useState<ShippingMethod>('roro');

  const handleEdit = (id: string, price: number, currency: string) => {
    setEditingId(id);
    setEditValues({ price: price.toString(), currency });
  };

  const handleSave = (id: string) => {
    updatePricing.mutate({
      id,
      price: parseFloat(editValues.price),
      currency: editValues.currency,
    });
    setEditingId(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues({ price: '', currency: '' });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const filteredByMethod = vehiclePricing.filter(p => p.shipping_method === activeMethod);
  const vehicleTypes: VehicleType[] = ['motorcycle', 'sedan', 'suv', 'truck'];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Car className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Vehicle Shipping Pricing</h3>
      </div>
      
      <p className="text-sm text-muted-foreground">
        Configure pricing for vehicle shipments by type and shipping method.
      </p>

      <Tabs value={activeMethod} onValueChange={(v) => setActiveMethod(v as ShippingMethod)}>
        <TabsList>
          <TabsTrigger value="roro">RoRo Shipping</TabsTrigger>
          <TabsTrigger value="container">Container Shipping</TabsTrigger>
        </TabsList>

        <TabsContent value={activeMethod} className="mt-4 space-y-6">
          {vehicleTypes.map((vehicleType) => {
            const vehiclePricingData = filteredByMethod.filter(p => p.vehicle_type === vehicleType);
            
            return (
              <div key={vehicleType}>
                <h4 className="font-medium mb-3">{VEHICLE_LABELS[vehicleType]}</h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Region</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Currency</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vehiclePricingData.map((pricing) => (
                        <TableRow key={pricing.id}>
                          <TableCell>
                            <span className="flex items-center gap-2">
                              <span>{REGIONS[pricing.region]?.flag}</span>
                              {REGIONS[pricing.region]?.label}
                            </span>
                          </TableCell>
                          <TableCell>
                            {editingId === pricing.id ? (
                              <Input
                                type="number"
                                value={editValues.price}
                                onChange={(e) => setEditValues(prev => ({ ...prev, price: e.target.value }))}
                                className="w-32"
                              />
                            ) : (
                              pricing.price.toLocaleString()
                            )}
                          </TableCell>
                          <TableCell>
                            {editingId === pricing.id ? (
                              <Select
                                value={editValues.currency}
                                onValueChange={(v) => setEditValues(prev => ({ ...prev, currency: v }))}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {CURRENCIES.map(c => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              pricing.currency
                            )}
                          </TableCell>
                          <TableCell>
                            {editingId === pricing.id ? (
                              <div className="flex gap-1">
                                <Button size="sm" onClick={() => handleSave(pricing.id)} disabled={updatePricing.isPending}>
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={handleCancel}>
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => handleEdit(pricing.id, pricing.price, pricing.currency)}>
                                Edit
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
