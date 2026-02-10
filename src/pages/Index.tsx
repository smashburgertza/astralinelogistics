import { HeroSection } from '@/components/home/HeroSection';
import { AboutSection } from '@/components/home/AboutSection';
import { ServicesSection } from '@/components/home/ServicesSection';
import { ShopForMeSection } from '@/components/home/ShopForMeSection';
import { PricingCalculator } from '@/components/home/PricingCalculator';
import { TestimonialsSection } from '@/components/home/TestimonialsSection';
import { PartnersSection } from '@/components/home/PartnersSection';

import { ContactSection } from '@/components/home/ContactSection';
import { CTASection } from '@/components/home/CTASection';
import { useFeatureVisibility } from '@/hooks/useFeatureVisibility';

const Index = () => {
  const { showOnPublic: showShopForMe } = useFeatureVisibility('shop_for_me');
  const { showOnPublic: showShippingCalc } = useFeatureVisibility('shipping_calculator');

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
      {showShopForMe && (
        <section id="shop-for-me">
          <ShopForMeSection />
        </section>
      )}
      {showShippingCalc && (
        <section id="pricing">
          <PricingCalculator />
        </section>
      )}
      <TestimonialsSection />
      <section id="contact">
        <ContactSection />
      </section>
      <CTASection />
    </div>
  );
};

export default Index;