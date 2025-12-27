import { useState, useEffect } from 'react';
import { Calculator, Ship, Plane, Container, Package, Car, Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { useActiveRegions } from '@/hooks/useRegions';
import { useRegionPricing } from '@/hooks/useRegionPricing';
import { useContainerPricing } from '@/hooks/useContainerPricing';
import { useVehiclePricing } from '@/hooks/useVehiclePricing';
import { useRegionDeliveryTimesByRegion } from '@/hooks/useRegionDeliveryTimes';
import { useExchangeRatesMap } from '@/hooks/useExchangeRates';
import { cn } from '@/lib/utils';
import { LooseCargoCalculator } from './calculator/LooseCargoCalculator';
import { ContainerCalculator } from './calculator/ContainerCalculator';
import { VehicleCalculator } from './calculator/VehicleCalculator';
import { AirCargoCalculator } from './calculator/AirCargoCalculator';
import type { RegionPricing, ContainerPricingItem, VehiclePricingItem } from './calculator/types';

export function PricingCalculator() {
  const [activeTab, setActiveTab] = useState('sea-cargo');
  const [seaSubTab, setSeaSubTab] = useState('loose-cargo');
  const [airSubTab, setAirSubTab] = useState('door-to-door');
  
  const [looseRegionId, setLooseRegionId] = useState<string>('');
  const [looseWeight, setLooseWeight] = useState<string>('');
  const [containerRegionId, setContainerRegionId] = useState<string>('');
  const [containerSize, setContainerSize] = useState<'20ft' | '40ft'>('20ft');
  const [airRegionId, setAirRegionId] = useState<string>('');
  const [airWeight, setAirWeight] = useState<string>('');

  const { data: seaPricingData } = useRegionPricing('sea');
  const { data: airD2DPricingData } = useRegionPricing('air', 'door_to_door');
  const { data: airA2APricingData } = useRegionPricing('air', 'airport_to_airport');
  const { containerPricing: containerPricingData } = useContainerPricing();
  const { vehiclePricing: vehiclePricingData } = useVehiclePricing();
  const { data: regions } = useActiveRegions();
  const { rates: exchangeRates } = useExchangeRatesMap();

  const seaPricing = (seaPricingData || []).map(p => ({
    region: p.region,
    region_id: p.region_id,
    customer_rate_per_kg: p.customer_rate_per_kg,
    handling_fee: p.handling_fee,
    currency: p.currency,
  })) as RegionPricing[];

  const airD2DPricing = (airD2DPricingData || []).map(p => ({
    region: p.region,
    region_id: p.region_id,
    customer_rate_per_kg: p.customer_rate_per_kg,
    handling_fee: p.handling_fee,
    currency: p.currency,
  })) as RegionPricing[];

  const airA2APricing = (airA2APricingData || []).map(p => ({
    region: p.region,
    region_id: p.region_id,
    customer_rate_per_kg: p.customer_rate_per_kg,
    handling_fee: p.handling_fee,
    currency: p.currency,
  })) as RegionPricing[];

  const containerPricing = (containerPricingData || []).map(p => ({
    id: p.id,
    container_size: p.container_size as '20ft' | '40ft',
    region: p.region,
    region_id: (p as any).region_id || null,
    price: p.price,
    currency: p.currency,
  })) as ContainerPricingItem[];

  const vehiclePricing = (vehiclePricingData || []).map(p => ({
    id: p.id,
    vehicle_type: p.vehicle_type as 'motorcycle' | 'sedan' | 'suv' | 'truck',
    shipping_method: p.shipping_method as 'roro' | 'container',
    region: p.region,
    region_id: p.region_id,
    price: p.price,
    currency: p.currency,
  })) as VehiclePricingItem[];

  const { data: looseDeliveryTimes } = useRegionDeliveryTimesByRegion(looseRegionId);
  const { data: containerDeliveryTimes } = useRegionDeliveryTimesByRegion(containerRegionId);
  const { data: airDeliveryTimes } = useRegionDeliveryTimesByRegion(airRegionId);

  const { ref: leftRef, isVisible: leftVisible } = useScrollAnimation();
  const { ref: rightRef, isVisible: rightVisible } = useScrollAnimation();

  useEffect(() => {
    if (regions && regions.length > 0 && !looseRegionId) {
      const defaultRegion = regions[0];
      setLooseRegionId(defaultRegion.id);
      setContainerRegionId(defaultRegion.id);
      setAirRegionId(defaultRegion.id);
    }
  }, [regions, looseRegionId]);

  return (
    <section className="section-padding bg-muted/50 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div ref={leftRef} className={cn("scroll-animate-left text-center lg:text-left", leftVisible && "visible")}>
            <span className="inline-block px-3 sm:px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold text-xs sm:text-sm uppercase tracking-wide mb-4">
              Pricing
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6">
              Get an Instant <span className="text-primary">Quote</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base lg:text-lg mb-6 sm:mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Enter your shipment details to get an instant estimate. Our transparent pricing means no hidden fees – what you see is what you pay.
            </p>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 max-w-sm mx-auto lg:mx-0">
              <div className={cn("p-3 sm:p-4 bg-white rounded-xl shadow-sm scroll-animate", leftVisible && "visible")} style={{ transitionDelay: '200ms' }}>
                <p className="text-2xl sm:text-3xl font-bold text-brand-navy mb-1">6</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Origin Countries</p>
              </div>
              <div className={cn("p-3 sm:p-4 bg-white rounded-xl shadow-sm scroll-animate", leftVisible && "visible")} style={{ transitionDelay: '300ms' }}>
                <p className="text-2xl sm:text-3xl font-bold text-brand-navy mb-1">5+</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Years Experience</p>
              </div>
            </div>
          </div>

          <div ref={rightRef} className={cn("bg-white rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl p-5 sm:p-8 border border-border/50 scroll-animate-right", rightVisible && "visible")} style={{ transitionDelay: '150ms' }}>
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
                  <Ship className="w-4 h-4" /><span>Sea Cargo</span>
                </TabsTrigger>
                <TabsTrigger value="air-cargo" className="flex items-center gap-2 text-sm">
                  <Plane className="w-4 h-4" /><span>Air Cargo</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sea-cargo" className="mt-0">
                <Tabs value={seaSubTab} onValueChange={setSeaSubTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-4 h-auto">
                    <TabsTrigger value="full-container" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
                      <Container className="w-3.5 h-3.5" /><span className="hidden sm:inline">Full</span> Container
                    </TabsTrigger>
                    <TabsTrigger value="loose-cargo" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
                      <Package className="w-3.5 h-3.5" /><span className="hidden sm:inline">Loose</span> Cargo
                    </TabsTrigger>
                    <TabsTrigger value="vehicles" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
                      <Car className="w-3.5 h-3.5" />Vehicles
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="full-container" className="mt-0">
                    <ContainerCalculator
                      regions={regions}
                      containerPricing={containerPricing}
                      regionId={containerRegionId}
                      setRegionId={setContainerRegionId}
                      containerSize={containerSize}
                      setContainerSize={setContainerSize}
                      deliveryTimes={containerDeliveryTimes}
                    />
                  </TabsContent>

                  <TabsContent value="loose-cargo" className="mt-0">
                    <LooseCargoCalculator
                      regions={regions}
                      pricing={seaPricing}
                      regionId={looseRegionId}
                      setRegionId={setLooseRegionId}
                      weight={looseWeight}
                      setWeight={setLooseWeight}
                      deliveryTimes={looseDeliveryTimes}
                    />
                  </TabsContent>

                  <TabsContent value="vehicles" className="mt-0">
                    <VehicleCalculator
                      regions={regions}
                      vehiclePricing={vehiclePricing}
                      exchangeRates={exchangeRates}
                      deliveryTimes={looseDeliveryTimes}
                    />
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="air-cargo" className="mt-0">
                <Tabs value={airSubTab} onValueChange={setAirSubTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4 h-auto">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TabsTrigger value="door-to-door" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
                            Door to Door
                            <Info className="w-3 h-3 text-muted-foreground" />
                          </TabsTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[250px] text-center">
                          <p className="font-medium mb-1">Door to Door Service</p>
                          <p className="text-xs">Complete delivery from origin to your doorstep. Includes customs clearance, local handling, and final delivery to your address.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TabsTrigger value="airport-to-airport" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
                            Airport to Airport
                            <Info className="w-3 h-3 text-muted-foreground" />
                          </TabsTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[250px] text-center">
                          <p className="font-medium mb-1">Airport to Airport Service</p>
                          <p className="text-xs">Cargo is delivered to destination airport only. You arrange pickup and customs clearance. Lower cost but requires self-collection.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TabsList>

                  <TabsContent value="door-to-door" className="mt-0">
                    <AirCargoCalculator
                      regions={regions}
                      pricing={airD2DPricing}
                      regionId={airRegionId}
                      setRegionId={setAirRegionId}
                      weight={airWeight}
                      setWeight={setAirWeight}
                      deliveryTimes={airDeliveryTimes}
                      serviceType="door-to-door"
                    />
                  </TabsContent>

                  <TabsContent value="airport-to-airport" className="mt-0">
                    <AirCargoCalculator
                      regions={regions}
                      pricing={airA2APricing}
                      regionId={airRegionId}
                      setRegionId={setAirRegionId}
                      weight={airWeight}
                      setWeight={setAirWeight}
                      deliveryTimes={airDeliveryTimes}
                      serviceType="airport-to-airport"
                    />
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </section>
  );
}
