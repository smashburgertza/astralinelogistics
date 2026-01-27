import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Save, Loader2, Info } from 'lucide-react';
import { useRegions } from '@/hooks/useRegions';
import {
  useShopForMeProductRates,
  useUpdateShopForMeProductRate,
  PRODUCT_CATEGORIES,
  type ShopForMeProductRate,
} from '@/hooks/useShopForMeProductRates';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AgentRegion = Database['public']['Enums']['agent_region'];

export function ShopForMeProductRatesManagement() {
  const { data: regions, isLoading: regionsLoading } = useRegions();
  const [selectedRegion, setSelectedRegion] = useState<AgentRegion>('usa');
  const { data: rates, isLoading: ratesLoading } = useShopForMeProductRates(selectedRegion);
  const updateRate = useUpdateShopForMeProductRate();

  // Local state for editing
  const [editingRates, setEditingRates] = useState<Record<string, Partial<ShopForMeProductRate>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleInputChange = (id: string, field: keyof ShopForMeProductRate, value: number | boolean) => {
    setEditingRates(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const getDisplayValue = (rate: ShopForMeProductRate, field: keyof ShopForMeProductRate) => {
    if (editingRates[rate.id] && field in editingRates[rate.id]) {
      return editingRates[rate.id][field];
    }
    return rate[field];
  };

  const handleSave = async (rate: ShopForMeProductRate) => {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Rates by Category</CardTitle>
        <CardDescription>
          Configure shipping rates, duty percentages, and handling fees for each product category by region
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <div className="flex items-center gap-1">
                          Category
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-3 w-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Categories determine pricing based on product type and regulatory requirements</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableHead>
                      <TableHead>Rate/kg ($)</TableHead>
                      <TableHead>Duty (%)</TableHead>
                      <TableHead>Handling (%)</TableHead>
                      <TableHead>Markup (%)</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {PRODUCT_CATEGORIES.map(category => {
                      const rate = rates?.find(r => r.product_category === category.value);
                      if (!rate) return null;

                      return (
                        <TableRow key={rate.id}>
                          <TableCell className="font-medium">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger className="text-left cursor-help underline-offset-2 decoration-dotted underline">
                                  {category.label}
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">{category.description}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={getDisplayValue(rate, 'rate_per_kg') as number}
                              onChange={(e) => handleInputChange(rate.id, 'rate_per_kg', parseFloat(e.target.value) || 0)}
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
                              value={getDisplayValue(rate, 'handling_fee_percentage') as number}
                              onChange={(e) => handleInputChange(rate.id, 'handling_fee_percentage', parseFloat(e.target.value) || 0)}
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
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
