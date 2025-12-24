import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CircleCheckBig } from 'lucide-react';

export function AboutSection() {
  return (
    <section className="section-padding bg-brand-navy">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
              ALL THE PACKAGES ARE DELIVERED TO YOUR DOORSTEP{' '}
              <span className="text-primary">SAFELY AND SECURELY</span>{' '}
              WITHOUT EVEN SLIGHT DAMAGE TO YOUR PACKAGE.
            </h2>
            
            <Button size="lg" className="btn-gold" asChild>
              <Link to="/contact">GET A QUOTE</Link>
            </Button>
          </div>

          {/* Right Content */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <p className="text-white/90 leading-relaxed mb-6">
              Astraline Logistics provides a complete package of logistics services from purchasing, collecting, packing, shipping, clearing and delivery. We have been in the shipping industry for more than 5 years. Our experience puts us on top of the list in the market.
            </p>
            <p className="text-white/80 leading-relaxed mb-8">
              For every order there is one successful delivery. Astraline Logistics do not put any of our customer's package at risk of getting lost. Every customer is given special attention with our customer care team. We listen and handle every problem reported to us. We are able to adapt and always catch up with new advancement in technology to serve you better.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                'Safe & Secure Delivery',
                'Real-time Tracking',
                'Customs Clearance',
                '24/7 Support',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CircleCheckBig className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-white/90 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
