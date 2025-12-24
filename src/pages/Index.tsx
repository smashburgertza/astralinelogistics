import { HeroSection } from '@/components/home/HeroSection';
import { AboutSection } from '@/components/home/AboutSection';
import { ServicesSection } from '@/components/home/ServicesSection';
import { PricingCalculator } from '@/components/home/PricingCalculator';
import { AgentAddresses } from '@/components/home/AgentAddresses';
import { CTASection } from '@/components/home/CTASection';

const Index = () => {
  return (
    <div>
      <HeroSection />
      <AboutSection />
      <ServicesSection />
      <PricingCalculator />
      <AgentAddresses />
      <CTASection />
    </div>
  );
};

export default Index;
