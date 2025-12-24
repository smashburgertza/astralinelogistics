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

  const getFirstName = () => {
    if (profile?.full_name) {
      return profile.full_name.split(' ')[0];
    }
    if (user?.email) {
      return user.email.split('@')[0].split('.')[0];
    }
    return 'there';
  };

  const firstName = getFirstName();

  const navItems = [
    { label: 'Home', href: '/#' },
    { label: 'Shop For Me', href: '/#shop-for-me' },
    { label: 'Services', href: '/#services' },
    { label: 'About Us', href: '/#about' },
    { label: 'Contact', href: '/#contact' },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const isHashLink = href.startsWith('/#');
    
    if (isHashLink) {
      e.preventDefault();
      const targetId = href.replace('/#', '');
      
      if (location.pathname !== '/') {
        navigate('/');
        setTimeout(() => {
          const element = document.getElementById(targetId);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else if (targetId === '') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }, 100);
      } else {
        if (targetId === '') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          const element = document.getElementById(targetId);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }
      setIsOpen(false);
    }
  };

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
              {navItems.map((item) => (
                <a 
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)} 
                  className="font-medium transition-colors relative group text-foreground hover:text-primary cursor-pointer"
                >
                  {item.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
                </a>
              ))}
            </div>

            <div className="hidden lg:flex items-center gap-3">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2 px-3 hover:bg-primary/10">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary uppercase">
                          {firstName.charAt(0)}
                        </span>
                      </div>
                      <span className="font-medium">Hi, {firstName}</span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 p-2 bg-background border border-border shadow-xl rounded-xl z-50">
                    <div className="px-2 py-3 mb-2 border-b border-border">
                      <p className="font-medium">{firstName}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <DropdownMenuItem onClick={() => navigate(getDashboardRoute())} className="cursor-pointer rounded-lg py-2.5">
                      <LayoutDashboard className="w-4 h-4 mr-3" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-2" />
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer rounded-lg py-2.5 text-destructive focus:text-destructive focus:bg-destructive/10">
                      <LogOut className="w-4 h-4 mr-3" />
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
                {navItems.map((item) => (
                  <a 
                    key={item.href}
                    href={item.href}
                    onClick={(e) => handleNavClick(e, item.href)}
                    className="py-2.5 px-3 text-sm text-foreground hover:text-primary hover:bg-muted/50 rounded-lg transition-colors font-medium cursor-pointer"
                  >
                    {item.label}
                  </a>
                ))}
                <div className="pt-3 mt-2 border-t border-border px-1">
                  {user ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 px-2 py-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary uppercase">
                            {firstName.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">Hi, {firstName}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { navigate(getDashboardRoute()); setIsOpen(false); }}>
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        Dashboard
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { handleSignOut(); setIsOpen(false); }}>
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
