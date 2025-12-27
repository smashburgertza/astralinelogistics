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

export type ShipmentStatus = keyof typeof SHIPMENT_STATUSES;
