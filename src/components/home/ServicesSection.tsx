import { Plane, Shield, Clock, Globe, Package, Truck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const services = [
  {
    icon: Plane,
    title: 'Air Freight',
    description: 'Fast and reliable air cargo services from major global hubs to Tanzania.',
  },
  {
    icon: Shield,
    title: 'Customs Clearance',
    description: 'We handle all customs documentation and clearance in Tanzania.',
  },
  {
    icon: Clock,
    title: 'Real-time Tracking',
    description: 'Track your shipments 24/7 with our advanced tracking system.',
  },
  {
    icon: Globe,
    title: 'Global Network',
    description: 'Trusted agents in UK, Germany, France, Dubai, China, and India.',
  },
  {
    icon: Package,
    title: 'Consolidation',
    description: 'Combine multiple packages into one shipment to save on costs.',
  },
  {
    icon: Truck,
    title: 'Door Delivery',
    description: 'Optional last-mile delivery anywhere in Tanzania.',
  },
];

export function ServicesSection() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Services</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            End-to-end logistics solutions for importing goods to Tanzania.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <Card key={index} className="card-hover border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <service.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{service.title}</h3>
                <p className="text-muted-foreground text-sm">{service.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
