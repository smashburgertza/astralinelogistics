import { useState, useEffect, useMemo } from 'react';
import { Calculator, PackageSearch, MoveRight, Ship, Plane, Container, Package, Car, Link2, Loader2, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { REGIONS, CURRENCY_SYMBOLS, type Region } from '@/lib/constants';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { useVehicleDutyRates } from '@/hooks/useVehicleDutyRates';
import { useDeliveryTimes } from '@/hooks/useDeliveryTimes';
import { useAuth } from '@/hooks/useAuth';
import { InlineAuthGate } from '@/components/auth/InlineAuthGate';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
interface RegionPricing {
  region: Region;
  customer_rate_per_kg: number;
  handling_fee: number;
  currency: string;
}

interface ContainerPricing {
  id: string;
  container_size: '20ft' | '40ft';
  region: Region;
  price: number;
  currency: string;
}

interface VehiclePricing {
  id: string;
  vehicle_type: 'motorcycle' | 'sedan' | 'suv' | 'truck';
  shipping_method: 'roro' | 'container';
  region: Region;
  price: number;
  currency: string;
}

interface VehicleInfo {
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

// Currency exchange rates to TZS (approximate)
const EXCHANGE_RATES_TO_TZS: Record<string, number> = {
  USD: 2500,
  GBP: 3150,
  EUR: 2700,
  AED: 680,
  JPY: 17,
  CNY: 345,
  INR: 30,
  TZS: 1,
};

export function PricingCalculator() {
  const [activeTab, setActiveTab] = useState('sea-cargo');
  const [seaSubTab, setSeaSubTab] = useState('loose-cargo');
  
  // Loose cargo state
  const [looseRegion, setLooseRegion] = useState<Region>('china');
  const [looseWeight, setLooseWeight] = useState<string>('');
  
  // Full container state
  const [containerRegion, setContainerRegion] = useState<Region>('china');
  const [containerSize, setContainerSize] = useState<'20ft' | '40ft'>('20ft');
  
  // Vehicle state
  const [vehicleUrl, setVehicleUrl] = useState('');
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo | null>(null);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [vehicleShippingMethod, setVehicleShippingMethod] = useState<'roro' | 'container'>('roro');
  const [vehiclePriceType, setVehiclePriceType] = useState<'cif' | 'duty_paid'>('cif');
  const [showDutyBreakdown, setShowDutyBreakdown] = useState(false);
  
  // Air cargo state
  const [airRegion, setAirRegion] = useState<Region>('dubai');
  const [airWeight, setAirWeight] = useState<string>('');
  
  // Pricing data
  const [pricing, setPricing] = useState<RegionPricing[]>([]);
  const [containerPricing, setContainerPricing] = useState<ContainerPricing[]>([]);
  const [vehiclePricing, setVehiclePricing] = useState<VehiclePricing[]>([]);
  const [loading, setLoading] = useState(true);

  // Duty rates and delivery times hooks
  const { calculateDuties, dutyRates } = useVehicleDutyRates();
  const { times: deliveryTimes } = useDeliveryTimes();

  const { ref: leftRef, isVisible: leftVisible } = useScrollAnimation();
  const { ref: rightRef, isVisible: rightVisible } = useScrollAnimation();

  useEffect(() => {
    fetchAllPricing();
  }, []);

  const fetchAllPricing = async () => {
    const [regionData, containerData, vehicleData] = await Promise.all([
      supabase.from('region_pricing').select('region, customer_rate_per_kg, handling_fee, currency'),
      supabase.from('container_pricing').select('*'),
      supabase.from('vehicle_pricing').select('*'),
    ]);
    
    if (regionData.data) setPricing(regionData.data as RegionPricing[]);
    if (containerData.data) setContainerPricing(containerData.data as ContainerPricing[]);
    if (vehicleData.data) setVehiclePricing(vehicleData.data as VehiclePricing[]);
    setLoading(false);
  };

  // Loose cargo calculations
  const loosePricing = pricing.find(p => p.region === looseRegion);
  const looseWeightNum = parseFloat(looseWeight) || 0;
  const looseShippingCost = loosePricing ? looseWeightNum * loosePricing.customer_rate_per_kg : 0;
  const looseHandlingFee = loosePricing?.handling_fee || 0;
  const looseTotal = looseShippingCost + looseHandlingFee;
  const looseCurrency = loosePricing?.currency || 'USD';
  const looseSymbol = CURRENCY_SYMBOLS[looseCurrency] || '$';

  // Full container calculations
  const containerPricingItem = containerPricing.find(
    p => p.region === containerRegion && p.container_size === containerSize
  );
  const containerTotal = containerPricingItem?.price || 0;
  const containerCurrency = containerPricingItem?.currency || 'USD';
  const containerSymbol = CURRENCY_SYMBOLS[containerCurrency] || '$';

  // Parse engine CC from vehicle info
  const parseEngineCc = (engineStr?: string | null): number | undefined => {
    if (!engineStr) return undefined;
    // Match patterns like "2.0L", "2000cc", "2.0 Litre", etc.
    const match = engineStr.match(/(\d+\.?\d*)\s*(L|litre|liter|cc)/i);
    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[2].toLowerCase();
      // Convert liters to cc (1L = 1000cc)
      return unit === 'cc' ? value : value * 1000;
    }
    // Try pure number (assume cc)
    const numMatch = engineStr.match(/(\d{3,4})/);
    if (numMatch) return parseInt(numMatch[1]);
    return undefined;
  };

  // Vehicle calculations with proper duty calculation
  const vehicleCalculation = useMemo(() => {
    if (!vehicleInfo) return null;
    
    const region = vehicleInfo.origin_region as Region || 'usa';
    const vehicleType = vehicleInfo.vehicle_type || 'sedan';
    
    // Get shipping pricing
    const shippingPricing = vehiclePricing.find(
      p => p.region === region && 
           p.vehicle_type === vehicleType && 
           p.shipping_method === vehicleShippingMethod
    );
    
    if (!shippingPricing) return null;
    
    const shippingCost = shippingPricing.price;
    const shippingCurrency = shippingPricing.currency;
    const shippingSymbol = CURRENCY_SYMBOLS[shippingCurrency] || '$';
    
    // If CIF only, just return shipping cost
    if (vehiclePriceType === 'cif') {
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
    
    // For Duty Paid, calculate CIF value in TZS then apply duties
    const vehiclePriceInCurrency = vehicleInfo.price || 0;
    const vehicleCurrencyRate = EXCHANGE_RATES_TO_TZS[vehicleInfo.currency] || 1;
    const shippingCurrencyRate = EXCHANGE_RATES_TO_TZS[shippingCurrency] || 1;
    
    // CIF value in TZS = Vehicle Price + Shipping (converted to TZS)
    const vehiclePriceTzs = vehiclePriceInCurrency * vehicleCurrencyRate;
    const shippingCostTzs = shippingCost * shippingCurrencyRate;
    const cifValueTzs = vehiclePriceTzs + shippingCostTzs;
    
    // Parse engine CC
    const engineCc = vehicleInfo.engine_cc || parseEngineCc(vehicleInfo.engine);
    
    // Determine if utility vehicle (trucks, vans)
    const isUtility = vehicleType === 'truck';
    
    // Calculate duties using the hook
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
  }, [vehicleInfo, vehiclePricing, vehicleShippingMethod, vehiclePriceType, calculateDuties]);

  // Air cargo calculations
  const airPricing = pricing.find(p => p.region === airRegion);
  const airWeightNum = parseFloat(airWeight) || 0;
  const airShippingCost = airPricing ? airWeightNum * airPricing.customer_rate_per_kg : 0;
  const airHandlingFee = airPricing?.handling_fee || 0;
  const airTotal = airShippingCost + airHandlingFee;
  const airCurrency = airPricing?.currency || 'USD';
  const airSymbol = CURRENCY_SYMBOLS[airCurrency] || '$';

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
              <TabsContent value="sea-cargo" className="mt-0">
                {/* Sea Cargo Sub-tabs */}
                <Tabs value={seaSubTab} onValueChange={setSeaSubTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-4 h-auto">
                    <TabsTrigger value="full-container" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
                      <Container className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Full</span> Container
                    </TabsTrigger>
                    <TabsTrigger value="loose-cargo" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
                      <Package className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Loose</span> Cargo
                    </TabsTrigger>
                    <TabsTrigger value="vehicles" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
                      <Car className="w-3.5 h-3.5" />
                      Vehicles
                    </TabsTrigger>
                  </TabsList>

                  {/* Full Container Sub-tab */}
                  <TabsContent value="full-container" className="space-y-4 mt-0">
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
                        <Select value={containerRegion} onValueChange={(v) => setContainerRegion(v as Region)}>
                          <SelectTrigger className="h-12">
                            <SelectValue />
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
                    </div>

                    {containerPricingItem && (
                      <InlineAuthGate
                        teaserContent={
                          <div className="pt-4 border-t border-border space-y-3">
                            <div className="flex justify-between text-xl font-bold">
                              <span>Estimated Cost</span>
                              <span className="text-primary">Starting from {containerSymbol}XXX</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>Est. Delivery: {deliveryTimes.full_container}</span>
                            </div>
                          </div>
                        }
                        fullContent={
                          <div className="pt-4 border-t border-border space-y-3 animate-fade-in">
                            <div className="flex justify-between text-xl font-bold">
                              <span>Estimated Cost</span>
                              <span className="text-primary">{containerSymbol}{containerTotal.toLocaleString()} {containerCurrency}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>Est. Delivery: {deliveryTimes.full_container}</span>
                            </div>
                            <Button className="w-full h-12 text-base btn-gold group" asChild>
                              <a href="/customer">
                                Request Full Quote
                                <MoveRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                              </a>
                            </Button>
                          </div>
                        }
                        title="Sign in to see exact pricing"
                        description="Create a free account to view your full container shipping quote."
                        source="shipping_calculator"
                      />
                    )}

                    {!containerPricingItem && (
                      <Button className="w-full h-12 text-base btn-gold group" asChild>
                        <a href="/auth?mode=signup">
                          Request Full Quote
                          <MoveRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                        </a>
                      </Button>
                    )}
                  </TabsContent>

                  {/* Loose Cargo Sub-tab */}
                  <TabsContent value="loose-cargo" className="space-y-4 mt-0">
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <Package className="w-5 h-5 text-blue-600 shrink-0" />
                      <p className="text-sm text-blue-700">LCL shipping - share container space</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Origin Region</Label>
                      <Select value={looseRegion} onValueChange={(v) => setLooseRegion(v as Region)}>
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
                      <Label className="text-sm font-medium">Weight (kg)</Label>
                      <div className="relative">
                        <PackageSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          type="number"
                          placeholder="Enter weight in kg"
                          className="h-12 pl-12 text-base"
                          value={looseWeight}
                          onChange={(e) => setLooseWeight(e.target.value)}
                          min="0"
                          step="0.1"
                        />
                      </div>
                    </div>

                    {looseWeightNum > 0 && loosePricing && (
                      <InlineAuthGate
                        teaserContent={
                          <div className="pt-4 border-t border-border space-y-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Shipping ({looseSymbol}X.XX/kg × {looseWeightNum}kg)</span>
                              <span className="font-medium">{looseSymbol}XXX.XX</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Handling Fee</span>
                              <span className="font-medium">{looseSymbol}XX.XX</span>
                            </div>
                            <div className="flex justify-between text-xl font-bold pt-3 border-t border-border">
                              <span>Estimated Total</span>
                              <span className="text-primary">From {looseSymbol}XXX {looseCurrency}</span>
                            </div>
                          </div>
                        }
                        fullContent={
                          <div className="pt-4 border-t border-border space-y-3 animate-fade-in">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Shipping ({looseSymbol}{loosePricing.customer_rate_per_kg}/kg × {looseWeightNum}kg)
                              </span>
                              <span className="font-medium">{looseSymbol}{looseShippingCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Handling Fee</span>
                              <span className="font-medium">{looseSymbol}{looseHandlingFee.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xl font-bold pt-3 border-t border-border">
                              <span>Estimated Total</span>
                              <span className="text-primary">{looseSymbol}{looseTotal.toFixed(2)} {looseCurrency}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>Est. Delivery: {deliveryTimes.sea_cargo}</span>
                            </div>
                            <Button className="w-full h-12 text-base btn-gold group" asChild>
                              <a href="/customer">
                                Request Full Quote
                                <MoveRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                              </a>
                            </Button>
                          </div>
                        }
                        title="Sign in to see your quote"
                        description="Create a free account to view exact shipping costs."
                        source="shipping_calculator"
                      />
                    )}

                    {!(looseWeightNum > 0 && loosePricing) && (
                      <Button className="w-full h-12 text-base btn-gold group" asChild>
                        <a href="/auth?mode=signup">
                          Request Full Quote
                          <MoveRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                        </a>
                      </Button>
                    )}
                  </TabsContent>

                  {/* Vehicles Sub-tab */}
                  <TabsContent value="vehicles" className="space-y-4 mt-0">
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <Car className="w-5 h-5 text-blue-600 shrink-0" />
                      <p className="text-sm text-blue-700">Ship vehicles via RoRo or container</p>
                    </div>

                    {/* Vehicle URL Input */}
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
                          {vehicleLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            'Fetch'
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Paste a link from AutoTrader, eBay Motors, Copart, CarGurus, etc.
                      </p>
                    </div>

                    {/* Loading State */}
                    {vehicleLoading && (
                      <div className="flex flex-col items-center justify-center py-8 space-y-3 animate-fade-in">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        <p className="text-sm font-medium text-muted-foreground">Analyzing vehicle listing...</p>
                        <p className="text-xs text-muted-foreground/70">Extracting make, model, year, and pricing</p>
                      </div>
                    )}

                    {/* Vehicle Info Display */}
                    {!vehicleLoading && vehicleInfo && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-3">
                          {/* Vehicle Image */}
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
                          
                          {/* Vehicle Details */}
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

                        {/* Shipping Options */}
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Shipping Method</Label>
                          <RadioGroup 
                            value={vehicleShippingMethod} 
                            onValueChange={(v) => setVehicleShippingMethod(v as 'roro' | 'container')}
                            className="grid grid-cols-2 gap-3"
                          >
                            <Label 
                              htmlFor="roro" 
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                vehicleShippingMethod === 'roro' 
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
                                vehicleShippingMethod === 'container' 
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
                            value={vehiclePriceType} 
                            onValueChange={(v) => setVehiclePriceType(v as 'cif' | 'duty_paid')}
                            className="grid grid-cols-2 gap-3"
                          >
                            <Label 
                              htmlFor="cif" 
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                vehiclePriceType === 'cif' 
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
                                vehiclePriceType === 'duty_paid' 
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

                        {/* Vehicle Pricing */}
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
                                  <span className="text-muted-foreground">Shipping ({vehicleShippingMethod.toUpperCase()})</span>
                                  <span className="font-medium">XXX.XX</span>
                                </div>
                                <div className="flex justify-between text-xl font-bold pt-3 border-t border-border">
                                  <span>{vehiclePriceType === 'cif' ? 'CIF Total' : 'Duty Paid Total'}</span>
                                  <span className="text-primary">From $X,XXX</span>
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
                                  <span className="text-muted-foreground">
                                    Shipping ({vehicleShippingMethod.toUpperCase()})
                                  </span>
                                  <span className="font-medium">
                                    {vehicleCalculation.shippingSymbol}{vehicleCalculation.shippingCost.toLocaleString()} {vehicleCalculation.shippingCurrency}
                                  </span>
                                </div>

                                {/* Duty Breakdown for Duty Paid option */}
                                {vehiclePriceType === 'duty_paid' && vehicleCalculation.dutyCalculation && (
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
                                  <span>{vehiclePriceType === 'cif' ? 'CIF Total' : 'Duty Paid Total'}</span>
                                  <span className="text-primary">
                                    {vehiclePriceType === 'cif' ? (
                                      <>
                                        {vehicleCalculation.shippingSymbol}{vehicleCalculation.totalCif.toLocaleString()} {vehicleCalculation.shippingCurrency}
                                      </>
                                    ) : (
                                      <>TZS {vehicleCalculation.totalDutyPaidTzs?.toLocaleString()}</>
                                    )}
                                  </span>
                                </div>

                                {vehiclePriceType === 'duty_paid' && (
                                  <p className="text-xs text-muted-foreground italic">
                                    Based on Tanzania TRA duty rates. Actual duties may vary.
                                  </p>
                                )}

                                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                                  <Clock className="h-4 w-4" />
                                  <span>Est. Delivery: {vehicleShippingMethod === 'roro' ? deliveryTimes.vehicle_roro : deliveryTimes.vehicle_container}</span>
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
                  </TabsContent>
                </Tabs>
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
                  <InlineAuthGate
                    teaserContent={
                      <div className="pt-4 border-t border-border space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Shipping ({airSymbol}X.XX/kg × {airWeightNum}kg)</span>
                          <span className="font-medium">{airSymbol}XXX.XX</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Handling Fee</span>
                          <span className="font-medium">{airSymbol}XX.XX</span>
                        </div>
                        <div className="flex justify-between text-xl font-bold pt-3 border-t border-border">
                          <span>Estimated Total</span>
                          <span className="text-primary">From {airSymbol}XXX {airCurrency}</span>
                        </div>
                      </div>
                    }
                    fullContent={
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
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>Est. Delivery: {deliveryTimes.air_cargo}</span>
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

                {!(airWeightNum > 0 && airPricing) && (
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
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </section>
  );
}
