import { Link } from 'react-router-dom';
import { PlaneTakeoff, Ship, Container, PackageCheck, ShieldCheck, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const services = [
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
  return (
    <section className="section-padding bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold text-sm uppercase tracking-wide mb-4">
            What We Offer
          </span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Our Services
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Complete logistics solutions from collection to delivery. We handle everything so you don't have to.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <Link key={index} to={service.link}>
              <Card className="h-full card-hover border-0 shadow-lg group overflow-hidden">
                <CardContent className="p-8">
                  <div className="w-16 h-16 rounded-xl bg-brand-navy flex items-center justify-center mb-6 group-hover:bg-primary transition-colors duration-300">
                    <service.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-heading text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {service.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
