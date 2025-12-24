import { useState, useEffect } from 'react';
import { Calculator, PackageSearch, MoveRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [region, setRegion] = useState<Region>('europe');
  const [weight, setWeight] = useState<string>('');
  const [pricing, setPricing] = useState<RegionPricing[]>([]);
  const [loading, setLoading] = useState(true);

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

  const selectedPricing = pricing.find(p => p.region === region);
  const weightNum = parseFloat(weight) || 0;
  
  const shippingCost = selectedPricing ? weightNum * selectedPricing.customer_rate_per_kg : 0;
  const handlingFee = selectedPricing?.handling_fee || 0;
  const total = shippingCost + handlingFee;
  const currency = selectedPricing?.currency || 'USD';
  const symbol = CURRENCY_SYMBOLS[currency] || '$';

  return (
    <section className="section-padding bg-muted/50 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div
            ref={leftRef}
            className={cn("scroll-animate-left", leftVisible && "visible")}
          >
            <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold text-sm uppercase tracking-wide mb-4">
              Pricing
            </span>
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              Get an Instant{' '}
              <span className="text-primary">Quote</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              Enter your shipment details to get an instant estimate. Our transparent pricing means no hidden fees – what you see is what you pay.
            </p>
            
            <div className="grid grid-cols-2 gap-6">
              <div 
                className={cn("p-4 bg-white rounded-xl shadow-sm scroll-animate", leftVisible && "visible")}
                style={{ transitionDelay: '200ms' }}
              >
                <p className="text-3xl font-bold text-brand-navy mb-1">6</p>
                <p className="text-sm text-muted-foreground">Origin Countries</p>
              </div>
              <div 
                className={cn("p-4 bg-white rounded-xl shadow-sm scroll-animate", leftVisible && "visible")}
                style={{ transitionDelay: '300ms' }}
              >
                <p className="text-3xl font-bold text-brand-navy mb-1">5+</p>
                <p className="text-sm text-muted-foreground">Years Experience</p>
              </div>
            </div>
          </div>

          {/* Calculator Card */}
          <div 
            ref={rightRef}
            className={cn(
              "bg-white rounded-2xl shadow-2xl p-8 border border-border/50 scroll-animate-right",
              rightVisible && "visible"
            )}
            style={{ transitionDelay: '150ms' }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                <Calculator className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-heading text-xl font-semibold">Shipping Calculator</h3>
                <p className="text-sm text-muted-foreground">Estimate your shipping cost</p>
              </div>
            </div>

            <div className="space-y-6">
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
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}