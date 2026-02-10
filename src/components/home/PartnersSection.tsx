import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const countries = [
  { name: 'United Kingdom', flag: '🇬🇧' },
  { name: 'Germany', flag: '🇩🇪' },
  { name: 'France', flag: '🇫🇷' },
  { name: 'USA', flag: '🇺🇸' },
  { name: 'China', flag: '🇨🇳' },
  { name: 'Dubai', flag: '🇦🇪' },
  { name: 'India', flag: '🇮🇳' },
];

export function PartnersSection() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div
          ref={ref}
          className={`scroll-animate ${isVisible ? 'visible' : ''}`}
        >
          <p className="text-center text-muted-foreground mb-8 text-sm uppercase tracking-widest font-medium">
            We operate across 7 countries worldwide
          </p>
          
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10 lg:gap-14">
            {countries.map((country, index) => (
              <div
                key={country.name}
                className="group flex items-center justify-center"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="px-5 py-3 rounded-lg bg-background/50 border border-border/30 hover:border-primary/30 hover:bg-background transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 flex items-center gap-3">
                  <span className="text-2xl md:text-3xl">{country.flag}</span>
                  <span className="text-sm md:text-base font-semibold text-muted-foreground/70 group-hover:text-foreground transition-colors duration-300 tracking-tight">
                    {country.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          <p className="text-center text-muted-foreground/60 mt-8 text-xs">
            Delivering your packages from these locations to Tanzania
          </p>
        </div>
      </div>
    </section>
  );
}
