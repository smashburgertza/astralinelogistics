import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, PhoneCall, MailOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export function PublicNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, isAdmin, isAgent, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getDashboardRoute = () => {
    if (isAdmin()) return '/admin';
    if (isAgent()) return '/agent';
    return '/customer';
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isHome = location.pathname === '/';

  return (
    <>
      {/* Top Bar */}
      <div className="hidden md:block bg-brand-navy text-white text-sm py-2">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <a href="tel:+447521787777" className="flex items-center gap-2 hover:text-primary transition-colors">
              <PhoneCall className="w-3.5 h-3.5" />
              <span>UK: +44 7521 787 777</span>
            </a>
            <a href="tel:+255693300300" className="flex items-center gap-2 hover:text-primary transition-colors">
              <PhoneCall className="w-3.5 h-3.5" />
              <span>TZ: +255 693 300 300</span>
            </a>
          </div>
          <a href="mailto:info@astralinelogistics.com" className="flex items-center gap-2 hover:text-primary transition-colors">
            <MailOpen className="w-3.5 h-3.5" />
            <span>info@astralinelogistics.com</span>
          </a>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled || !isHome 
          ? "bg-white shadow-lg" 
          : "bg-transparent"
      )}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-lg flex items-center justify-center font-heading font-bold text-xl transition-colors",
                scrolled || !isHome ? "bg-brand-navy text-white" : "bg-primary text-primary-foreground"
              )}>
                A
              </div>
              <div className="hidden sm:block">
                <span className={cn(
                  "text-xl font-heading font-bold transition-colors",
                  scrolled || !isHome ? "text-brand-navy" : "text-white"
                )}>Astraline</span>
                <span className={cn(
                  "block text-xs transition-colors",
                  scrolled || !isHome ? "text-muted-foreground" : "text-white/70"
                )}>Logistics</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              {[
                { label: 'Home', href: '/' },
                { label: 'About Us', href: '/about' },
                { label: 'Services', href: '/services' },
                { label: 'Track Shipment', href: '/tracking' },
                { label: 'FAQ', href: '/faq' },
                { label: 'Contact', href: '/contact' },
              ].map((item) => (
                <Link 
                  key={item.href}
                  to={item.href} 
                  className={cn(
                    "font-medium transition-colors relative group",
                    scrolled || !isHome 
                      ? "text-foreground hover:text-primary" 
                      : "text-white hover:text-primary",
                    location.pathname === item.href && "text-primary"
                  )}
                >
                  {item.label}
                  <span className={cn(
                    "absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full",
                    location.pathname === item.href && "w-full"
                  )} />
                </Link>
              ))}
            </div>

            {/* Auth Buttons */}
            <div className="hidden lg:flex items-center gap-3">
              {user ? (
                <>
                  <Button 
                    variant={scrolled || !isHome ? "outline" : "ghost"}
                    className={!scrolled && isHome ? "text-white border-white hover:bg-white/10" : ""}
                    onClick={() => navigate(getDashboardRoute())}
                  >
                    Dashboard
                  </Button>
                  <Button variant="default" onClick={handleSignOut}>
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant={scrolled || !isHome ? "outline" : "ghost"}
                    className={!scrolled && isHome ? "text-white border-white hover:bg-white/10" : ""}
                    asChild
                  >
                    <Link to="/auth">Sign In</Link>
                  </Button>
                  <Button asChild>
                    <Link to="/auth?mode=signup">Get a Quote</Link>
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className={cn(
                "lg:hidden p-2 rounded-lg transition-colors",
                scrolled || !isHome ? "text-foreground hover:bg-muted" : "text-white hover:bg-white/10"
              )}
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isOpen && (
            <div className="lg:hidden py-6 border-t border-border/20 bg-white animate-slide-up">
              <div className="flex flex-col gap-2">
                {[
                  { label: 'Home', href: '/' },
                  { label: 'About Us', href: '/about' },
                  { label: 'Services', href: '/services' },
                  { label: 'Track Shipment', href: '/tracking' },
                  { label: 'FAQ', href: '/faq' },
                  { label: 'Contact', href: '/contact' },
                ].map((item) => (
                  <Link 
                    key={item.href}
                    to={item.href} 
                    className="py-3 px-4 text-foreground hover:text-primary hover:bg-muted/50 rounded-lg transition-colors font-medium"
                    onClick={() => setIsOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="pt-4 mt-2 border-t border-border flex flex-col gap-2 px-4">
                  {user ? (
                    <>
                      <Button variant="outline" onClick={() => { navigate(getDashboardRoute()); setIsOpen(false); }}>
                        Dashboard
                      </Button>
                      <Button onClick={() => { handleSignOut(); setIsOpen(false); }}>
                        Sign Out
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" asChild>
                        <Link to="/auth" onClick={() => setIsOpen(false)}>Sign In</Link>
                      </Button>
                      <Button asChild>
                        <Link to="/auth?mode=signup" onClick={() => setIsOpen(false)}>Get a Quote</Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
