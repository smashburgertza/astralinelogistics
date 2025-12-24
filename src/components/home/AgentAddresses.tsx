import { useEffect, useState } from 'react';
import { MapPin, Copy, Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { REGIONS, type Region } from '@/lib/constants';
import { toast } from 'sonner';

interface AgentAddress {
  region: Region;
  address_line1: string;
  address_line2?: string;
  city: string;
  postal_code?: string;
  country: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
}

export function AgentAddresses() {
  const [addresses, setAddresses] = useState<AgentAddress[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    const { data } = await supabase
      .from('agent_addresses')
      .select('*');
    
    if (data) {
      setAddresses(data as AgentAddress[]);
    }
  };

  const copyAddress = (address: AgentAddress) => {
    const fullAddress = `${address.address_line1}${address.address_line2 ? ', ' + address.address_line2 : ''}, ${address.city}${address.postal_code ? ' ' + address.postal_code : ''}, ${address.country}`;
    navigator.clipboard.writeText(fullAddress);
    setCopied(address.region);
    toast.success('Address copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <section className="section-padding bg-brand-navy-dark">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-primary/20 text-primary font-semibold text-sm uppercase tracking-wide mb-4">
            Global Network
          </span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Agent Delivery Addresses
          </h2>
          <p className="text-white/70 max-w-2xl mx-auto text-lg">
            Send your goods to our trusted agents in these locations. We'll handle collection, consolidation, and shipping to Tanzania.
          </p>
        </div>

        {/* Addresses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {addresses.map((address) => {
            const regionInfo = REGIONS[address.region];
            return (
              <div 
                key={address.region} 
                className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-all duration-300 group"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl">{regionInfo?.flag}</span>
                  <h3 className="font-heading text-lg font-semibold text-white">
                    {regionInfo?.label || address.region}
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
                  {copied === address.region ? (
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
