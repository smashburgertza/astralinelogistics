import { useState, useEffect } from 'react';
import { Calculator, PackageSearch, MoveRight, Ship, Plane } from 'lucide-react';
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

export function PricingCalculator() {
  const [seaRegion, setSeaRegion] = useState<Region>('china');
  const [seaWeight, setSeaWeight] = useState<string>('');
  const [airRegion, setAirRegion] = useState<Region>('dubai');
  const [airWeight, setAirWeight] = useState<string>('');
  const [pricing, setPricing] = useState<RegionPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sea-cargo');

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

  // Sea cargo calculations
  const seaPricing = pricing.find(p => p.region === seaRegion);
  const seaWeightNum = parseFloat(seaWeight) || 0;
  const seaShippingCost = seaPricing ? seaWeightNum * seaPricing.customer_rate_per_kg : 0;
  const seaHandlingFee = seaPricing?.handling_fee || 0;
  const seaTotal = seaShippingCost + seaHandlingFee;
  const seaCurrency = seaPricing?.currency || 'USD';
  const seaSymbol = CURRENCY_SYMBOLS[seaCurrency] || '$';

  // Air cargo calculations (using same pricing structure but could be different rates in future)
  const airPricing = pricing.find(p => p.region === airRegion);
  const airWeightNum = parseFloat(airWeight) || 0;
  const airShippingCost = airPricing ? airWeightNum * airPricing.customer_rate_per_kg : 0;
  const airHandlingFee = airPricing?.handling_fee || 0;
  const airTotal = airShippingCost + airHandlingFee;
  const airCurrency = airPricing?.currency || 'USD';
  const airSymbol = CURRENCY_SYMBOLS[airCurrency] || '$';

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
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="sea-cargo" className="flex items-center gap-2 text-sm">
                  <Ship className="w-4 h-4" />
                  <span>Sea Cargo</span>
                </TabsTrigger>
                <TabsTrigger value="air-cargo" className="flex items-center gap-2 text-sm">
                  <Plane className="w-4 h-4" />
                  <span>Air Cargo</span>
                </TabsTrigger>
              </TabsList>

              {/* Sea Cargo Tab */}
              <TabsContent value="sea-cargo" className="space-y-4 sm:space-y-6 mt-0">
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <Ship className="w-5 h-5 text-blue-600" />
                  <p className="text-sm text-blue-700">Ocean freight - economical for larger shipments</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sea-origin" className="text-sm font-medium">Origin Region</Label>
                  <Select value={seaRegion} onValueChange={(v) => setSeaRegion(v as Region)}>
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
                  <Label htmlFor="sea-weight" className="text-sm font-medium">Weight (kg)</Label>
                  <div className="relative">
                    <PackageSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="sea-weight"
                      type="number"
                      placeholder="Enter weight in kg"
                      className="h-12 pl-12 text-base"
                      value={seaWeight}
                      onChange={(e) => setSeaWeight(e.target.value)}
                      min="0"
                      step="0.1"
                    />
                  </div>
                </div>

                {seaWeightNum > 0 && seaPricing && (
                  <div className="pt-4 border-t border-border space-y-3 animate-fade-in">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Shipping ({seaSymbol}{seaPricing.customer_rate_per_kg}/kg × {seaWeightNum}kg)
                      </span>
                      <span className="font-medium">{seaSymbol}{seaShippingCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Handling Fee</span>
                      <span className="font-medium">{seaSymbol}{seaHandlingFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold pt-3 border-t border-border">
                      <span>Estimated Total</span>
                      <span className="text-primary">{seaSymbol}{seaTotal.toFixed(2)} {seaCurrency}</span>
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
                  * Final cost may vary based on actual weight, volume, and customs duties.
                </p>
              </TabsContent>

              {/* Air Cargo Tab */}
              <TabsContent value="air-cargo" className="space-y-4 sm:space-y-6 mt-0">
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <Plane className="w-5 h-5 text-amber-600" />
                  <p className="text-sm text-amber-700">Air freight - fast delivery for urgent shipments</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="air-origin" className="text-sm font-medium">Origin Region</Label>
                  <Select value={airRegion} onValueChange={(v) => setAirRegion(v as Region)}>
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
                  <Label htmlFor="air-weight" className="text-sm font-medium">Weight (kg)</Label>
                  <div className="relative">
                    <PackageSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="air-weight"
                      type="number"
                      placeholder="Enter weight in kg"
                      className="h-12 pl-12 text-base"
                      value={airWeight}
                      onChange={(e) => setAirWeight(e.target.value)}
                      min="0"
                      step="0.1"
                    />
                  </div>
                </div>

                {airWeightNum > 0 && airPricing && (
                  <div className="pt-4 border-t border-border space-y-3 animate-fade-in">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Shipping ({airSymbol}{airPricing.customer_rate_per_kg}/kg × {airWeightNum}kg)
                      </span>
                      <span className="font-medium">{airSymbol}{airShippingCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Handling Fee</span>
                      <span className="font-medium">{airSymbol}{airHandlingFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold pt-3 border-t border-border">
                      <span>Estimated Total</span>
                      <span className="text-primary">{airSymbol}{airTotal.toFixed(2)} {airCurrency}</span>
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
                  * Final cost may vary based on actual weight, volumetric weight, and customs duties.
                </p>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </section>
  );
}
