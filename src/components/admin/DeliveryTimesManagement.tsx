import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Save, Loader2, Ship, Plane, Car, ShoppingBag, Container, Clock } from 'lucide-react';
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';
import { toast } from 'sonner';

interface DeliveryTimes {
  sea_cargo: string;
  air_cargo: string;
  vehicle_roro: string;
  vehicle_container: string;
  shop_for_me: string;
  full_container: string;
}

const DEFAULT_TIMES: DeliveryTimes = {
  sea_cargo: '4-6 weeks',
  air_cargo: '7-10 working days',
  vehicle_roro: '4-6 weeks',
  vehicle_container: '6-8 weeks',
  shop_for_me: '7-10 working days',
  full_container: '4-6 weeks',
};

const DELIVERY_TIME_FIELDS = [
  { key: 'air_cargo', label: 'Air Cargo', icon: Plane, description: 'Loose cargo shipped by air' },
  { key: 'sea_cargo', label: 'Sea Cargo (Loose)', icon: Ship, description: 'Loose cargo shipped by sea' },
  { key: 'full_container', label: 'Full Container', icon: Container, description: '20ft and 40ft container shipments' },
  { key: 'vehicle_roro', label: 'Vehicle (RoRo)', icon: Car, description: 'Roll-on/Roll-off vehicle shipping' },
  { key: 'vehicle_container', label: 'Vehicle (Container)', icon: Car, description: 'Vehicle shipped in container' },
  { key: 'shop_for_me', label: 'Shop For Me', icon: ShoppingBag, description: 'Product sourcing and delivery' },
] as const;

interface DeliveryTimesManagementProps {
  filterKeys?: string[];
}

export function DeliveryTimesManagement({ filterKeys }: DeliveryTimesManagementProps) {
  const { data: settings, isLoading } = useSettings('delivery_times');
  const updateSettings = useUpdateSettings();
  const [times, setTimes] = useState<DeliveryTimes>(DEFAULT_TIMES);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings?.value) {
      const savedTimes = settings.value as unknown as Partial<DeliveryTimes>;
      setTimes({ ...DEFAULT_TIMES, ...savedTimes });
    }
  }, [settings]);

  const handleChange = (key: keyof DeliveryTimes, value: string) => {
    setTimes(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        key: 'delivery_times',
        value: times as unknown as Record<string, unknown>,
      });
      setHasChanges(false);
      toast.success('Delivery times updated');
    } catch (error) {
      toast.error('Failed to save delivery times');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Estimated Delivery Times
            </CardTitle>
            <CardDescription>
              Configure the delivery time estimates shown to customers for each shipping method
            </CardDescription>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || updateSettings.isPending}
          >
            {updateSettings.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {DELIVERY_TIME_FIELDS
            .filter(field => !filterKeys || filterKeys.includes(field.key))
            .map(({ key, label, icon: Icon, description }) => (
            <div 
              key={key} 
              className="flex items-start gap-4 p-4 border rounded-lg bg-muted/30"
            >
              <div className="flex-shrink-0 p-2 rounded-md bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor={key} className="font-medium">{label}</Label>
                <p className="text-xs text-muted-foreground">{description}</p>
                <Input
                  id={key}
                  value={times[key as keyof DeliveryTimes]}
                  onChange={e => handleChange(key as keyof DeliveryTimes, e.target.value)}
                  placeholder="e.g. 7-10 working days"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Tips for Delivery Time Estimates</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Use clear formats: "7-10 working days", "4-6 weeks", "2-3 business days"</li>
            <li>Consider customs clearance time in your estimates</li>
            <li>Account for peak seasons when delivery may take longer</li>
            <li>Be conservative - it's better to exceed expectations</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
