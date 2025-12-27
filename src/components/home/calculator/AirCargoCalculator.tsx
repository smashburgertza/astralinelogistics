import { Plane, PackageSearch, MoveRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { InlineAuthGate } from '@/components/auth/InlineAuthGate';
import { DEFAULT_DELIVERY_TIMES } from '@/hooks/useRegionDeliveryTimes';
import type { Region, RegionPricing, DeliveryTimes } from './types';

interface AirCargoCalculatorProps {
  regions: Region[] | undefined;
  pricing: RegionPricing[];
  regionId: string;
  setRegionId: (id: string) => void;
  weight: string;
  setWeight: (weight: string) => void;
  deliveryTimes: DeliveryTimes | undefined;
  serviceType?: 'door-to-door' | 'airport-to-airport';
}

export function AirCargoCalculator({
  regions,
  pricing,
  regionId,
  setRegionId,
  weight,
  setWeight,
  deliveryTimes,
  serviceType = 'door-to-door',
}: AirCargoCalculatorProps) {
  const pricingItem = pricing.find(p => p.region_id === regionId);
  const weightNum = parseFloat(weight) || 0;
  const shippingCost = pricingItem ? weightNum * pricingItem.customer_rate_per_kg : 0;
  const handlingFee = pricingItem?.handling_fee || 0;
  const total = shippingCost + handlingFee;
  const currency = pricingItem?.currency || 'USD';
  const symbol = CURRENCY_SYMBOLS[currency] || '$';

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
        <Plane className="w-5 h-5 text-amber-600" />
        <p className="text-sm text-amber-700">
          {serviceType === 'door-to-door' 
            ? 'Door to Door - Complete delivery to your address' 
            : 'Airport to Airport - Pickup from destination airport'}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="air-origin" className="text-sm font-medium">Origin Region</Label>
        <Select value={regionId} onValueChange={setRegionId}>
          <SelectTrigger className="h-12">
            <SelectValue placeholder="Select origin" />
          </SelectTrigger>
          <SelectContent>
            {regions?.map((region) => (
              <SelectItem key={region.id} value={region.id}>
                <span className="flex items-center gap-2">
                  <span className="text-lg">{region.flag_emoji}</span>
                  {region.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="air-weight" className="text-sm font-medium">Weight (kg)</Label>
        <div className="relative">
          <PackageSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            id="air-weight"
            type="number"
            placeholder="Enter weight in kg"
            className="h-12 pl-12 text-base"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            min="0"
            step="0.1"
          />
        </div>
      </div>

      {weightNum > 0 && pricingItem && (
        <InlineAuthGate
          teaserContent={
            <div className="pt-4 border-t border-border space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping ({symbol}X.XX/kg × {weightNum}kg)</span>
                <span className="font-medium">{symbol}XXX.XX</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Handling Fee</span>
                <span className="font-medium">{symbol}XX.XX</span>
              </div>
              <div className="flex justify-between text-xl font-bold pt-3 border-t border-border">
                <span>Estimated Total</span>
                <span className="text-primary">From {symbol}XXX {currency}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Est. Delivery: {deliveryTimes?.air_cargo || DEFAULT_DELIVERY_TIMES.air_cargo}</span>
              </div>
            </div>
          }
          fullContent={
            <div className="pt-4 border-t border-border space-y-3 animate-fade-in">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Shipping ({symbol}{pricingItem.customer_rate_per_kg}/kg × {weightNum}kg)
                </span>
                <span className="font-medium">{symbol}{shippingCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Handling Fee</span>
                <span className="font-medium">{symbol}{handlingFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold pt-3 border-t border-border">
                <span>Estimated Total</span>
                <span className="text-primary">{symbol}{total.toFixed(2)} {currency}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Est. Delivery: {deliveryTimes?.air_cargo || DEFAULT_DELIVERY_TIMES.air_cargo}</span>
              </div>
              <Button className="w-full h-12 text-base btn-gold group" asChild>
                <a href="/customer">
                  Request Full Quote
                  <MoveRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                </a>
              </Button>
            </div>
          }
          title="Sign in to see air cargo pricing"
          description="Create a free account to view your complete air freight quote."
          source="shipping_calculator"
        />
      )}

      {!(weightNum > 0 && pricingItem) && (
        <Button className="w-full h-12 text-base btn-gold group" asChild>
          <a href="/auth?mode=signup">
            Request Full Quote
            <MoveRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
          </a>
        </Button>
      )}

      <p className="text-xs text-center text-muted-foreground">
        * Final cost may vary based on actual weight, volumetric weight, and customs duties.
      </p>
    </div>
  );
}
