import { HeroSection } from '@/components/home/HeroSection';
import { ServicesSection } from '@/components/home/ServicesSection';
import { PricingCalculator } from '@/components/home/PricingCalculator';
import { AgentAddresses } from '@/components/home/AgentAddresses';

const Index = () => {
  return (
    <div>
      <HeroSection />
      <ServicesSection />
      <PricingCalculator />
      <AgentAddresses />
    </div>
  );
};

export default Index;
