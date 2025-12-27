export interface RegionPricing {
  region: string;
  region_id: string | null;
  customer_rate_per_kg: number;
  handling_fee: number;
  currency: string;
}

export interface ContainerPricingItem {
  id: string;
  container_size: '20ft' | '40ft';
  region: string;
  region_id: string | null;
  price: number;
  currency: string;
}

export interface VehiclePricingItem {
  id: string;
  vehicle_type: 'motorcycle' | 'sedan' | 'suv' | 'truck';
  shipping_method: 'roro' | 'container';
  region: string;
  region_id: string | null;
  price: number;
  currency: string;
}

export interface VehicleInfo {
  make: string | null;
  model: string | null;
  year: number | null;
  vehicle_type: 'motorcycle' | 'sedan' | 'suv' | 'truck';
  mileage: string | null;
  engine: string | null;
  engine_cc?: number | null;
  transmission: string | null;
  fuel_type: string | null;
  color: string | null;
  vin: string | null;
  price: number | null;
  currency: string;
  condition: string | null;
  title: string | null;
  image_url: string | null;
  origin_region: string;
}

export interface Region {
  id: string;
  code: string;
  name: string;
  flag_emoji: string | null;
  default_currency: string | null;
  is_active: boolean | null;
  display_order: number | null;
}

export interface DeliveryTimes {
  sea_cargo?: string;
  full_container?: string;
  vehicle_roro?: string;
  vehicle_container?: string;
  air_cargo?: string;
  shop_for_me?: string;
}
