import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plane, Package, Globe, ArrowRight } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-sidebar via-sidebar to-primary/20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
      
      {/* Animated Elements */}
      <div className="absolute top-20 right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 animate-fade-in">
            <Globe className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary">Shipping from 6 countries to Tanzania</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-primary-foreground leading-tight mb-6 animate-slide-up">
            Global Air Cargo
            <span className="block text-primary">Made Simple</span>
          </h1>

          <p className="text-lg md:text-xl text-sidebar-foreground/80 mb-8 max-w-2xl animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Import goods from UK, Germany, France, Dubai, China, and India with transparent pricing and real-time tracking. We handle customs clearance in Tanzania.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Button size="xl" asChild>
              <Link to="/auth?mode=signup">
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button size="xl" variant="hero" asChild>
              <Link to="/tracking">
                Track Shipment
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-16 pt-8 border-t border-primary-foreground/10 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-primary">6</p>
              <p className="text-sm text-sidebar-foreground/60">Origin Countries</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-primary">24/7</p>
              <p className="text-sm text-sidebar-foreground/60">Tracking</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-primary">Fast</p>
              <p className="text-sm text-sidebar-foreground/60">Customs Clearance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
