import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Plane, Menu, X, LogOut, User, Home, 
  Package, FileText, CreditCard, Bell,
  Users, BarChart3, Settings, Truck,
  DollarSign, Upload, MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  portalType: 'admin' | 'agent' | 'customer';
}

const adminNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: <Home className="w-5 h-5" /> },
  { label: 'Shipments', href: '/admin/shipments', icon: <Package className="w-5 h-5" /> },
  { label: 'Customers', href: '/admin/customers', icon: <Users className="w-5 h-5" /> },
  { label: 'Invoices', href: '/admin/invoices', icon: <FileText className="w-5 h-5" /> },
  { label: 'Expenses', href: '/admin/expenses', icon: <DollarSign className="w-5 h-5" /> },
  { label: 'Reports', href: '/admin/reports', icon: <BarChart3 className="w-5 h-5" /> },
  { label: 'Employees', href: '/admin/employees', icon: <Users className="w-5 h-5" /> },
  { label: 'Settings', href: '/admin/settings', icon: <Settings className="w-5 h-5" /> },
];

const agentNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/agent', icon: <Home className="w-5 h-5" /> },
  { label: 'Upload Shipment', href: '/agent/upload', icon: <Upload className="w-5 h-5" /> },
  { label: 'My Shipments', href: '/agent/shipments', icon: <Package className="w-5 h-5" /> },
  { label: 'Settings', href: '/agent/settings', icon: <Settings className="w-5 h-5" /> },
];

const customerNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/customer', icon: <Home className="w-5 h-5" /> },
  { label: 'My Shipments', href: '/customer/shipments', icon: <Package className="w-5 h-5" /> },
  { label: 'Track', href: '/customer/track', icon: <MapPin className="w-5 h-5" /> },
  { label: 'Invoices', href: '/customer/invoices', icon: <FileText className="w-5 h-5" /> },
  { label: 'Payments', href: '/customer/payments', icon: <CreditCard className="w-5 h-5" /> },
];

export function DashboardLayout({ children, title, portalType }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = portalType === 'admin' 
    ? adminNavItems 
    : portalType === 'agent' 
      ? agentNavItems 
      : customerNavItems;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar transform transition-transform duration-300 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center gap-2 px-4 border-b border-sidebar-border">
            <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <Plane className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <span className="text-lg font-bold text-sidebar-primary-foreground">Astraline</span>
              <span className="block text-xs text-sidebar-foreground/60 capitalize">{portalType} Portal</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "sidebar-link",
                  location.pathname === item.href && "active"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center">
                <User className="w-5 h-5 text-sidebar-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-primary-foreground truncate">
                  {profile?.full_name || profile?.email}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  {profile?.email}
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 bg-background border-b border-border flex items-center px-4 gap-4">
          <button
            className="lg:hidden p-2 hover:bg-accent rounded-lg"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">{title}</h1>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
          </Button>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
