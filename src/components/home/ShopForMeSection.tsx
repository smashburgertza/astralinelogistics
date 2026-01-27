import { ShoppingAggregator } from '@/components/shopping/ShoppingAggregator';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';
import { Link, ShoppingCart, CreditCard, Package, Truck, CheckCircle, Globe, Shield, Clock, LucideIcon, Car } from 'lucide-react';
import { usePageContent, PageContent } from '@/hooks/usePageContent';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Only 2 main categories - product types are detected automatically behind the scenes
const SHOP_CATEGORIES = [
  { id: 'products', label: 'Products', icon: Package },
  { id: 'vehicles', label: 'Vehicles', icon: Car },
] as const;
const iconMap: Record<string, LucideIcon> = {
  Link: Link,
  ShoppingCart: ShoppingCart,
  CreditCard: CreditCard,
  Package: Package,
  Truck: Truck,
  CheckCircle: CheckCircle,
  Globe: Globe,
  Shield: Shield,
  Clock: Clock,
};

const colorMap: Record<string, string> = {
  blue: 'bg-blue-500/10 text-blue-500',
  purple: 'bg-purple-500/10 text-purple-500',
  green: 'bg-green-500/10 text-green-500',
  orange: 'bg-orange-500/10 text-orange-500',
  red: 'bg-red-500/10 text-red-500',
  emerald: 'bg-emerald-500/10 text-emerald-500',
};

const defaultSteps = [
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

const defaultFeatures = [
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
  
  const { data } = usePageContent('shop_for_me');
  const content = data as PageContent | undefined;
  
  const steps = content?.content?.steps?.length 
    ? content.content.steps.map((s: any) => ({
        icon: iconMap[s.icon] || Link,
        title: s.title,
        description: s.description,
        color: colorMap[s.color] || 'bg-blue-500/10 text-blue-500',
      }))
    : defaultSteps;
    
  const features = content?.content?.features?.length 
    ? content.content.features.map((f: any) => ({
        icon: iconMap[f.icon] || Globe,
        title: f.title,
        description: f.description,
      }))
    : defaultFeatures;

  return (
    <section id="shop-for-me" className="section-padding bg-gradient-to-b from-background to-muted/30 overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div 
          ref={headerRef}
          className={cn("text-center mb-16 scroll-animate", headerVisible && "visible")}
        >
          <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold text-sm uppercase tracking-wide mb-4">
            {content?.subtitle || 'Shop For Me'}
          </span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            {content?.title?.split(',')[0] || 'We Buy, We Ship'}, <span className="text-primary">{content?.title?.split(',')[1]?.trim() || 'You Receive'}</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            {content?.description || "Can't find a store that ships to Tanzania? No problem! We'll purchase items from any online store worldwide and deliver them straight to your doorstep."}
          </p>
        </div>

        {/* How It Works - Steps */}
        <div 
          ref={stepsRef}
          className={cn("mb-12 sm:mb-20 scroll-animate", stepsVisible && "visible")}
        >
          <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-foreground mb-8 sm:mb-12">
            How It Works
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
          className={cn("mb-12 sm:mb-16 scroll-animate", featuresVisible && "visible")}
        >
          <div className="bg-primary/5 border border-primary/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12">
            <h3 className="text-xl sm:text-2xl font-bold text-center text-foreground mb-6 sm:mb-8">
              Why Use Shop For Me?
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
              {features.map((feature, index) => (
                <div 
                  key={feature.title}
                  className="text-center"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/10 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <feature.icon className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                  </div>
                  <h4 className="text-base sm:text-lg font-semibold text-foreground mb-2">{feature.title}</h4>
                  <p className="text-muted-foreground text-xs sm:text-sm">{feature.description}</p>
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
            Select a category and paste a product link to get started
          </p>
        </div>

        {/* Category Tabs and Shopping Aggregator */}
        <div 
          ref={contentRef}
          className={cn("max-w-3xl mx-auto scroll-animate-scale", contentVisible && "visible")}
        >
          <Tabs defaultValue="products" className="w-full">
            <TabsList className="w-full grid grid-cols-2 mb-6 h-auto p-1 bg-muted/50">
              {SHOP_CATEGORIES.map((category) => (
                <TabsTrigger 
                  key={category.id} 
                  value={category.id}
                  className="flex items-center justify-center gap-2 py-3 text-sm data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                >
                  <category.icon className="w-5 h-5" />
                  <span>{category.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            
            {SHOP_CATEGORIES.map((category) => (
              <TabsContent key={category.id} value={category.id} className="mt-0">
                <ShoppingAggregator category={category.id} />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </section>
  );
}