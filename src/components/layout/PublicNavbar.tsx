import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export function PublicNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAdmin, isAgent, signOut } = useAuth();
  const navigate = useNavigate();

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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Plane className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">Astraline</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              Home
            </Link>
            <Link to="/services" className="text-muted-foreground hover:text-foreground transition-colors">
              Services
            </Link>
            <Link to="/tracking" className="text-muted-foreground hover:text-foreground transition-colors">
              Track Shipment
            </Link>
            <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </Link>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Button variant="ghost" onClick={() => navigate(getDashboardRoute())}>
                  Dashboard
                </Button>
                <Button variant="outline" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link to="/auth?mode=signup">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border animate-slide-up">
            <div className="flex flex-col gap-4">
              <Link to="/" className="py-2 text-muted-foreground hover:text-foreground" onClick={() => setIsOpen(false)}>
                Home
              </Link>
              <Link to="/services" className="py-2 text-muted-foreground hover:text-foreground" onClick={() => setIsOpen(false)}>
                Services
              </Link>
              <Link to="/tracking" className="py-2 text-muted-foreground hover:text-foreground" onClick={() => setIsOpen(false)}>
                Track Shipment
              </Link>
              <Link to="/contact" className="py-2 text-muted-foreground hover:text-foreground" onClick={() => setIsOpen(false)}>
                Contact
              </Link>
              <div className="pt-4 border-t border-border flex flex-col gap-2">
                {user ? (
                  <>
                    <Button variant="ghost" onClick={() => { navigate(getDashboardRoute()); setIsOpen(false); }}>
                      Dashboard
                    </Button>
                    <Button variant="outline" onClick={() => { handleSignOut(); setIsOpen(false); }}>
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" asChild>
                      <Link to="/auth" onClick={() => setIsOpen(false)}>Sign In</Link>
                    </Button>
                    <Button asChild>
                      <Link to="/auth?mode=signup" onClick={() => setIsOpen(false)}>Get Started</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
