export const REGIONS = {
  europe: {
    label: 'Europe',
    countries: ['Germany', 'France', 'Italy', 'Spain'],
    currency: 'EUR',
    flag: '🇪🇺',
  },
  uk: {
    label: 'United Kingdom',
    countries: ['United Kingdom'],
    currency: 'GBP',
    flag: '🇬🇧',
  },
  usa: {
    label: 'USA',
    countries: ['United States'],
    currency: 'USD',
    flag: '🇺🇸',
  },
  dubai: {
    label: 'Dubai',
    countries: ['UAE'],
    currency: 'USD',
    flag: '🇦🇪',
  },
  china: {
    label: 'China',
    countries: ['China'],
    currency: 'USD',
    flag: '🇨🇳',
  },
  india: {
    label: 'India',
    countries: ['India'],
    currency: 'USD',
    flag: '🇮🇳',
  },
} as const;

export const SHIPMENT_STATUSES = {
  collected: { label: 'Collected', color: 'status-collected', icon: 'Package' },
  in_transit: { label: 'In Transit', color: 'status-in-transit', icon: 'Plane' },
  arrived: { label: 'Arrived', color: 'status-arrived', icon: 'MapPin' },
  delivered: { label: 'Delivered', color: 'status-delivered', icon: 'CheckCircle' },
} as const;

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  GBP: '£',
  TZS: 'TSh',
  EUR: '€',
};

export type Region = keyof typeof REGIONS;
export type ShipmentStatus = keyof typeof SHIPMENT_STATUSES;
