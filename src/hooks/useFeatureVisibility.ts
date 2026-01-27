import { useAllSettings } from '@/hooks/useSettings';

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

export function useFeatureVisibility(featureKey: 'shop_for_me' | 'shipping_calculator') {
  const { data: settings, isLoading } = useAllSettings();
  
  const settingsKey = `feature_${featureKey}`;
  
  // While loading, don't show anything - wait for actual settings
  // Once loaded, use saved settings or fall back to defaults
  const hasSettings = settings && settings[settingsKey] !== undefined;
  const visibility = hasSettings
    ? { ...defaultVisibility, ...(settings[settingsKey] as unknown as FeatureVisibility) }
    : (isLoading ? { enabled: false, show_on_public: false, show_on_customer: false } : defaultVisibility);

  return {
    isLoading,
    enabled: visibility.enabled,
    showOnPublic: visibility.enabled && visibility.show_on_public,
    showOnCustomer: visibility.enabled && visibility.show_on_customer,
  };
}
