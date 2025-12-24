import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { usePageContent, PageContent } from '@/hooks/usePageContent';

const defaultPartners = [
  { name: 'DHL', logo: 'DHL' },
  { name: 'FedEx', logo: 'FedEx' },
  { name: 'UPS', logo: 'UPS' },
  { name: 'Maersk', logo: 'Maersk' },
  { name: 'Emirates SkyCargo', logo: 'Emirates' },
  { name: 'DB Schenker', logo: 'Schenker' },
];

export function PartnersSection() {
  const { ref, isVisible } = useScrollAnimation();
  const { data } = usePageContent('partners');
  const content = data as PageContent | undefined;
  
  const partners = content?.content?.logos?.length 
    ? content.content.logos.map((l: any) => ({ name: l.name, logo: l.name?.split(' ')[0] || l.name }))
    : defaultPartners;

  return (
    <section className="py-16 bg-muted/30 border-y border-border/50">
      <div className="container mx-auto px-4">
        <div
          ref={ref}
          className={`scroll-animate ${isVisible ? 'visible' : ''}`}
        >
          <p className="text-center text-muted-foreground mb-8 text-sm uppercase tracking-widest font-medium">
            {content?.description || 'Trusted by leading brands & partners worldwide'}
          </p>
          
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 lg:gap-16">
            {partners.map((partner, index) => (
              <div
                key={partner.name}
                className="group flex items-center justify-center"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="px-6 py-3 rounded-lg bg-background/50 border border-border/30 hover:border-primary/30 hover:bg-background transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                  <span className="text-xl md:text-2xl font-bold text-muted-foreground/60 group-hover:text-foreground transition-colors duration-300 tracking-tight">
                    {partner.logo}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          <p className="text-center text-muted-foreground/60 mt-8 text-xs">
            Partnering with industry leaders to deliver your packages safely
          </p>
        </div>
      </div>
    </section>
  );
}
