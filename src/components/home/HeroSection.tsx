import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MoveRight, Plane, Package, Globe } from 'lucide-react';
import heroImage from '@/assets/hero-cargo.jpg';
import astralineLogoWhite from '@/assets/astraline-logo-white.svg';

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center -mt-[120px] pt-[120px]">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-brand-navy/95 via-brand-navy/85 to-brand-navy/50" />
      
      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl">
          {/* Logo Badge */}
          <div className="mb-8 animate-fade-in">
            <img 
              src={astralineLogoWhite} 
              alt="Astraline Logistics" 
              className="h-16 md:h-20 w-auto"
            />
          </div>

          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            LOGISTICS YOU CAN{' '}
            <span className="text-primary">TRUST</span>
          </h1>

          <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Whatever the shape, size or quantity, Astraline Logistics offers a powerful suite of priority air and road freight services. From UK, Germany, France, Dubai, China, and India to Tanzania.
          </p>

          {/* Stats Row */}
          <div className="flex flex-wrap gap-8 mb-10 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Globe className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">6+</p>
                <p className="text-sm text-white/60">Countries</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">10K+</p>
                <p className="text-sm text-white/60">Shipments</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Plane className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">24/7</p>
                <p className="text-sm text-white/60">Support</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <Button size="xl" className="btn-gold group" asChild>
              <Link to="/about">
                FIND OUT MORE
                <MoveRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button size="xl" className="btn-outline-white" asChild>
              <Link to="/contact">
                GET A QUOTE
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float">
        <div className="w-6 h-10 rounded-full border-2 border-white/30 flex justify-center pt-2">
          <div className="w-1.5 h-3 bg-white/50 rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  );
}
