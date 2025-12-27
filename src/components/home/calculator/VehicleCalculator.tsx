import { useState, useMemo } from 'react';
import { Car, Link2, Loader2, MoveRight, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { InlineAuthGate } from '@/components/auth/InlineAuthGate';
import { DEFAULT_DELIVERY_TIMES } from '@/hooks/useRegionDeliveryTimes';
import { useVehicleDutyRates } from '@/hooks/useVehicleDutyRates';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Region, VehiclePricingItem, VehicleInfo, DeliveryTimes } from './types';

interface VehicleCalculatorProps {
  regions: Region[] | undefined;
  vehiclePricing: VehiclePricingItem[];
  exchangeRates: Record<string, number>;
  deliveryTimes: DeliveryTimes | undefined;
}

// Parse engine CC from vehicle info
const parseEngineCc = (engineStr?: string | null): number | undefined => {
  if (!engineStr) return undefined;
  const match = engineStr.match(/(\d+\.?\d*)\s*(L|litre|liter|cc)/i);
  if (match) {
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    return unit === 'cc' ? value : value * 1000;
  }
  const numMatch = engineStr.match(/(\d{3,4})/);
  if (numMatch) return parseInt(numMatch[1]);
  return undefined;
};

export function VehicleCalculator({
  regions,
  vehiclePricing,
  exchangeRates,
  deliveryTimes,
}: VehicleCalculatorProps) {
  const [vehicleUrl, setVehicleUrl] = useState('');
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo | null>(null);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [shippingMethod, setShippingMethod] = useState<'roro' | 'container'>('roro');
  const [priceType, setPriceType] = useState<'cif' | 'duty_paid'>('cif');
  const [showDutyBreakdown, setShowDutyBreakdown] = useState(false);

  const { calculateDuties } = useVehicleDutyRates();

  const vehicleCalculation = useMemo(() => {
    if (!vehicleInfo || !regions) return null;

    const vehicleOriginRegion = regions.find(r => r.code === vehicleInfo.origin_region);
    const vehicleType = vehicleInfo.vehicle_type || 'sedan';

    const shippingPricing = vehiclePricing.find(
      p => p.region_id === vehicleOriginRegion?.id &&
           p.vehicle_type === vehicleType &&
           p.shipping_method === shippingMethod
    );

    if (!shippingPricing) return null;

    const shippingCost = shippingPricing.price;
    const shippingCurrency = shippingPricing.currency;
    const shippingSymbol = CURRENCY_SYMBOLS[shippingCurrency] || '$';

    if (priceType === 'cif') {
      return {
        shippingCost,
        shippingCurrency,
        shippingSymbol,
        vehiclePrice: vehicleInfo.price,
        vehicleCurrency: vehicleInfo.currency,
        totalCif: shippingCost + (vehicleInfo.price || 0),
        dutyCalculation: null,
      };
    }

    const vehiclePriceInCurrency = vehicleInfo.price || 0;
    const vehicleCurrencyRate = exchangeRates[vehicleInfo.currency] || 1;
    const shippingCurrencyRate = exchangeRates[shippingCurrency] || 1;

    const vehiclePriceTzs = vehiclePriceInCurrency * vehicleCurrencyRate;
    const shippingCostTzs = shippingCost * shippingCurrencyRate;
    const cifValueTzs = vehiclePriceTzs + shippingCostTzs;

    const engineCc = vehicleInfo.engine_cc || parseEngineCc(vehicleInfo.engine);
    const isUtility = vehicleType === 'truck';

    const dutyCalc = calculateDuties(
      cifValueTzs,
      engineCc,
      vehicleInfo.year || undefined,
      isUtility
    );

    return {
      shippingCost,
      shippingCurrency,
      shippingSymbol,
      vehiclePrice: vehicleInfo.price,
      vehicleCurrency: vehicleInfo.currency,
      cifValueTzs,
      totalCif: shippingCost + (vehicleInfo.price || 0),
      dutyCalculation: dutyCalc,
      totalDutyPaidTzs: cifValueTzs + dutyCalc.totalDuties,
    };
  }, [vehicleInfo, vehiclePricing, shippingMethod, priceType, calculateDuties, regions, exchangeRates]);

  const fetchVehicleInfo = async () => {
    if (!vehicleUrl.trim()) {
      toast.error('Please enter a vehicle URL');
      return;
    }

    setVehicleLoading(true);
    setVehicleInfo(null);

    try {
      const { data, error } = await supabase.functions.invoke('fetch-vehicle-info', {
        body: { url: vehicleUrl }
      });

      if (error) throw error;
      if (data.error) {
        toast.error(data.error);
        return;
      }

      setVehicleInfo(data);
      toast.success('Vehicle information extracted successfully');
    } catch (error: any) {
      console.error('Error fetching vehicle info:', error);
      toast.error('Failed to fetch vehicle information');
    } finally {
      setVehicleLoading(false);
    }
  };

  const clearVehicle = () => {
    setVehicleUrl('');
    setVehicleInfo(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <Car className="w-5 h-5 text-blue-600 shrink-0" />
        <p className="text-sm text-blue-700">Ship vehicles via RoRo or container</p>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Vehicle Listing URL</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="url"
              placeholder="Paste vehicle listing link..."
              className="h-12 pl-12 text-base"
              value={vehicleUrl}
              onChange={(e) => setVehicleUrl(e.target.value)}
              disabled={vehicleLoading}
            />
          </div>
          <Button
            onClick={fetchVehicleInfo}
            disabled={vehicleLoading || !vehicleUrl.trim()}
            className="h-12 px-4"
          >
            {vehicleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Fetch'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Paste a link from AutoTrader, eBay Motors, Copart, CarGurus, etc.
        </p>
      </div>

      {vehicleLoading && (
        <div className="flex flex-col items-center justify-center py-8 space-y-3 animate-fade-in">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm font-medium text-muted-foreground">Analyzing vehicle listing...</p>
          <p className="text-xs text-muted-foreground/70">Extracting make, model, year, and pricing</p>
        </div>
      )}

      {!vehicleLoading && vehicleInfo && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-3">
            {vehicleInfo.image_url && (
              <div className="relative w-full h-32 rounded-lg overflow-hidden bg-muted">
                <img
                  src={vehicleInfo.image_url}
                  alt="Vehicle"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-sm">
              {vehicleInfo.year && vehicleInfo.make && vehicleInfo.model && (
                <div className="col-span-2">
                  <span className="font-semibold text-base">
                    {vehicleInfo.year} {vehicleInfo.make} {vehicleInfo.model}
                  </span>
                </div>
              )}
              {vehicleInfo.vehicle_type && (
                <div>
                  <span className="text-muted-foreground">Type: </span>
                  <span className="font-medium capitalize">{vehicleInfo.vehicle_type}</span>
                </div>
              )}
              {vehicleInfo.mileage && (
                <div>
                  <span className="text-muted-foreground">Mileage: </span>
                  <span className="font-medium">{vehicleInfo.mileage}</span>
                </div>
              )}
              {vehicleInfo.engine && (
                <div>
                  <span className="text-muted-foreground">Engine: </span>
                  <span className="font-medium">{vehicleInfo.engine}</span>
                </div>
              )}
              {vehicleInfo.transmission && (
                <div>
                  <span className="text-muted-foreground">Trans: </span>
                  <span className="font-medium">{vehicleInfo.transmission}</span>
                </div>
              )}
              {vehicleInfo.fuel_type && (
                <div>
                  <span className="text-muted-foreground">Fuel: </span>
                  <span className="font-medium">{vehicleInfo.fuel_type}</span>
                </div>
              )}
              {vehicleInfo.color && (
                <div>
                  <span className="text-muted-foreground">Color: </span>
                  <span className="font-medium">{vehicleInfo.color}</span>
                </div>
              )}
              {vehicleInfo.price && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Price: </span>
                  <span className="font-semibold text-primary">
                    {CURRENCY_SYMBOLS[vehicleInfo.currency] || '$'}{vehicleInfo.price.toLocaleString()} {vehicleInfo.currency}
                  </span>
                </div>
              )}
            </div>

            <Button variant="ghost" size="sm" onClick={clearVehicle} className="text-xs">
              Clear & Try Another
            </Button>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Shipping Method</Label>
            <RadioGroup
              value={shippingMethod}
              onValueChange={(v) => setShippingMethod(v as 'roro' | 'container')}
              className="grid grid-cols-2 gap-3"
            >
              <Label
                htmlFor="roro"
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                  shippingMethod === 'roro'
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground"
                )}
              >
                <RadioGroupItem value="roro" id="roro" />
                <div>
                  <p className="font-medium text-sm">RoRo</p>
                  <p className="text-xs text-muted-foreground">Roll-on/Roll-off</p>
                </div>
              </Label>
              <Label
                htmlFor="container-vehicle"
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                  shippingMethod === 'container'
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground"
                )}
              >
                <RadioGroupItem value="container" id="container-vehicle" />
                <div>
                  <p className="font-medium text-sm">Container</p>
                  <p className="text-xs text-muted-foreground">Enclosed shipping</p>
                </div>
              </Label>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Price Type</Label>
            <RadioGroup
              value={priceType}
              onValueChange={(v) => setPriceType(v as 'cif' | 'duty_paid')}
              className="grid grid-cols-2 gap-3"
            >
              <Label
                htmlFor="cif"
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                  priceType === 'cif'
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground"
                )}
              >
                <RadioGroupItem value="cif" id="cif" />
                <div>
                  <p className="font-medium text-sm">CIF</p>
                  <p className="text-xs text-muted-foreground">Cost, Insurance, Freight</p>
                </div>
              </Label>
              <Label
                htmlFor="duty_paid"
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                  priceType === 'duty_paid'
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground"
                )}
              >
                <RadioGroupItem value="duty_paid" id="duty_paid" />
                <div>
                  <p className="font-medium text-sm">Duty Paid</p>
                  <p className="text-xs text-muted-foreground">Includes import taxes</p>
                </div>
              </Label>
            </RadioGroup>
          </div>

          {vehicleCalculation && (
            <InlineAuthGate
              teaserContent={
                <div className="pt-4 border-t border-border space-y-3">
                  {vehicleCalculation.vehiclePrice && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Vehicle Price</span>
                      <span className="font-medium">
                        {CURRENCY_SYMBOLS[vehicleCalculation.vehicleCurrency] || '$'}{vehicleCalculation.vehiclePrice.toLocaleString()} {vehicleCalculation.vehicleCurrency}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping ({shippingMethod.toUpperCase()})</span>
                    <span className="font-medium">XXX.XX</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold pt-3 border-t border-border">
                    <span>{priceType === 'cif' ? 'CIF Total' : 'Duty Paid Total'}</span>
                    <span className="text-primary">From $X,XXX</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Est. Delivery: {shippingMethod === 'roro' ? (deliveryTimes?.vehicle_roro || DEFAULT_DELIVERY_TIMES.vehicle_roro) : (deliveryTimes?.vehicle_container || DEFAULT_DELIVERY_TIMES.vehicle_container)}</span>
                  </div>
                </div>
              }
              fullContent={
                <div className="pt-4 border-t border-border space-y-3 animate-fade-in">
                  {vehicleCalculation.vehiclePrice && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Vehicle Price</span>
                      <span className="font-medium">
                        {CURRENCY_SYMBOLS[vehicleCalculation.vehicleCurrency] || '$'}{vehicleCalculation.vehiclePrice.toLocaleString()} {vehicleCalculation.vehicleCurrency}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping ({shippingMethod.toUpperCase()})</span>
                    <span className="font-medium">
                      {vehicleCalculation.shippingSymbol}{vehicleCalculation.shippingCost.toLocaleString()} {vehicleCalculation.shippingCurrency}
                    </span>
                  </div>

                  {priceType === 'duty_paid' && vehicleCalculation.dutyCalculation && (
                    <>
                      <div
                        className="flex items-center justify-between text-sm cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded"
                        onClick={() => setShowDutyBreakdown(!showDutyBreakdown)}
                      >
                        <span className="text-muted-foreground flex items-center gap-1">
                          Import Duties & Taxes
                          {showDutyBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </span>
                        <span className="font-medium">
                          TZS {vehicleCalculation.dutyCalculation.totalDuties.toLocaleString()}
                        </span>
                      </div>

                      {showDutyBreakdown && (
                        <div className="ml-4 space-y-1.5 text-xs border-l-2 border-primary/20 pl-3 animate-fade-in">
                          {vehicleCalculation.dutyCalculation.breakdown.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-muted-foreground">
                              <span>{item.name} {item.rate && `(${item.rate})`}</span>
                              <span>TZS {item.amount.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex justify-between text-xl font-bold pt-3 border-t border-border">
                    <span>{priceType === 'cif' ? 'CIF Total' : 'Duty Paid Total'}</span>
                    <span className="text-primary">
                      {priceType === 'cif' ? (
                        <>{vehicleCalculation.shippingSymbol}{vehicleCalculation.totalCif.toLocaleString()} {vehicleCalculation.shippingCurrency}</>
                      ) : (
                        <>TZS {vehicleCalculation.totalDutyPaidTzs?.toLocaleString()}</>
                      )}
                    </span>
                  </div>

                  {priceType === 'duty_paid' && (
                    <p className="text-xs text-muted-foreground italic">
                      Based on Tanzania TRA duty rates. Actual duties may vary.
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                    <Clock className="h-4 w-4" />
                    <span>Est. Delivery: {shippingMethod === 'roro' ? (deliveryTimes?.vehicle_roro || DEFAULT_DELIVERY_TIMES.vehicle_roro) : (deliveryTimes?.vehicle_container || DEFAULT_DELIVERY_TIMES.vehicle_container)}</span>
                  </div>

                  <Button className="w-full h-12 text-base btn-gold group" asChild>
                    <a href="/customer">
                      Request Full Quote
                      <MoveRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                    </a>
                  </Button>
                </div>
              }
              title="Sign in to see vehicle shipping costs"
              description="Create a free account to view detailed pricing and duty breakdown."
              source="shipping_calculator"
            />
          )}
        </div>
      )}

      {!vehicleInfo && (
        <Button className="w-full h-12 text-base btn-gold group" asChild>
          <a href="/auth?mode=signup">
            Request Full Quote
            <MoveRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
          </a>
        </Button>
      )}

      <p className="text-xs text-center text-muted-foreground">
        * Final cost may vary based on vehicle dimensions and port fees.
      </p>
    </div>
  );
}
