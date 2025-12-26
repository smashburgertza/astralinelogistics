import { useState, useEffect } from 'react';
import { Calculator, PackageSearch, MoveRight, Container, Car, Bike, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { REGIONS, CURRENCY_SYMBOLS, type Region } from '@/lib/constants';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

interface RegionPricing {
  region: Region;
  customer_rate_per_kg: number;
  handling_fee: number;
  currency: string;
}

// Container pricing estimates (base rates)
const CONTAINER_PRICING = {
  '20ft': {
    europe: { price: 2500, currency: 'GBP' },
    dubai: { price: 1800, currency: 'USD' },
    china: { price: 2200, currency: 'USD' },
    india: { price: 1900, currency: 'USD' },
    usa: { price: 3500, currency: 'USD' },
    uk: { price: 2400, currency: 'GBP' },
  },
  '40ft': {
    europe: { price: 4200, currency: 'GBP' },
    dubai: { price: 3200, currency: 'USD' },
    china: { price: 3800, currency: 'USD' },
    india: { price: 3400, currency: 'USD' },
    usa: { price: 5800, currency: 'USD' },
    uk: { price: 4000, currency: 'GBP' },
  },
} as const;

// Vehicle shipping pricing estimates
const VEHICLE_TYPES = {
  motorcycle: { label: 'Motorcycle', icon: 'bike', baseWeight: 200 },
  sedan: { label: 'Sedan / Hatchback', icon: 'car', baseWeight: 1400 },
  suv: { label: 'SUV / Crossover', icon: 'car', baseWeight: 2000 },
  truck: { label: 'Truck / Pickup', icon: 'truck', baseWeight: 2500 },
} as const;

const VEHICLE_PRICING = {
  roro: {
    motorcycle: { europe: 800, dubai: 600, china: 700, india: 650, usa: 1200, uk: 750, currency: 'USD' },
    sedan: { europe: 1500, dubai: 1100, china: 1300, india: 1200, usa: 2200, uk: 1400, currency: 'USD' },
    suv: { europe: 1800, dubai: 1400, china: 1600, india: 1500, usa: 2600, uk: 1700, currency: 'USD' },
    truck: { europe: 2200, dubai: 1800, china: 2000, india: 1900, usa: 3200, uk: 2100, currency: 'USD' },
  },
  container: {
    motorcycle: { europe: 1200, dubai: 900, china: 1000, india: 950, usa: 1600, uk: 1100, currency: 'USD' },
    sedan: { europe: 2500, dubai: 1900, china: 2200, india: 2000, usa: 3500, uk: 2400, currency: 'USD' },
    suv: { europe: 3000, dubai: 2400, china: 2700, india: 2500, usa: 4200, uk: 2900, currency: 'USD' },
    truck: { europe: 3800, dubai: 3000, china: 3400, india: 3200, usa: 5000, uk: 3600, currency: 'USD' },
  },
} as const;

type ContainerSize = '20ft' | '40ft';
type VehicleType = keyof typeof VEHICLE_TYPES;
type ShippingMethod = 'roro' | 'container';

export function PricingCalculator() {
  const [region, setRegion] = useState<Region>('europe');
  const [weight, setWeight] = useState<string>('');
  const [pricing, setPricing] = useState<RegionPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('loose-cargo');
  const [containerSize, setContainerSize] = useState<ContainerSize>('20ft');
  const [containerRegion, setContainerRegion] = useState<Region>('china');
  const [vehicleType, setVehicleType] = useState<VehicleType>('sedan');
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('roro');
  const [vehicleRegion, setVehicleRegion] = useState<Region>('dubai');

  const { ref: leftRef, isVisible: leftVisible } = useScrollAnimation();
  const { ref: rightRef, isVisible: rightVisible } = useScrollAnimation();

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    const { data } = await supabase
      .from('region_pricing')
      .select('region, customer_rate_per_kg, handling_fee, currency');
    
    if (data) {
      setPricing(data as RegionPricing[]);
    }
    setLoading(false);
  };

  // Loose cargo calculations
  const selectedPricing = pricing.find(p => p.region === region);
  const weightNum = parseFloat(weight) || 0;
  
  const shippingCost = selectedPricing ? weightNum * selectedPricing.customer_rate_per_kg : 0;
  const handlingFee = selectedPricing?.handling_fee || 0;
  const total = shippingCost + handlingFee;
  const currency = selectedPricing?.currency || 'USD';
  const symbol = CURRENCY_SYMBOLS[currency] || '$';

  // Container calculations
  const containerPricing = CONTAINER_PRICING[containerSize][containerRegion];
  const containerSymbol = CURRENCY_SYMBOLS[containerPricing.currency] || '$';

  // Vehicle calculations
  const vehiclePricing = VEHICLE_PRICING[shippingMethod][vehicleType];
  const vehiclePrice = vehiclePricing[vehicleRegion];
  const vehicleSymbol = CURRENCY_SYMBOLS[vehiclePricing.currency] || '$';

  return (
    <section className="section-padding bg-muted/50 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Content */}
          <div
            ref={leftRef}
            className={cn("scroll-animate-left text-center lg:text-left", leftVisible && "visible")}
          >
            <span className="inline-block px-3 sm:px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold text-xs sm:text-sm uppercase tracking-wide mb-4">
              Pricing
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6">
              Get an Instant{' '}
              <span className="text-primary">Quote</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base lg:text-lg mb-6 sm:mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Enter your shipment details to get an instant estimate. Our transparent pricing means no hidden fees – what you see is what you pay.
            </p>
            
            <div className="grid grid-cols-2 gap-4 sm:gap-6 max-w-sm mx-auto lg:mx-0">
              <div 
                className={cn("p-3 sm:p-4 bg-white rounded-xl shadow-sm scroll-animate", leftVisible && "visible")}
                style={{ transitionDelay: '200ms' }}
              >
                <p className="text-2xl sm:text-3xl font-bold text-brand-navy mb-1">6</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Origin Countries</p>
              </div>
              <div 
                className={cn("p-3 sm:p-4 bg-white rounded-xl shadow-sm scroll-animate", leftVisible && "visible")}
                style={{ transitionDelay: '300ms' }}
              >
                <p className="text-2xl sm:text-3xl font-bold text-brand-navy mb-1">5+</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Years Experience</p>
              </div>
            </div>
          </div>

          {/* Calculator Card */}
          <div 
            ref={rightRef}
            className={cn(
              "bg-white rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl p-5 sm:p-8 border border-border/50 scroll-animate-right",
              rightVisible && "visible"
            )}
            style={{ transitionDelay: '150ms' }}
          >
            <div className="flex items-center gap-3 mb-5 sm:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-primary flex items-center justify-center">
                <Calculator className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-heading text-lg sm:text-xl font-semibold">Shipping Calculator</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Estimate your shipping cost</p>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="loose-cargo" className="flex items-center gap-1.5 text-xs sm:text-sm">
                  <PackageSearch className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Loose Cargo</span>
                  <span className="sm:hidden">Loose</span>
                </TabsTrigger>
                <TabsTrigger value="full-containers" className="flex items-center gap-1.5 text-xs sm:text-sm">
                  <Container className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Full Containers</span>
                  <span className="sm:hidden">Container</span>
                </TabsTrigger>
                <TabsTrigger value="vehicles" className="flex items-center gap-1.5 text-xs sm:text-sm">
                  <Car className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Vehicles</span>
                </TabsTrigger>
              </TabsList>

              {/* Loose Cargo Tab */}
              <TabsContent value="loose-cargo" className="space-y-4 sm:space-y-6 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="origin" className="text-sm font-medium">Origin Region</Label>
                  <Select value={region} onValueChange={(v) => setRegion(v as Region)}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select origin" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(REGIONS).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <span className="text-lg">{value.flag}</span>
                            {value.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight" className="text-sm font-medium">Weight (kg)</Label>
                  <div className="relative">
                    <PackageSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="weight"
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

                {weightNum > 0 && selectedPricing && (
                  <div className="pt-4 border-t border-border space-y-3 animate-fade-in">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Shipping ({symbol}{selectedPricing.customer_rate_per_kg}/kg × {weightNum}kg)
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
                  </div>
                )}

                <Button className="w-full h-12 text-base btn-gold group" asChild>
                  <a href="/auth?mode=signup">
                    Request Full Quote
                    <MoveRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                  </a>
                </Button>
                
                <p className="text-xs text-center text-muted-foreground">
                  * Final cost may vary based on actual weight and customs duties.
                </p>
              </TabsContent>

              {/* Full Containers Tab */}
              <TabsContent value="full-containers" className="space-y-4 sm:space-y-6 mt-0">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Container Size</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setContainerSize('20ft')}
                      className={cn(
                        "p-4 rounded-lg border-2 transition-all text-left",
                        containerSize === '20ft'
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Container className="w-5 h-5 text-primary" />
                        <span className="font-semibold">20ft Container</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Up to 28 CBM / 21,700 kg</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setContainerSize('40ft')}
                      className={cn(
                        "p-4 rounded-lg border-2 transition-all text-left",
                        containerSize === '40ft'
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Container className="w-6 h-6 text-primary" />
                        <span className="font-semibold">40ft Container</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Up to 67 CBM / 26,500 kg</p>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Origin Region</Label>
                  <Select value={containerRegion} onValueChange={(v) => setContainerRegion(v as Region)}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select origin" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(REGIONS).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <span className="text-lg">{value.flag}</span>
                            {value.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4 border-t border-border space-y-3 animate-fade-in">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Container Type</span>
                    <span className="font-medium">{containerSize} Standard</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Origin</span>
                    <span className="font-medium">{REGIONS[containerRegion].label}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold pt-3 border-t border-border">
                    <span>Estimated Cost</span>
                    <span className="text-primary">
                      {containerSymbol}{containerPricing.price.toLocaleString()} {containerPricing.currency}
                    </span>
                  </div>
                </div>

                <Button className="w-full h-12 text-base btn-gold group" asChild>
                  <a href="/contact">
                    Request Container Quote
                    <MoveRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                  </a>
                </Button>
                
                <p className="text-xs text-center text-muted-foreground">
                  * Prices are estimates. Final cost depends on cargo type, destination, and current rates.
                </p>
              </TabsContent>

              {/* Vehicles Tab */}
              <TabsContent value="vehicles" className="space-y-4 sm:space-y-6 mt-0">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Vehicle Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(VEHICLE_TYPES) as [VehicleType, typeof VEHICLE_TYPES[VehicleType]][]).map(([key, value]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setVehicleType(key)}
                        className={cn(
                          "p-3 rounded-lg border-2 transition-all text-left",
                          vehicleType === key
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {key === 'motorcycle' ? (
                            <Bike className="w-4 h-4 text-primary" />
                          ) : key === 'truck' ? (
                            <Truck className="w-4 h-4 text-primary" />
                          ) : (
                            <Car className="w-4 h-4 text-primary" />
                          )}
                          <span className="font-medium text-sm">{value.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Shipping Method</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setShippingMethod('roro')}
                      className={cn(
                        "p-4 rounded-lg border-2 transition-all text-left",
                        shippingMethod === 'roro'
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <span className="font-semibold text-sm">RoRo (Roll-on/Roll-off)</span>
                      <p className="text-xs text-muted-foreground mt-1">Drive on/off ship. More economical.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShippingMethod('container')}
                      className={cn(
                        "p-4 rounded-lg border-2 transition-all text-left",
                        shippingMethod === 'container'
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <span className="font-semibold text-sm">Container Shipping</span>
                      <p className="text-xs text-muted-foreground mt-1">Enclosed container. More protected.</p>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Origin Region</Label>
                  <Select value={vehicleRegion} onValueChange={(v) => setVehicleRegion(v as Region)}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select origin" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(REGIONS).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <span className="text-lg">{value.flag}</span>
                            {value.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4 border-t border-border space-y-3 animate-fade-in">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Vehicle</span>
                    <span className="font-medium">{VEHICLE_TYPES[vehicleType].label}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Method</span>
                    <span className="font-medium">{shippingMethod === 'roro' ? 'RoRo' : 'Container'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Origin</span>
                    <span className="font-medium">{REGIONS[vehicleRegion].label}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold pt-3 border-t border-border">
                    <span>Estimated Cost</span>
                    <span className="text-primary">
                      {vehicleSymbol}{vehiclePrice.toLocaleString()} {vehiclePricing.currency}
                    </span>
                  </div>
                </div>

                <Button className="w-full h-12 text-base btn-gold group" asChild>
                  <a href="/contact">
                    Request Vehicle Quote
                    <MoveRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                  </a>
                </Button>
                
                <p className="text-xs text-center text-muted-foreground">
                  * Prices are estimates. Final cost depends on vehicle condition, exact dimensions, and current rates.
                </p>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </section>
  );
}