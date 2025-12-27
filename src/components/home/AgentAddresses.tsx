import { useState } from 'react';
import { MapPin, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAgentAddresses } from '@/hooks/useRegionPricing';
import { useActiveRegions, regionsToMap } from '@/hooks/useRegions';
import { toast } from 'sonner';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

export function AgentAddresses() {
  const { data: addresses } = useAgentAddresses();
  const { data: regions } = useActiveRegions();
  const regionsMap = regionsToMap(regions);
  const [copied, setCopied] = useState<string | null>(null);

  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation();

  const copyAddress = (address: typeof addresses extends (infer T)[] | undefined ? T : never) => {
    if (!address) return;
    const fullAddress = `${address.address_line1}${address.address_line2 ? ', ' + address.address_line2 : ''}, ${address.city}${address.postal_code ? ' ' + address.postal_code : ''}, ${address.country}`;
    navigator.clipboard.writeText(fullAddress);
    setCopied(address.id);
    toast.success('Address copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  };

  // Filter addresses to only show those with active regions and sort by region display_order
  const visibleAddresses = (addresses || [])
    .filter(addr => {
      const regionInfo = regionsMap[addr.region];
      return regionInfo?.is_active !== false;
    })
    .sort((a, b) => {
      const regionA = regionsMap[a.region];
      const regionB = regionsMap[b.region];
      return (regionA?.display_order ?? 999) - (regionB?.display_order ?? 999);
    });

  return (
    <section className="section-padding bg-brand-navy-dark overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div 
          ref={headerRef}
          className={cn("text-center mb-10 sm:mb-16 scroll-animate", headerVisible && "visible")}
        >
          <span className="inline-block px-3 sm:px-4 py-2 rounded-full bg-primary/20 text-primary font-semibold text-xs sm:text-sm uppercase tracking-wide mb-4">
            Global Network
          </span>
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Agent Delivery Addresses
          </h2>
          <p className="text-white/70 max-w-2xl mx-auto text-sm sm:text-base lg:text-lg px-4">
            Send your goods to our trusted agents in these locations. We&apos;ll handle collection, consolidation, and shipping to Tanzania.
          </p>
        </div>

        {/* Addresses Grid */}
        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {visibleAddresses.map((address, index) => {
            const regionInfo = regionsMap[address.region];
            return (
              <div 
                key={address.id} 
                className={cn(
                  "bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-all duration-300 group scroll-animate-scale",
                  gridVisible && "visible"
                )}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl">{regionInfo?.flag_emoji || '🌍'}</span>
                  <h3 className="font-heading text-lg font-semibold text-white">
                    {regionInfo?.name || address.region}
                  </h3>
                </div>

                <div className="flex items-start gap-2 text-sm text-white/80 mb-4">
                  <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                  <div>
                    <p>{address.address_line1}</p>
                    {address.address_line2 && <p>{address.address_line2}</p>}
                    <p>{address.city} {address.postal_code}</p>
                    <p>{address.country}</p>
                  </div>
                </div>
                
                {address.contact_name && (
                  <p className="text-sm text-white/60 mb-4">
                    Contact: {address.contact_name}
                  </p>
                )}

                <Button 
                  variant="outline"
                  size="sm" 
                  className="w-full bg-transparent border-white/20 text-white hover:bg-white hover:text-brand-navy transition-all"
                  onClick={() => copyAddress(address)}
                >
                  {copied === address.id ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Address
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
