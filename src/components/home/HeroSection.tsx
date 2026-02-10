import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MoveRight, Plane, Package, Globe, MapPin, ArrowDown } from 'lucide-react';
import heroImage from '@/assets/hero-cargo.jpg';
import { usePageContent, PageContent } from '@/hooks/usePageContent';

import { useActiveRegions } from '@/hooks/useRegions';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

export function HeroSection() {
  const { data } = usePageContent('hero');
  const content = data as PageContent | undefined;
  const { data: regions = [] } = useActiveRegions();
  const [shipmentCount, setShipmentCount] = useState<number>(0);

  // Fetch active shipment count
  useEffect(() => {
    const fetchShipmentCount = async () => {
      const { count } = await supabase
        .from('shipments')
        .select('*', { count: 'exact', head: true });
      setShipmentCount(count || 0);
    };
    fetchShipmentCount();
  }, []);

  // Generate floating routes from active regions
  const floatingRoutes = regions.slice(0, 3).map((region, index) => ({
    from: region.code?.toUpperCase() || region.name.slice(0, 2).toUpperCase(),
    to: 'TZ',
    delay: `${index * 2}s`,
  }));
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden -mt-[120px] pt-[120px]">
      {/* Background Image with Parallax Effect */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      
      {/* Animated Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-navy/95 via-brand-navy/80 to-brand-navy/60" />
      
      {/* Animated Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }} />

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-primary/30 animate-float"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${4 + i}s`
            }}
          />
        ))}
      </div>

      {/* Glowing Orbs */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-accent/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      
      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Content */}
          <div className="max-w-2xl text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6 sm:mb-8 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs sm:text-sm text-white/90 font-medium">Trusted by 10,000+ customers worldwide</span>
            </div>

            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.1] mb-4 sm:mb-6">
              <span className="block opacity-0 animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
                {content?.title?.split(' ').slice(0, 2).join(' ') || 'Global Shipping'}
              </span>
              <span className="block opacity-0 animate-slide-up" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
                <span className="relative">
                  <span className="text-primary">{content?.title?.split(' ').slice(2).join(' ') || 'Made Simple'}</span>
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none">
                    <path d="M2 10C50 2 150 2 198 10" stroke="hsl(42 92% 60%)" strokeWidth="3" strokeLinecap="round" className="animate-draw" style={{ strokeDasharray: 200, strokeDashoffset: 200, animation: 'draw 1s ease-out 0.8s forwards' }} />
                  </svg>
                </span>
              </span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-white/80 mb-8 sm:mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed opacity-0 animate-slide-up" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
              {content?.description || 'Premium air cargo from UK, Germany, France, Dubai, China & India to Tanzania. Fast customs clearance. Doorstep delivery.'}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8 sm:mb-12 opacity-0 animate-slide-up justify-center lg:justify-start" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
              <Button size="lg" className="btn-gold group relative overflow-hidden w-full sm:w-auto" asChild>
                <Link to="/tracking">
                  <span className="relative z-10 flex items-center justify-center">
                    {content?.content?.cta_secondary || 'TRACK SHIPMENT'}
                    <MoveRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </Button>
              <Button size="lg" className="group bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white hover:bg-white hover:text-brand-navy transition-all duration-300 w-full sm:w-auto" asChild>
                <Link to="/contact">
                  {content?.content?.cta_primary || 'GET FREE QUOTE'}
                </Link>
              </Button>
            </div>

            {/* Stats Row */}
            <div className="flex flex-wrap gap-4 sm:gap-8 justify-center lg:justify-start opacity-0 animate-slide-up" style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}>
              {[
                { icon: Globe, value: `${regions.length || 6}+`, label: 'Countries' },
                { icon: Package, value: shipmentCount > 0 ? `${Math.floor(shipmentCount / 1000)}K+` : '10K+', label: 'Delivered' },
                { icon: Plane, value: '24/7', label: 'Support' },
              ].map((stat, index) => (
                <div key={stat.label} className="flex items-center gap-2 sm:gap-3 group">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{stat.value}</p>
                    <p className="text-xs sm:text-sm text-white/60">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Floating Card */}
          <div className="hidden lg:flex justify-center items-center">
            <div className="relative">
              {/* Main Card */}
              <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl opacity-0 animate-slide-up" style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}>
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-primary rounded-2xl flex items-center justify-center shadow-xl animate-pulse-glow">
                  <Plane className="w-10 h-10 text-white" />
                </div>
                
                <h3 className="text-white text-xl font-semibold mb-6">Live Shipping Routes</h3>
                
                <div className="space-y-4">
                  {floatingRoutes.map((route, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/10"
                      style={{ animationDelay: route.delay }}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="text-white font-medium">{route.from}</span>
                      </div>
                      <div className="flex-1 h-px bg-gradient-to-r from-primary/50 via-primary to-primary/50 relative">
                        <Plane className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 text-primary animate-pulse" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{route.to}</span>
                        <MapPin className="w-4 h-4 text-green-400" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Total shipments handled</span>
                    <span className="text-primary font-semibold">{shipmentCount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -left-12 top-1/4 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 animate-float shadow-xl" style={{ animationDelay: '0.5s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Package className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-white/60">Just arrived</p>
                    <p className="text-sm text-white font-medium">DSM Airport</p>
                  </div>
                </div>
              </div>

              <div className="absolute -right-8 bottom-1/4 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 animate-float shadow-xl" style={{ animationDelay: '1s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-white/60">Coverage</p>
                    <p className="text-sm text-white font-medium">Worldwide</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute -bottom-px left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block">
          <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V120Z" fill="hsl(var(--background))"/>
        </svg>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-0 animate-fade-in" style={{ animationDelay: '1s', animationFillMode: 'forwards' }}>
        <span className="text-xs text-white/50 uppercase tracking-widest">Scroll</span>
        <div className="w-6 h-10 rounded-full border-2 border-white/30 flex justify-center pt-2">
          <ArrowDown className="w-3 h-3 text-white/50 animate-bounce" />
        </div>
      </div>
    </section>
  );
}