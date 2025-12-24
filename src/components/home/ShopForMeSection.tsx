import { ShoppingAggregator } from '@/components/shopping/ShoppingAggregator';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

export function ShopForMeSection() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: contentRef, isVisible: contentVisible } = useScrollAnimation();

  return (
    <section id="shop-for-me" className="section-padding bg-gradient-to-b from-background to-muted/30 overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div 
          ref={headerRef}
          className={cn("text-center mb-12 scroll-animate", headerVisible && "visible")}
        >
          <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold text-sm uppercase tracking-wide mb-4">
            Shop For Me
          </span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            We Buy, We Ship, <span className="text-primary">You Receive</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Paste product links from any online store. We&apos;ll fetch the product information,
            calculate shipping costs to Tanzania, and handle the entire purchase for you.
          </p>
        </div>

        {/* Shopping Aggregator */}
        <div 
          ref={contentRef}
          className={cn("max-w-3xl mx-auto scroll-animate-scale", contentVisible && "visible")}
        >
          <ShoppingAggregator />
        </div>
      </div>
    </section>
  );
}