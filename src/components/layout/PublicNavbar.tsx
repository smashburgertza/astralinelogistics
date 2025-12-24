import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { MenuIcon, XIcon, PhoneCall, MailOpen, User, LayoutDashboard, LogOut, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import astralineLogo from '@/assets/astraline-logo.svg';
import astralineLogoWhite from '@/assets/astraline-logo-white.svg';

export function PublicNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { user, profile, isAdmin, isAgent, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const userName = profile?.full_name || user?.email?.split('@')[0] || 'User';

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const getDashboardRoute = () => {
    if (isAdmin()) return '/admin';
    if (isAgent()) return '/agent';
    return '/customer';
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

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
      <nav className="sticky top-0 z-50 bg-white shadow-lg transition-all duration-300">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <img 
                src={astralineLogo} 
                alt="Astraline Logistics" 
                className="h-12 w-auto"
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              {[
                { label: 'Home', href: '/' },
                { label: 'Shop For Me', href: '/shop-for-me' },
                { label: 'Services', href: '/services' },
                { label: 'About Us', href: '/about' },
                { label: 'Contact', href: '/contact' },
              ].map((item) => (
                <Link 
                  key={item.href}
                  to={item.href} 
                  className={cn(
                    "font-medium transition-colors relative group text-foreground hover:text-primary",
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

            <div className="hidden lg:flex items-center gap-3">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <User className="w-4 h-4" />
                      <span className="max-w-[120px] truncate">Hello, {userName}</span>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-background border border-border shadow-lg z-50">
                    <DropdownMenuItem onClick={() => navigate(getDashboardRoute())} className="cursor-pointer">
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Button variant="outline" asChild>
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
              ref={buttonRef}
              className={cn(
                "lg:hidden p-2.5 rounded-xl border-2 transition-all duration-200 text-foreground border-border hover:bg-muted hover:border-primary/30",
                isOpen && "bg-primary border-primary text-primary-foreground hover:bg-primary/90"
              )}
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? "Close menu" : "Open menu"}
            >
              {isOpen ? <XIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isOpen && (
            <div ref={menuRef} className="lg:hidden absolute right-4 top-full mt-2 w-64 py-4 bg-white rounded-xl shadow-xl border border-border/50 animate-fade-in z-50">
              <div className="flex flex-col gap-1 px-2">
                {[
                  { label: 'Home', href: '/' },
                  { label: 'Shop For Me', href: '/shop-for-me' },
                  { label: 'Services', href: '/services' },
                  { label: 'About Us', href: '/about' },
                  { label: 'Contact', href: '/contact' },
                ].map((item) => (
                  <Link 
                    key={item.href}
                    to={item.href} 
                    className={cn(
                      "py-2.5 px-3 text-sm text-foreground hover:text-primary hover:bg-muted/50 rounded-lg transition-colors font-medium",
                      location.pathname === item.href && "bg-primary/10 text-primary"
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="pt-3 mt-2 border-t border-border px-1">
                  {user ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground px-2 py-1">
                        Hello, {userName}
                      </p>
                      <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { navigate(getDashboardRoute()); setIsOpen(false); }}>
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        Dashboard
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-destructive hover:text-destructive" onClick={() => { handleSignOut(); setIsOpen(false); }}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/auth" onClick={() => setIsOpen(false)}>Sign In</Link>
                      </Button>
                      <Button size="sm" asChild>
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
