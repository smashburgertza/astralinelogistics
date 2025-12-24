import { ShoppingAggregator } from '@/components/shopping/ShoppingAggregator';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';
import { Link, ShoppingCart, CreditCard, Package, Truck, CheckCircle, Globe, Shield, Clock } from 'lucide-react';

const steps = [
  {
    icon: Link,
    title: 'Paste Product Links',
    description: 'Copy the URL of any product from online stores like Amazon, eBay, AliExpress, or any other retailer worldwide.',
    color: 'bg-blue-500/10 text-blue-500',
  },
  {
    icon: ShoppingCart,
    title: 'We Fetch Product Details',
    description: 'Our system automatically retrieves product information including name, price, and estimated weight for accurate shipping quotes.',
    color: 'bg-purple-500/10 text-purple-500',
  },
  {
    icon: CreditCard,
    title: 'Review & Confirm Order',
    description: 'See the total cost breakdown including product price, shipping fees, and handling charges. Submit your order when ready.',
    color: 'bg-green-500/10 text-green-500',
  },
  {
    icon: Package,
    title: 'We Purchase For You',
    description: 'Our agents purchase the items on your behalf and consolidate them at our regional warehouses in Europe, Dubai, China, or India.',
    color: 'bg-orange-500/10 text-orange-500',
  },
  {
    icon: Truck,
    title: 'Ship to Tanzania',
    description: 'Your items are carefully packaged and shipped to Tanzania. Track your shipment in real-time through our tracking system.',
    color: 'bg-red-500/10 text-red-500',
  },
  {
    icon: CheckCircle,
    title: 'Receive Your Items',
    description: 'Pick up your items at our Dar es Salaam location or opt for doorstep delivery anywhere in Tanzania.',
    color: 'bg-emerald-500/10 text-emerald-500',
  },
];

const features = [
  {
    icon: Globe,
    title: 'Shop From Anywhere',
    description: 'Access products from any online store worldwide, even those that don\'t ship to Tanzania.',
  },
  {
    icon: Shield,
    title: 'Secure Transactions',
    description: 'We handle all payments securely, protecting your financial information.',
  },
  {
    icon: Clock,
    title: 'Fast Processing',
    description: 'Orders are processed within 24-48 hours of payment confirmation.',
  },
];

export function ShopForMeSection() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: stepsRef, isVisible: stepsVisible } = useScrollAnimation();
  const { ref: featuresRef, isVisible: featuresVisible } = useScrollAnimation();
  const { ref: contentRef, isVisible: contentVisible } = useScrollAnimation();

  return (
    <section id="shop-for-me" className="section-padding bg-gradient-to-b from-background to-muted/30 overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div 
          ref={headerRef}
          className={cn("text-center mb-16 scroll-animate", headerVisible && "visible")}
        >
          <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold text-sm uppercase tracking-wide mb-4">
            Shop For Me
          </span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            We Buy, We Ship, <span className="text-primary">You Receive</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Can&apos;t find a store that ships to Tanzania? No problem! We&apos;ll purchase items from any 
            online store worldwide and deliver them straight to your doorstep.
          </p>
        </div>

        {/* How It Works - Steps */}
        <div 
          ref={stepsRef}
          className={cn("mb-20 scroll-animate", stepsVisible && "visible")}
        >
          <h3 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">
            How It Works
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {steps.map((step, index) => (
              <div 
                key={step.title}
                className="relative group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Connection line for desktop */}
                {index < steps.length - 1 && (
                  <div className="hidden xl:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/30 to-transparent" />
                )}
                
                <div className="bg-card border border-border rounded-xl p-4 h-full transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1">
                  {/* Step number */}
                  <div className="absolute -top-3 -left-3 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
                    {index + 1}
                  </div>
                  
                  {/* Icon */}
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-3", step.color)}>
                    <step.icon className="w-6 h-6" />
                  </div>
                  
                  {/* Content */}
                  <h4 className="text-base font-semibold text-foreground mb-1">{step.title}</h4>
                  <p className="text-muted-foreground text-xs leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div 
          ref={featuresRef}
          className={cn("mb-16 scroll-animate", featuresVisible && "visible")}
        >
          <div className="bg-primary/5 border border-primary/10 rounded-3xl p-8 md:p-12">
            <h3 className="text-2xl font-bold text-center text-foreground mb-8">
              Why Use Shop For Me?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div 
                  key={feature.title}
                  className="text-center"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h4 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h4>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Try It Now Header */}
        <div className="text-center mb-8">
          <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Try It Now
          </h3>
          <p className="text-muted-foreground">
            Paste a product link below to get started
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