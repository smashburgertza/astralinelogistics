import { useState, useEffect } from 'react';
import { Calculator, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { REGIONS, CURRENCY_SYMBOLS, type Region } from '@/lib/constants';

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
    <section className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Instant Quote Calculator</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Get an instant estimate for your shipment. Enter your origin and weight to see the cost.
          </p>
        </div>

        <Card className="max-w-xl mx-auto shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              Calculate Your Shipping Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="origin">Origin Region</Label>
                <Select value={region} onValueChange={(v) => setRegion(v as Region)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select origin" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(REGIONS).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value.flag} {value.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="weight"
                    type="number"
                    placeholder="Enter weight in kg"
                    className="pl-10"
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
                    <span className="text-muted-foreground">Shipping ({symbol}{selectedPricing.customer_rate_per_kg}/kg × {weightNum}kg)</span>
                    <span>{symbol}{shippingCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Handling Fee</span>
                    <span>{symbol}{handlingFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold pt-2 border-t border-border">
                    <span>Estimated Total</span>
                    <span className="text-primary">{symbol}{total.toFixed(2)} {currency}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    * Final cost may vary based on actual weight and customs duties.
                  </p>
                </div>
              )}

              <Button className="w-full" size="lg" asChild>
                <a href="/auth?mode=signup">Request Full Quote</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
