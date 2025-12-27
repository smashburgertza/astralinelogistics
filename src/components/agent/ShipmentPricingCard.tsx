import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DollarSign, Route } from 'lucide-react';
import { BillingPartyType, BILLING_PARTIES } from '@/lib/billingParty';
import { TransitPointType, TRANSIT_POINT_LABELS } from '@/hooks/useTransitRoutes';

interface Currency {
  code: string;
  symbol: string;
  name: string;
}

interface TransitOption {
  value: TransitPointType;
  label: string;
  additionalCost?: number;
}

interface ShipmentPricingCardProps {
  ratePerKg: number;
  currency: string;
  billingParty: BillingPartyType;
  transitPoint: TransitPointType;
  availableCurrencies: Currency[];
  availableTransitPoints: TransitOption[];
  currencySymbol: string;
  onRateChange: (rate: number) => void;
  onCurrencyChange: (currency: string) => void;
  onBillingPartyChange: (party: BillingPartyType) => void;
  onTransitPointChange: (point: TransitPointType) => void;
}

export function ShipmentPricingCard({
  ratePerKg,
  currency,
  billingParty,
  transitPoint,
  availableCurrencies,
  availableTransitPoints,
  currencySymbol,
  onRateChange,
  onCurrencyChange,
  onBillingPartyChange,
  onTransitPointChange,
}: ShipmentPricingCardProps) {
  return (
    <Card className="shadow-lg border-0">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Rate Per KG */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Rate Per KG</Label>
            </div>
            <div className="flex gap-2">
              <Select value={currency} onValueChange={onCurrencyChange}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableCurrencies.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.symbol} {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={ratePerKg || ''}
                onChange={(e) => onRateChange(parseFloat(e.target.value) || 0)}
                className="flex-1"
              />
            </div>
          </div>

          {/* Billing Party Selection (simplified ownership) */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Billing Type</Label>
            <RadioGroup
              value={billingParty}
              onValueChange={(value) => onBillingPartyChange(value as BillingPartyType)}
              className="flex flex-col gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="customer_direct" id="billing-direct" />
                <Label htmlFor="billing-direct" className="cursor-pointer text-sm">
                  <span className="font-medium">{BILLING_PARTIES.customer_direct.label}</span>
                  <span className="text-xs text-muted-foreground block">
                    {BILLING_PARTIES.customer_direct.description}
                  </span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="agent_collect" id="billing-agent" />
                <Label htmlFor="billing-agent" className="cursor-pointer text-sm">
                  <span className="font-medium">{BILLING_PARTIES.agent_collect.label}</span>
                  <span className="text-xs text-muted-foreground block">
                    {BILLING_PARTIES.agent_collect.description}
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Transit Point Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Route className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Transit Route</Label>
            </div>
            <Select
              value={transitPoint}
              onValueChange={(value) => onTransitPointChange(value as TransitPointType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableTransitPoints.map((point) => (
                  <SelectItem key={point.value} value={point.value}>
                    {point.label}
                    {point.additionalCost ? ` (+${currencySymbol}${point.additionalCost})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
