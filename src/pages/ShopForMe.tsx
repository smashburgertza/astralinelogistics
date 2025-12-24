import { ShoppingAggregator } from '@/components/shopping/ShoppingAggregator';

export default function ShopForMe() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Hero Section */}
      <section className="pt-32 pb-12 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Shop For Me
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Paste product links from any online store. We'll fetch the product information,
            calculate shipping costs to Tanzania, and handle the entire purchase for you.
          </p>
        </div>
      </section>

      {/* Shopping Aggregator */}
      <section className="pb-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <ShoppingAggregator />
        </div>
      </section>
    </div>
  );
}
