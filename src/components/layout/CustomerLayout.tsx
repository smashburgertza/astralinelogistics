import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, PackageSearch, MapPinned, FileStack, CreditCard,
  LogOut, BellRing, ChevronDown, UserCircle2, Settings2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface CustomerLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const navItems = [
  { label: 'Dashboard', href: '/customer', icon: LayoutDashboard },
  { label: 'My Shipments', href: '/customer/shipments', icon: PackageSearch },
  { label: 'Track Shipment', href: '/customer/track', icon: MapPinned },
  { label: 'Invoices', href: '/customer/invoices', icon: FileStack },
  { label: 'Payments', href: '/customer/payments', icon: CreditCard },
  { label: 'Settings', href: '/customer/settings', icon: Settings2 },
];

export function CustomerLayout({ children, title, subtitle }: CustomerLayoutProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (href: string) => location.pathname === href;

  const userInitials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : profile?.email?.slice(0, 2).toUpperCase() || 'CU';

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-muted/30">
        <Sidebar className="border-r-0">
          <SidebarHeader className="p-4 border-b border-sidebar-border">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center font-heading font-bold text-lg text-primary-foreground shadow-gold">
                A
              </div>
              <div className="group-data-[collapsible=icon]:hidden">
                <span className="text-lg font-heading font-bold text-sidebar-primary-foreground">Astraline</span>
                <span className="block text-xs text-sidebar-foreground/60">Customer Portal</span>
              </div>
            </Link>
          </SidebarHeader>

          <SidebarContent className="px-2 py-4">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.href)}
                        tooltip={item.label}
                        className={cn(
                          "transition-all duration-200",
                          isActive(item.href) && "bg-primary/10 text-primary border-l-2 border-primary"
                        )}
                      >
                        <Link to={item.href}>
                          <item.icon className="w-5 h-5" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-sidebar-accent transition-colors">
                  <Avatar className="h-9 w-9 bg-primary">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium text-sidebar-primary-foreground truncate">
                      {profile?.full_name || 'Customer'}
                    </p>
                    <p className="text-xs text-sidebar-foreground/60 truncate">
                      {profile?.email}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/customer/settings')}>
                  <Settings2 className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex flex-col">
          <header className="sticky top-0 z-30 h-16 bg-background/95 backdrop-blur-md border-b border-border flex items-center px-6 gap-4">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="flex-1" />
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-accent">
                <BellRing className="w-5 h-5" />
              </Button>
          </header>

          <div className="px-6 py-6 border-b border-border bg-background">
            <h1 className="text-2xl font-heading font-bold text-foreground">{title}</h1>
            {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
          </div>

          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
