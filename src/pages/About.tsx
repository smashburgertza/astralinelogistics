import { HelmetProvider, Helmet } from 'react-helmet-async';
import { Target, Eye, Heart, Users, Globe, Shield, Truck, Clock } from 'lucide-react';

const values = [
  {
    icon: Shield,
    title: 'Reliability',
    description: 'We deliver on our promises, ensuring your cargo arrives safely and on time.',
  },
  {
    icon: Heart,
    title: 'Customer Focus',
    description: 'Your satisfaction is our priority. We go the extra mile for every shipment.',
  },
  {
    icon: Globe,
    title: 'Global Reach',
    description: 'Our network spans across continents, connecting you to the world.',
  },
  {
    icon: Clock,
    title: 'Efficiency',
    description: 'Streamlined processes ensure fast customs clearance and delivery.',
  },
];

const stats = [
  { value: '6+', label: 'Countries Served' },
  { value: '10K+', label: 'Shipments Delivered' },
  { value: '5+', label: 'Years Experience' },
  { value: '24/7', label: 'Customer Support' },
];

export default function AboutPage() {
  return (
    <HelmetProvider>
      <Helmet>
        <title>About Us | Astraline Logistics</title>
        <meta name="description" content="Learn about Astraline Logistics - your trusted partner for air cargo from UK, Germany, France, Dubai, China, and India to Tanzania." />
      </Helmet>

      {/* Hero Section */}
      <section className="bg-brand-navy text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="font-heading text-4xl md:text-5xl font-bold mb-6">
              About <span className="text-primary">Astraline</span> Logistics
            </h1>
            <p className="text-lg text-white/80 leading-relaxed">
              We are a premier air cargo logistics company specializing in seamless shipping solutions 
              from Europe, the Middle East, and Asia to Tanzania. Our mission is to bridge global trade 
              gaps with reliable, efficient, and affordable logistics services.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-primary">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-primary-foreground">{stat.value}</p>
                <p className="text-sm text-primary-foreground/80 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-card border border-border rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <Target className="w-7 h-7 text-primary" />
              </div>
              <h2 className="font-heading text-2xl font-bold mb-4">Our Mission</h2>
              <p className="text-muted-foreground leading-relaxed">
                To provide reliable, efficient, and affordable air cargo logistics services that connect 
                businesses and individuals in Tanzania with suppliers across the globe. We strive to 
                simplify international shipping, handling customs clearance and last-mile delivery with 
                excellence.
              </p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <Eye className="w-7 h-7 text-primary" />
              </div>
              <h2 className="font-heading text-2xl font-bold mb-4">Our Vision</h2>
              <p className="text-muted-foreground leading-relaxed">
                To become East Africa&apos;s most trusted air cargo logistics partner, known for our 
                commitment to customer satisfaction, operational excellence, and innovative solutions. 
                We envision a future where international shipping is seamless and accessible to all.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-6">Our Story</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Astraline Logistics was founded with a simple goal: to make international shipping to 
              Tanzania easier and more accessible. We noticed that many businesses and individuals 
              struggled with the complexities of importing goods — from finding reliable agents to 
              navigating customs procedures.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Today, we operate a comprehensive network spanning the United Kingdom, Germany, France, 
              Dubai, China, and India. Our team of experienced logistics professionals handles everything 
              from collection at origin to doorstep delivery in Tanzania.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              We take pride in our &quot;Shop For Me&quot; service, which allows customers to purchase items 
              from international retailers without worrying about shipping logistics. Our transparent 
              pricing and real-time tracking ensure you always know where your cargo is.
            </p>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">Our Core Values</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              These principles guide everything we do at Astraline Logistics.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => (
              <div 
                key={value.title} 
                className="bg-card border border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-lg mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-brand-navy text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">Why Choose Astraline?</h2>
            <p className="text-white/70 max-w-2xl mx-auto">
              We offer comprehensive logistics solutions tailored to your needs.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-4">
                <Truck className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-xl mb-2">Door-to-Door Service</h3>
              <p className="text-white/70 text-sm">
                From collection at origin to delivery at your doorstep in Tanzania.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-xl mb-2">Dedicated Support</h3>
              <p className="text-white/70 text-sm">
                Our team is available 24/7 to assist you with any queries or concerns.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-xl mb-2">Customs Expertise</h3>
              <p className="text-white/70 text-sm">
                We handle all customs clearance procedures for hassle-free imports.
              </p>
            </div>
          </div>
        </div>
      </section>
    </HelmetProvider>
  );
}