import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, PackageSearch, UsersRound, FileStack, Wallet,
  ChartSpline, Settings2, LogOut, BellRing, Search, ChevronDown, UserCircle2,
  Container, UserCog, ReceiptText, TrendingUp, ShoppingCart, FileText, User
} from 'lucide-react';
import astralineLogo from '@/assets/astraline-logo.svg';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const mainNavItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'My Dashboard', href: '/admin/my-dashboard', icon: User },
  { label: 'Shipments', href: '/admin/shipments', icon: PackageSearch },
  { label: 'Customers', href: '/admin/customers', icon: UsersRound },
  { label: 'Estimates', href: '/admin/estimates', icon: ReceiptText },
  { label: 'Invoices', href: '/admin/invoices', icon: FileStack },
  { label: 'Shop Orders', href: '/admin/orders', icon: ShoppingCart },
];

const financeNavItems = [
  { label: 'Expenses', href: '/admin/expenses', icon: Wallet },
  { label: 'Commissions', href: '/admin/commissions', icon: TrendingUp },
  { label: 'Reports', href: '/admin/reports', icon: ChartSpline },
];

const managementNavItems = [
  { label: 'Page Content', href: '/admin/content', icon: FileText },
  { label: 'Employees', href: '/admin/employees', icon: UserCog },
  { label: 'Agents', href: '/admin/agents', icon: Container },
  { label: 'Settings', href: '/admin/settings', icon: Settings2 },
];

export function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  const { profile, signOut, hasRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (href: string) => location.pathname === href;

  const userInitials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : profile?.email?.slice(0, 2).toUpperCase() || 'AD';

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-muted/30">
        {/* Sidebar */}
        <Sidebar className="border-r-0">
          {/* Logo */}
          <SidebarHeader className="p-4 border-b border-sidebar-border">
            <Link to="/admin" className="flex items-center gap-3">
              <img 
                src={astralineLogo} 
                alt="Astraline" 
                className="h-10 w-auto group-data-[collapsible=icon]:hidden"
              />
              <div className="hidden group-data-[collapsible=icon]:block w-10 h-10 rounded-xl bg-primary flex items-center justify-center font-heading font-bold text-lg text-primary-foreground shadow-gold">
                A
              </div>
            </Link>
          </SidebarHeader>

          <SidebarContent className="px-2 py-4">
            {/* Main Navigation */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs tracking-wider">
                Main
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {mainNavItems.map((item) => (
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

            {/* Finance */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs tracking-wider">
                Finance
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {financeNavItems.map((item) => (
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

            {/* Management */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs tracking-wider">
                Management
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {managementNavItems.map((item) => (
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

          {/* User Section */}
          <SidebarFooter className="p-4 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-sidebar-accent transition-colors group-data-[collapsible=icon]:justify-center">
                  <Avatar className="h-9 w-9 bg-primary">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium text-sidebar-primary-foreground truncate">
                      {profile?.full_name || 'Admin User'}
                    </p>
                    <p className="text-xs text-sidebar-foreground/60 truncate">
                      {hasRole('super_admin') ? 'Super Admin' : 'Employee'}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/admin/profile')}>
                  <UserCircle2 className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/admin/settings')}>
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
            
            <div className="flex-1 flex items-center gap-4">
              <div className="hidden md:flex relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search shipments, customers..."
                  className="pl-10 bg-muted/50 border-0 focus-visible:ring-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-accent">
                <BellRing className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full animate-pulse" />
              </Button>
            </div>
          </header>

          {/* Page Header */}
          <div className="px-6 py-6 border-b border-border bg-background">
            <h1 className="text-2xl font-heading font-bold text-foreground">{title}</h1>
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
