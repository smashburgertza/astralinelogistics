import { useState, useEffect } from 'react';
import { Clock, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useActiveRegions } from '@/hooks/useRegions';
import { 
  useRegionDeliveryTimesByRegion, 
  useBulkUpsertRegionDeliveryTimes,
  SERVICE_TYPE_LABELS,
  DEFAULT_DELIVERY_TIMES,
  ServiceType
} from '@/hooks/useRegionDeliveryTimes';

const SERVICE_TYPES: ServiceType[] = [
  'sea_cargo',
  'air_cargo_door_to_door',
  'air_cargo_airport_to_airport',
  'full_container',
  'vehicle_roro',
  'vehicle_container',
  'shop_for_me',
];

export function RegionDeliveryTimesManagement() {
  const { data: regions, isLoading: regionsLoading } = useActiveRegions();
  const [selectedRegionId, setSelectedRegionId] = useState<string>('');
  const [times, setTimes] = useState<Record<ServiceType, string>>(DEFAULT_DELIVERY_TIMES);
  const [hasChanges, setHasChanges] = useState(false);
  
  const { data: regionTimes, isLoading: timesLoading } = useRegionDeliveryTimesByRegion(selectedRegionId);
  const bulkUpsert = useBulkUpsertRegionDeliveryTimes();
  
  // Set default region when regions load
  useEffect(() => {
    if (regions && regions.length > 0 && !selectedRegionId) {
      setSelectedRegionId(regions[0].id);
    }
  }, [regions, selectedRegionId]);
  
  // Update local state when region times load
  useEffect(() => {
    if (regionTimes) {
      setTimes(regionTimes);
      setHasChanges(false);
    }
  }, [regionTimes]);
  
  const handleChange = (serviceType: ServiceType, value: string) => {
    setTimes(prev => ({ ...prev, [serviceType]: value }));
    setHasChanges(true);
  };
  
  const handleSave = async () => {
    if (!selectedRegionId) return;
    
    const items = SERVICE_TYPES.map(serviceType => ({
      regionId: selectedRegionId,
      serviceType,
      deliveryTime: times[serviceType],
    }));
    
    await bulkUpsert.mutateAsync(items);
    setHasChanges(false);
  };
  
  const selectedRegion = regions?.find(r => r.id === selectedRegionId);
  
  if (regionsLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Delivery Times by Region</CardTitle>
              <CardDescription>
                Set estimated delivery times for each shipping service per origin region
              </CardDescription>
            </div>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || bulkUpsert.isPending}
            size="sm"
          >
            {bulkUpsert.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Region Selector */}
        <div className="space-y-2">
          <Label>Select Region</Label>
          <Select value={selectedRegionId} onValueChange={setSelectedRegionId}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Select a region" />
            </SelectTrigger>
            <SelectContent>
              {regions?.map(region => (
                <SelectItem key={region.id} value={region.id}>
                  <span className="flex items-center gap-2">
                    <span>{region.flag_emoji}</span>
                    <span>{region.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Delivery Times Grid */}
        {timesLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICE_TYPES.map(type => (
              <Skeleton key={type} className="h-20" />
            ))}
          </div>
        ) : selectedRegionId ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICE_TYPES.map(serviceType => (
              <div key={serviceType} className="space-y-2">
                <Label className="flex flex-col">
                  <span className="font-medium">{SERVICE_TYPE_LABELS[serviceType].label}</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {SERVICE_TYPE_LABELS[serviceType].description}
                  </span>
                </Label>
                <Input
                  value={times[serviceType]}
                  onChange={(e) => handleChange(serviceType, e.target.value)}
                  placeholder={DEFAULT_DELIVERY_TIMES[serviceType]}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Select a region to configure delivery times.</p>
        )}
        
        {/* Help Text */}
        {selectedRegion && (
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <p className="text-sm font-medium">Tips for {selectedRegion.flag_emoji} {selectedRegion.name}</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Use ranges like "4-6 weeks" or "7-10 working days"</li>
              <li>Consider seasonal variations and shipping routes</li>
              <li>Times should reflect realistic estimates for this origin</li>
              <li>Changes will immediately appear in the public pricing calculator</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
