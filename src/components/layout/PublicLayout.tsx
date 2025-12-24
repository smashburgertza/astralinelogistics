import { Outlet } from 'react-router-dom';
import { PublicNavbar } from './PublicNavbar';
import { Plane, Mail, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicNavbar />
      <main className="flex-1 pt-16">
        <Outlet />
      </main>
      <footer className="bg-sidebar text-sidebar-foreground py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <Plane className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-sidebar-primary-foreground">Astraline</span>
              </div>
              <p className="text-sidebar-foreground/70 text-sm">
                Your trusted partner for air cargo logistics from Europe, Dubai, China, and India to Tanzania.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-sidebar-primary-foreground mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/services" className="text-sidebar-foreground/70 hover:text-sidebar-primary transition-colors">Services</Link></li>
                <li><Link to="/tracking" className="text-sidebar-foreground/70 hover:text-sidebar-primary transition-colors">Track Shipment</Link></li>
                <li><Link to="/contact" className="text-sidebar-foreground/70 hover:text-sidebar-primary transition-colors">Contact Us</Link></li>
                <li><Link to="/auth" className="text-sidebar-foreground/70 hover:text-sidebar-primary transition-colors">Customer Portal</Link></li>
              </ul>
            </div>

            {/* Origins */}
            <div>
              <h4 className="font-semibold text-sidebar-primary-foreground mb-4">We Ship From</h4>
              <ul className="space-y-2 text-sm text-sidebar-foreground/70">
                <li>🇬🇧 United Kingdom</li>
                <li>🇩🇪 Germany</li>
                <li>🇫🇷 France</li>
                <li>🇦🇪 Dubai, UAE</li>
                <li>🇨🇳 China</li>
                <li>🇮🇳 India</li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold text-sidebar-primary-foreground mb-4">Contact</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2 text-sidebar-foreground/70">
                  <MapPin className="w-4 h-4" />
                  Dar es Salaam, Tanzania
                </li>
                <li className="flex items-center gap-2 text-sidebar-foreground/70">
                  <Phone className="w-4 h-4" />
                  +255 123 456 789
                </li>
                <li className="flex items-center gap-2 text-sidebar-foreground/70">
                  <Mail className="w-4 h-4" />
                  info@astraline.co.tz
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-sidebar-border text-center text-sm text-sidebar-foreground/50">
            <p>© {new Date().getFullYear()} Astraline Logistics. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
