import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { PublicNavbar } from './PublicNavbar';
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';
import astralineLogoWhite from '@/assets/astraline-logo-white.svg';
import { useActiveRegions } from '@/hooks/useRegions';

const scrollToSection = (sectionId: string, navigate: ReturnType<typeof useNavigate>, location: ReturnType<typeof useLocation>) => {
  if (location.pathname !== '/') {
    navigate('/');
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  } else {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
};

export function PublicLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: regions } = useActiveRegions();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      
      {/* Footer */}
      <footer className="bg-brand-navy-dark text-white">
        {/* Main Footer */}
        <div className="container mx-auto px-4 py-10 sm:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <img 
                src={astralineLogoWhite} 
                alt="Astraline Logistics" 
                className="h-10 sm:h-14 w-auto mb-4"
              />
              <p className="text-white/70 text-sm leading-relaxed mb-6">
                Your trusted partner for air cargo logistics. We collect goods from UK, Germany, France, Dubai, China, and India, clear customs in Tanzania, and deliver to your doorstep.
              </p>
              <div className="flex gap-3 sm:gap-4">
                <a href="#" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors">
                  <Facebook className="w-4 h-4 sm:w-5 sm:h-5" />
                </a>
                <a href="#" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors">
                  <Twitter className="w-4 h-4 sm:w-5 sm:h-5" />
                </a>
                <a href="#" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors">
                  <Instagram className="w-4 h-4 sm:w-5 sm:h-5" />
                </a>
                <a href="#" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors">
                  <Linkedin className="w-4 h-4 sm:w-5 sm:h-5" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-heading font-semibold text-base sm:text-lg mb-4 sm:mb-6">Quick Links</h4>
              <ul className="space-y-2 sm:space-y-3 text-sm">
                <li><button onClick={() => scrollToSection('about', navigate, location)} className="text-white/70 hover:text-primary transition-colors">About Us</button></li>
                <li><button onClick={() => scrollToSection('services', navigate, location)} className="text-white/70 hover:text-primary transition-colors">Our Services</button></li>
                <li><Link to="/tracking" className="text-white/70 hover:text-primary transition-colors">Track Shipment</Link></li>
                <li><button onClick={() => scrollToSection('shop-for-me', navigate, location)} className="text-white/70 hover:text-primary transition-colors">Shop For Me</button></li>
                <li><button onClick={() => scrollToSection('contact', navigate, location)} className="text-white/70 hover:text-primary transition-colors">Contact Us</button></li>
                <li><Link to="/auth" className="text-white/70 hover:text-primary transition-colors">Customer Portal</Link></li>
              </ul>
            </div>

            {/* We Ship From */}
            <div>
              <h4 className="font-heading font-semibold text-base sm:text-lg mb-4 sm:mb-6">We Ship From</h4>
              <ul className="space-y-2 sm:space-y-3 text-sm text-white/70">
                {regions?.map((region) => (
                  <li key={region.id} className="flex items-center gap-2">
                    <span className="text-base sm:text-lg">{region.flag_emoji || '🌍'}</span> {region.name}
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="font-heading font-semibold text-base sm:text-lg mb-4 sm:mb-6">Contact Us</h4>
              <ul className="space-y-3 sm:space-y-4 text-sm">
                <li className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-white/70">Dar es Salaam, Tanzania</span>
                </li>
                <li className="flex items-start gap-3">
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                  <div className="text-white/70">
                    <p>UK: +44 7521 787 777</p>
                    <p>TZ: +255 693 300 300</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                  <span className="text-white/70 break-all">info@astralinelogistics.com</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10">
          <div className="container mx-auto px-4 py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 text-xs sm:text-sm text-white/50">
              <p className="text-center sm:text-left">© {new Date().getFullYear()} Astraline Logistics. All rights reserved.</p>
              <div className="flex gap-4 sm:gap-6">
                <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
                <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
