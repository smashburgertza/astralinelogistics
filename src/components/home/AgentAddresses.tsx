import { useEffect, useState } from 'react';
import { MapPin, Phone, Mail, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Agent Delivery Addresses</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Send your goods to our agents in these locations. We'll handle the rest.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {addresses.map((address) => {
            const regionInfo = REGIONS[address.region];
            return (
              <Card key={address.region} className="card-hover">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="text-2xl">{regionInfo?.flag}</span>
                    {regionInfo?.label || address.region}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                    <div>
                      <p>{address.address_line1}</p>
                      {address.address_line2 && <p>{address.address_line2}</p>}
                      <p>{address.city} {address.postal_code}</p>
                      <p>{address.country}</p>
                    </div>
                  </div>
                  
                  {address.contact_name && (
                    <p className="text-sm text-muted-foreground">
                      Contact: {address.contact_name}
                    </p>
                  )}

                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
