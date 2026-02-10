import { PlaneTakeoff, Ship, Container, PackageCheck, ShieldCheck, Zap, LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';
import { usePageContent, PageContent } from '@/hooks/usePageContent';

const iconMap: Record<string, LucideIcon> = {
  Plane: PlaneTakeoff,
  PlaneTakeoff: PlaneTakeoff,
  Ship: Ship,
  Container: Container,
  PackageCheck: PackageCheck,
  ShieldCheck: ShieldCheck,
  Zap: Zap,
  Warehouse: Container,
  Truck: Container,
  Package: PackageCheck,
};

const defaultServices = [
  {
    icon: PlaneTakeoff,
    title: 'Air Freight',
    description: 'Fast and reliable air cargo services from major global hubs directly to Tanzania.',
    link: '/services#air-freight',
  },
  {
    icon: Ship,
    title: 'Sea Freight',
    description: 'Cost-effective ocean freight solutions for larger shipments and bulk cargo.',
    link: '/services#sea-freight',
  },
  {
    icon: Container,
    title: 'Road Freight',
    description: 'Comprehensive ground transportation and last-mile delivery across Tanzania.',
    link: '/services#road-freight',
  },
  {
    icon: PackageCheck,
    title: 'Consolidation',
    description: 'Combine multiple packages into one shipment to optimize costs and efficiency.',
    link: '/services#consolidation',
  },
  {
    icon: ShieldCheck,
    title: 'Customs Clearance',
    description: 'Expert handling of all customs documentation and clearance procedures.',
    link: '/services#customs',
  },
  {
    icon: Zap,
    title: 'Express Delivery',
    description: 'Priority shipping options for time-sensitive cargo with guaranteed delivery.',
    link: '/services#express',
  },
];

export function ServicesSection() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation();
  
  const { data } = usePageContent('services');
  const content = data as PageContent | undefined;
  
  const services = content?.content?.services?.length 
    ? content.content.services.map((s: any) => ({
        icon: iconMap[s.icon] || PackageCheck,
        title: s.title,
        description: s.description,
        link: `/services#${s.title?.toLowerCase().replace(/\s+/g, '-')}`,
      }))
    : defaultServices;

  return (
    <section className="section-padding bg-background overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div 
          ref={headerRef}
          className={cn("text-center mb-10 sm:mb-16 scroll-animate", headerVisible && "visible")}
        >
          <span className="inline-block px-3 sm:px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold text-xs sm:text-sm uppercase tracking-wide mb-4">
            {content?.subtitle || 'What We Offer'}
          </span>
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            {content?.title || 'Our Services'}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base lg:text-lg px-4">
            {content?.description || "Complete logistics solutions from collection to delivery. We handle everything so you don't have to."}
          </p>
        </div>

        {/* Services Grid */}
        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-6">
          {services.map((service, index) => (
            <div 
              key={index} 
              className={cn("scroll-animate-scale", gridVisible && "visible")}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <Card className="h-full border-0 shadow-lg overflow-hidden bg-primary">
                <CardContent className="p-5 sm:p-8">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl bg-white flex items-center justify-center mb-4 sm:mb-6">
                    <service.icon className="w-6 h-6 sm:w-8 sm:h-8 text-brand-navy" />
                  </div>
                  <h3 className="font-heading text-lg sm:text-xl font-semibold mb-2 sm:mb-3 text-white">
                    {service.title}
                  </h3>
                  <p className="text-white/80 leading-relaxed text-sm sm:text-base">
                    {service.description}
                  </p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}