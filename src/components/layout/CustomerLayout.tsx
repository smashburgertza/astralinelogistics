import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, PackageSearch, MapPinned, FileStack, CreditCard,
  LogOut, BellRing, ChevronDown, UserCircle2, Settings2, ShoppingBag, ClipboardList
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
  SidebarGroupLabel,
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

const mainNavItems = [
  { label: 'Dashboard', href: '/customer', icon: LayoutDashboard },
  { label: 'My Shipments', href: '/customer/shipments', icon: PackageSearch },
  { label: 'Track Shipment', href: '/customer/track', icon: MapPinned },
  { label: 'Shop For Me', href: '/shop-for-me', icon: ShoppingBag },
  { label: 'Order History', href: '/customer/orders', icon: ClipboardList },
];

const billingNavItems = [
  { label: 'Invoices', href: '/customer/invoices', icon: FileStack },
  { label: 'Payments', href: '/customer/payments', icon: CreditCard },
];

const accountNavItems = [
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
        {/* Sidebar */}
        <Sidebar collapsible="icon" className="border-r border-sidebar-border shadow-sm">
          {/* Logo */}
          <SidebarHeader className="p-4 border-b border-sidebar-border group-data-[collapsible=icon]:px-2">
            <Link to="/" className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center font-bold text-lg text-accent-foreground shadow-md shrink-0 transition-transform duration-300">
                A
              </div>
              <span className="font-bold text-lg text-foreground transition-all duration-300 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden">
                Astraline
              </span>
            </Link>
          </SidebarHeader>

          <SidebarContent className="px-3 py-4 group-data-[collapsible=icon]:px-2">
            {/* Main Navigation */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-muted-foreground/70 uppercase text-[11px] font-semibold tracking-wider mb-2 transition-all duration-300">
                Main
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1 group-data-[collapsible=icon]:space-y-2">
                  {mainNavItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.href)}
                        tooltip={item.label}
                        className={cn(
                          "transition-all duration-300 rounded-lg font-medium",
                          isActive(item.href) 
                            ? "bg-accent text-accent-foreground shadow-sm" 
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <Link to={item.href}>
                          <item.icon className="w-5 h-5 shrink-0" />
                          <span className="transition-all duration-300 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Billing */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-muted-foreground/70 uppercase text-[11px] font-semibold tracking-wider mb-2 transition-all duration-300">
                Billing
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1 group-data-[collapsible=icon]:space-y-2">
                  {billingNavItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.href)}
                        tooltip={item.label}
                        className={cn(
                          "transition-all duration-300 rounded-lg font-medium",
                          isActive(item.href) 
                            ? "bg-accent text-accent-foreground shadow-sm" 
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <Link to={item.href}>
                          <item.icon className="w-5 h-5 shrink-0" />
                          <span className="transition-all duration-300 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Account */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-muted-foreground/70 uppercase text-[11px] font-semibold tracking-wider mb-2 transition-all duration-300">
                Account
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1 group-data-[collapsible=icon]:space-y-2">
                  {accountNavItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.href)}
                        tooltip={item.label}
                        className={cn(
                          "transition-all duration-300 rounded-lg font-medium",
                          isActive(item.href) 
                            ? "bg-accent text-accent-foreground shadow-sm" 
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <Link to={item.href}>
                          <item.icon className="w-5 h-5 shrink-0" />
                          <span className="transition-all duration-300 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          {/* User Section */}
          <SidebarFooter className="p-3 border-t border-sidebar-border group-data-[collapsible=icon]:px-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-sidebar-accent transition-all duration-300 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1.5">
                  <Avatar className="h-9 w-9 bg-accent shrink-0">
                    <AvatarFallback className="bg-accent text-accent-foreground text-sm font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left transition-all duration-300 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden">
                    <p className="text-sm font-medium text-foreground truncate">
                      {profile?.full_name || 'Customer'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {profile?.email}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground transition-all duration-300 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0" />
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

        {/* Main Content */}
        <SidebarInset className="flex flex-col">
          {/* Top Header */}
          <header className="sticky top-0 z-30 h-16 bg-background/95 backdrop-blur-md border-b border-border flex items-center px-6 gap-4">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="flex-1" />
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-accent">
              <BellRing className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full animate-pulse" />
            </Button>
          </header>

          {/* Page Header */}
          <div className="px-6 py-6 border-b border-border bg-background">
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
          </div>

          {/* Page Content */}
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}