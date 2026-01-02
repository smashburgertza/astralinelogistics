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
  const visibility = settings?.[settingsKey] 
    ? { ...defaultVisibility, ...(settings[settingsKey] as unknown as FeatureVisibility) }
    : defaultVisibility;

  return {
    isLoading,
    enabled: visibility.enabled,
    showOnPublic: visibility.enabled && visibility.show_on_public,
    showOnCustomer: visibility.enabled && visibility.show_on_customer,
  };
}
