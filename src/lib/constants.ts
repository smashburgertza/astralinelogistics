export const SHIPMENT_STATUSES = {
  collected: { label: 'Collected', color: 'status-collected', icon: 'Package' },
  in_transit: { label: 'In Transit', color: 'status-in-transit', icon: 'Plane' },
  arrived: { label: 'Arrived', color: 'status-arrived', icon: 'MapPin' },
  delivered: { label: 'Delivered', color: 'status-delivered', icon: 'CheckCircle' },
} as const;

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  AED: 'د.إ',
  INR: '₹',
  TZS: 'TZS ',
  KES: 'KSh',
  ZAR: 'R',
  NGN: '₦',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'CHF',
};

export const COMMON_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TZS ' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
] as const;

export type ShipmentStatus = keyof typeof SHIPMENT_STATUSES;
