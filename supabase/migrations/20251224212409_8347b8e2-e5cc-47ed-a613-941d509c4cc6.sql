-- Create a table to store editable page content
CREATE TABLE public.page_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_key text NOT NULL UNIQUE,
  title text,
  subtitle text,
  description text,
  content jsonb DEFAULT '{}'::jsonb,
  is_visible boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.page_content ENABLE ROW LEVEL SECURITY;

-- Anyone can view content
CREATE POLICY "Anyone can view page content"
ON public.page_content
FOR SELECT
USING (true);

-- Only admins can manage content
CREATE POLICY "Admins can manage page content"
ON public.page_content
FOR ALL
USING (is_admin_or_employee(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_page_content_updated_at
BEFORE UPDATE ON public.page_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default content for each section
INSERT INTO public.page_content (section_key, title, subtitle, description, content) VALUES
('hero', 'Global Shipping Made Simple', 'Astraline Logistics', 'Fast, reliable cargo shipping from Europe, Dubai, China, and India to Tanzania. Track your shipments in real-time and enjoy competitive rates.', '{"cta_primary": "Get a Quote", "cta_secondary": "Track Shipment", "stats": [{"value": "15K+", "label": "Shipments Delivered"}, {"value": "4", "label": "Global Warehouses"}, {"value": "98%", "label": "On-Time Delivery"}, {"value": "24/7", "label": "Customer Support"}]}'::jsonb),

('partners', 'Trusted Partners', 'Our Partners', 'We work with leading logistics and shipping companies worldwide', '{"logos": [{"name": "DHL Express", "placeholder": true}, {"name": "FedEx", "placeholder": true}, {"name": "Maersk", "placeholder": true}, {"name": "Emirates SkyCargo", "placeholder": true}, {"name": "Turkish Cargo", "placeholder": true}, {"name": "Ethiopian Airlines Cargo", "placeholder": true}]}'::jsonb),

('about', 'Your Trusted Logistics Partner Since 2015', 'About Us', 'Astraline Logistics connects Tanzania to the world through our strategic warehouse network in Europe, Dubai, China, and India. We specialize in making international shipping accessible, affordable, and reliable for businesses and individuals.', '{"features": [{"title": "Global Network", "description": "Strategic warehouses in 4 major regions"}, {"title": "Real-time Tracking", "description": "Track your shipments 24/7"}, {"title": "Competitive Rates", "description": "Transparent pricing with no hidden fees"}, {"title": "Expert Support", "description": "Dedicated team for all your queries"}]}'::jsonb),

('services', 'Comprehensive Shipping Solutions', 'Our Services', 'From air freight to sea cargo, we offer a complete range of logistics services tailored to your needs.', '{"services": [{"title": "Air Freight", "description": "Fast delivery for time-sensitive cargo", "icon": "Plane"}, {"title": "Sea Freight", "description": "Cost-effective shipping for large volumes", "icon": "Ship"}, {"title": "Warehouse Storage", "description": "Secure storage at all our locations", "icon": "Warehouse"}, {"title": "Door-to-Door", "description": "Complete delivery to your doorstep", "icon": "Truck"}]}'::jsonb),

('shop_for_me', 'We Buy, We Ship, You Receive', 'Shop For Me', 'Can''t find a store that ships to Tanzania? No problem! We''ll purchase items from any online store worldwide and deliver them straight to your doorstep.', '{"steps": [{"title": "Paste Product Links", "description": "Copy the URL of any product from online stores like Amazon, eBay, AliExpress, or any other retailer worldwide.", "icon": "Link", "color": "blue"}, {"title": "We Fetch Product Details", "description": "Our system automatically retrieves product information including name, price, and estimated weight for accurate shipping quotes.", "icon": "ShoppingCart", "color": "purple"}, {"title": "Review & Confirm Order", "description": "See the total cost breakdown including product price, shipping fees, and handling charges. Submit your order when ready.", "icon": "CreditCard", "color": "green"}, {"title": "We Purchase For You", "description": "Our agents purchase the items on your behalf and consolidate them at our regional warehouses.", "icon": "Package", "color": "orange"}, {"title": "Ship to Tanzania", "description": "Your items are carefully packaged and shipped to Tanzania. Track your shipment in real-time.", "icon": "Truck", "color": "red"}, {"title": "Receive Your Items", "description": "Pick up your items at our Dar es Salaam location or opt for doorstep delivery anywhere in Tanzania.", "icon": "CheckCircle", "color": "emerald"}], "features": [{"title": "Shop From Anywhere", "description": "Access products from any online store worldwide.", "icon": "Globe"}, {"title": "Secure Transactions", "description": "We handle all payments securely.", "icon": "Shield"}, {"title": "Fast Processing", "description": "Orders processed within 24-48 hours.", "icon": "Clock"}]}'::jsonb),

('testimonials', 'What Our Customers Say', 'Testimonials', 'Join thousands of satisfied customers who trust Astraline for their shipping needs.', '{"testimonials": [{"name": "Sarah Mwamba", "role": "Business Owner", "content": "Astraline has transformed how I import goods for my boutique. Their Shop For Me service is incredible!", "rating": 5}, {"name": "John Kimaro", "role": "Tech Entrepreneur", "content": "Reliable, fast, and professional. I''ve been using their services for 3 years now.", "rating": 5}, {"name": "Fatima Hassan", "role": "Online Seller", "content": "The tracking system is excellent. I always know where my shipments are.", "rating": 5}], "stats": [{"value": "4.9/5", "label": "Average Rating"}, {"value": "15,000+", "label": "Happy Customers"}, {"value": "50,000+", "label": "Shipments Delivered"}]}'::jsonb),

('contact', 'Get In Touch', 'Contact Us', 'Have questions? We''re here to help. Reach out to us through any of the channels below.', '{"phone": "+255 123 456 789", "email": "info@astraline.co.tz", "address": "Dar es Salaam, Tanzania", "hours": "Mon-Fri: 8AM-6PM, Sat: 9AM-2PM"}'::jsonb),

('cta', 'Ready to Ship with Astraline?', 'Get Started Today', 'Join thousands of satisfied customers. Get a quote or start tracking your shipment now.', '{"cta_primary": "Get a Quote", "cta_secondary": "Contact Us"}'::jsonb);