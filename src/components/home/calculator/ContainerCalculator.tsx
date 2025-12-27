import { Container, MoveRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { InlineAuthGate } from '@/components/auth/InlineAuthGate';
import { DEFAULT_DELIVERY_TIMES } from '@/hooks/useRegionDeliveryTimes';
import type { Region, ContainerPricingItem, DeliveryTimes } from './types';

interface ContainerCalculatorProps {
  regions: Region[] | undefined;
  containerPricing: ContainerPricingItem[];
  regionId: string;
  setRegionId: (id: string) => void;
  containerSize: '20ft' | '40ft';
  setContainerSize: (size: '20ft' | '40ft') => void;
  deliveryTimes: DeliveryTimes | undefined;
}

export function ContainerCalculator({
  regions,
  containerPricing,
  regionId,
  setRegionId,
  containerSize,
  setContainerSize,
  deliveryTimes,
}: ContainerCalculatorProps) {
  const pricingItem = containerPricing.find(
    p => p.region_id === regionId && p.container_size === containerSize
  );
  const total = pricingItem?.price || 0;
  const currency = pricingItem?.currency || 'USD';
  const symbol = CURRENCY_SYMBOLS[currency] || '$';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <Container className="w-5 h-5 text-blue-600 shrink-0" />
        <p className="text-sm text-blue-700">FCL shipping for large volume cargo</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Container Size</Label>
          <Select value={containerSize} onValueChange={(v) => setContainerSize(v as '20ft' | '40ft')}>
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20ft">20ft Container</SelectItem>
              <SelectItem value="40ft">40ft Container</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Origin Region</Label>
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
      </div>

      {pricingItem && (
        <InlineAuthGate
          teaserContent={
            <div className="pt-4 border-t border-border space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{containerSize} Container</span>
                <span className="font-medium">{symbol}X,XXX</span>
              </div>
              <div className="flex justify-between text-xl font-bold pt-3 border-t border-border">
                <span>Container Price</span>
                <span className="text-primary">From {symbol}X,XXX {currency}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Est. Delivery: {deliveryTimes?.full_container || DEFAULT_DELIVERY_TIMES.full_container}</span>
              </div>
            </div>
          }
          fullContent={
            <div className="pt-4 border-t border-border space-y-3 animate-fade-in">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{containerSize} Container</span>
                <span className="font-medium">{symbol}{total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xl font-bold pt-3 border-t border-border">
                <span>Container Price</span>
                <span className="text-primary">{symbol}{total.toLocaleString()} {currency}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Est. Delivery: {deliveryTimes?.full_container || DEFAULT_DELIVERY_TIMES.full_container}</span>
              </div>
              <Button className="w-full h-12 text-base btn-gold group" asChild>
                <a href="/customer">
                  Request Full Quote
                  <MoveRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                </a>
              </Button>
            </div>
          }
          title="Sign in to see container pricing"
          description="Create a free account to view exact container rates."
          source="shipping_calculator"
        />
      )}

      {!pricingItem && (
        <Button className="w-full h-12 text-base btn-gold group" asChild>
          <a href="/auth?mode=signup">
            Request Full Quote
            <MoveRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
          </a>
        </Button>
      )}

      <p className="text-xs text-center text-muted-foreground">
        * Prices include standard port charges. Additional fees may apply.
      </p>
    </div>
  );
}
