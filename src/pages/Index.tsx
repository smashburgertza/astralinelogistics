import { HeroSection } from '@/components/home/HeroSection';
import { AboutSection } from '@/components/home/AboutSection';
import { ServicesSection } from '@/components/home/ServicesSection';
import { ShopForMeSection } from '@/components/home/ShopForMeSection';
import { PricingCalculator } from '@/components/home/PricingCalculator';
import { TestimonialsSection } from '@/components/home/TestimonialsSection';
import { PartnersSection } from '@/components/home/PartnersSection';
import { AgentAddresses } from '@/components/home/AgentAddresses';
import { ContactSection } from '@/components/home/ContactSection';
import { CTASection } from '@/components/home/CTASection';

const Index = () => {
  return (
    <div className="scroll-smooth">
      <HeroSection />
      <PartnersSection />
      <section id="about">
        <AboutSection />
      </section>
      <section id="services">
        <ServicesSection />
      </section>
      <section id="shop-for-me">
        <ShopForMeSection />
      </section>
      <section id="pricing">
        <PricingCalculator />
      </section>
      <TestimonialsSection />
      <AgentAddresses />
      <section id="contact">
        <ContactSection />
      </section>
      <CTASection />
    </div>
  );
};

export default Index;