import { Star, Quote } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';
import { usePageContent, PageContent } from '@/hooks/usePageContent';

const defaultTestimonials = [
  {
    name: 'Sarah Mwangi',
    role: 'Business Owner',
    location: 'Dar es Salaam',
    rating: 5,
    text: "Astraline has transformed how I import goods for my boutique. Their Shop For Me service is incredible - I just send the links and they handle everything. Highly recommended!",
    avatar: 'SM',
  },
  {
    name: 'James Okonkwo',
    role: 'E-commerce Seller',
    location: 'Arusha',
    rating: 5,
    text: "I've been using Astraline for over 2 years now. Their customs clearance is seamless and the tracking system keeps me updated every step of the way. Professional service!",
    avatar: 'JO',
  },
  {
    name: 'Fatima Hassan',
    role: 'Tech Entrepreneur',
    location: 'Zanzibar',
    rating: 5,
    text: "Ordering electronics from China used to be a nightmare until I found Astraline. Fast delivery, secure packaging, and excellent customer support. They truly care about their customers.",
    avatar: 'FH',
  },
  {
    name: 'Michael Kimaro',
    role: 'Restaurant Owner',
    location: 'Mwanza',
    rating: 5,
    text: "The team at Astraline goes above and beyond. They helped me import specialized kitchen equipment from Germany with zero hassle. The pricing is transparent with no hidden fees.",
    avatar: 'MK',
  },
];

export function TestimonialsSection() {
  const { data } = usePageContent('testimonials');
  const content = data as PageContent | undefined;
  
  const testimonials = content?.content?.testimonials?.length 
    ? content.content.testimonials.map((t: any) => ({
        ...t,
        text: t.content,
        avatar: t.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'NA',
        location: '',
      }))
    : defaultTestimonials;

  const stats = content?.content?.stats || [
    { value: '4.9', label: 'Average Rating' },
    { value: '2,500+', label: 'Happy Customers' },
    { value: '98%', label: 'Satisfaction Rate' },
    { value: '10K+', label: 'Deliveries Made' },
  ];
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation();

  return (
    <section id="testimonials" className="section-padding bg-background overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div 
          ref={headerRef}
          className={cn("text-center mb-10 sm:mb-16 scroll-animate", headerVisible && "visible")}
        >
          <span className="inline-block px-3 sm:px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold text-xs sm:text-sm uppercase tracking-wide mb-4">
            {content?.subtitle || 'Testimonials'}
          </span>
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            {content?.title || 'What Our'} <span className="text-primary">Customers</span> Say
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base lg:text-lg px-4">
            {content?.description || "Don't just take our word for it. Here's what our valued customers have to say about their experience with Astraline."}
          </p>
        </div>

        {/* Testimonials Grid */}
        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {testimonials.map((testimonial, index) => (
            <div 
              key={testimonial.name}
              className={cn(
                "relative bg-card rounded-xl sm:rounded-2xl p-5 sm:p-8 border border-border shadow-lg hover:shadow-xl transition-all duration-300 scroll-animate-scale",
                gridVisible && "visible"
              )}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Quote Icon */}
              <div className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Quote className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>

              {/* Rating */}
              <div className="flex gap-1 mb-3 sm:mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 sm:w-5 sm:h-5 fill-primary text-primary" />
                ))}
              </div>

              {/* Testimonial Text */}
              <p className="text-foreground/80 leading-relaxed mb-4 sm:mb-6 italic text-sm sm:text-base">
                &ldquo;{testimonial.text}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-brand-navy flex items-center justify-center text-white font-semibold text-sm sm:text-base">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm sm:text-base">{testimonial.name}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {testimonial.role} • {testimonial.location}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div 
          className={cn("mt-10 sm:mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 scroll-animate", gridVisible && "visible")}
          style={{ transitionDelay: '400ms' }}
        >
          {stats.map((stat: any) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-1">{stat.value}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}