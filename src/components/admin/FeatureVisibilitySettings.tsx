import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAllSettings, useUpdateSettings } from '@/hooks/useSettings';
import { Loader2 } from 'lucide-react';

interface FeatureVisibilitySettingsProps {
  featureKey: 'shop_for_me' | 'shipping_calculator';
  title: string;
  description: string;
}

interface FeatureVisibility {
  enabled: boolean;
  show_on_public: boolean;
  show_on_customer: boolean;
}

const defaultVisibility: FeatureVisibility = {
  enabled: true,
  show_on_public: true,
  show_on_customer: true,
};

export function FeatureVisibilitySettings({ featureKey, title, description }: FeatureVisibilitySettingsProps) {
  const { data: settings, isLoading } = useAllSettings();
  const updateSettings = useUpdateSettings();
  const [visibility, setVisibility] = useState<FeatureVisibility>(defaultVisibility);

  const settingsKey = `feature_${featureKey}`;

  useEffect(() => {
    if (settings && settings[settingsKey]) {
      const saved = settings[settingsKey] as unknown as FeatureVisibility;
      setVisibility({ ...defaultVisibility, ...saved });
    }
  }, [settings, settingsKey]);

  const handleToggleEnabled = async (enabled: boolean) => {
    const newVisibility = { ...visibility, enabled };
    setVisibility(newVisibility);
    await updateSettings.mutateAsync({
      key: settingsKey,
      value: newVisibility as unknown as Record<string, unknown>,
      category: 'features',
    });
  };

  const handleVisibilityChange = async (field: 'show_on_public' | 'show_on_customer', checked: boolean) => {
    const newVisibility = { ...visibility, [field]: checked };
    setVisibility(newVisibility);
    await updateSettings.mutateAsync({
      key: settingsKey,
      value: newVisibility as unknown as Record<string, unknown>,
      category: 'features',
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Switch
            checked={visibility.enabled}
            onCheckedChange={handleToggleEnabled}
            disabled={updateSettings.isPending}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Label className="text-sm text-muted-foreground">
            {visibility.enabled ? 'Show this feature on:' : 'When disabled, hide from:'}
          </Label>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id={`${featureKey}-public`}
                checked={visibility.show_on_public}
                onCheckedChange={(checked) => handleVisibilityChange('show_on_public', checked === true)}
                disabled={updateSettings.isPending}
              />
              <Label htmlFor={`${featureKey}-public`} className="text-sm font-normal cursor-pointer">
                Public website (homepage)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id={`${featureKey}-customer`}
                checked={visibility.show_on_customer}
                onCheckedChange={(checked) => handleVisibilityChange('show_on_customer', checked === true)}
                disabled={updateSettings.isPending}
              />
              <Label htmlFor={`${featureKey}-customer`} className="text-sm font-normal cursor-pointer">
                Customer portal
              </Label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
