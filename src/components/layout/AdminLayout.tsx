import { ReactNode, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, PackageSearch, UsersRound, FileStack, Wallet,
  ChartSpline, Settings2, LogOut, ChevronDown, UserCircle2,
  Container, UserCog, ReceiptText, TrendingUp, ShoppingCart, FileText, User, Calculator, BarChart3, PiggyBank
} from 'lucide-react';
import astralineLogo from '@/assets/astraline-logo-horizontal.svg';
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
import { Badge } from '@/components/ui/badge';
import { useAuth, PermissionKey } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { NotificationDropdown } from '@/components/admin/NotificationDropdown';
import { GlobalSearch } from '@/components/admin/GlobalSearch';
import { useSidebarCounts } from '@/hooks/useSidebarCounts';
import { useRealtimeNotifications } from '@/hooks/usePushNotifications';
import { LucideIcon } from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: PermissionKey;
  countKey?: keyof ReturnType<typeof useSidebarCounts>['data'];
}

const mainNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'My Dashboard', href: '/admin/my-dashboard', icon: User },
  { label: 'Shipments', href: '/admin/shipments', icon: PackageSearch, permission: 'manage_shipments', countKey: 'shipments' },
  { label: 'Customers', href: '/admin/customers', icon: UsersRound, permission: 'manage_customers', countKey: 'customers' },
  { label: 'Billing', href: '/admin/billing', icon: FileStack, permission: 'manage_invoices', countKey: 'invoices' },
  { label: 'Shop Orders', href: '/admin/orders', icon: ShoppingCart, permission: 'manage_shipments', countKey: 'orders' },
];

const financeNavItems: NavItem[] = [
  { label: 'Accounting', href: '/admin/accounting', icon: Calculator, permission: 'view_reports' },
  { label: 'Financial Summary', href: '/admin/financial-summary', icon: PiggyBank, permission: 'view_reports' },
  { label: 'Batch Profitability', href: '/admin/batches', icon: Container, permission: 'view_reports' },
  { label: 'Settlements', href: '/admin/settlements', icon: TrendingUp, permission: 'manage_invoices', countKey: 'settlements' },
  { label: 'Expenses', href: '/admin/expenses', icon: Wallet, permission: 'manage_expenses', countKey: 'expenses' },
  { label: 'Commissions', href: '/admin/commissions', icon: TrendingUp, permission: 'view_reports' },
  { label: 'Reports', href: '/admin/reports', icon: ChartSpline, permission: 'view_reports' },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3, permission: 'view_reports' },
];

const managementNavItems: NavItem[] = [
  { label: 'Page Content', href: '/admin/content', icon: FileText, permission: 'manage_settings' },
  { label: 'Employees', href: '/admin/employees', icon: UserCog, permission: 'manage_settings' },
  { label: 'Agents', href: '/admin/agents', icon: Container, permission: 'manage_agents' },
  { label: 'Settings', href: '/admin/settings', icon: Settings2, permission: 'manage_settings' },
];

export function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  const { profile, signOut, hasRole, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: counts } = useSidebarCounts();
  
  // Enable realtime push notifications
  useRealtimeNotifications();

  // Filter navigation items based on user permissions
  const filterNavItems = (items: NavItem[]) => {
    return items.filter(item => {
      if (!item.permission) return true;
      return hasPermission(item.permission);
    });
  };

  const filteredMainNav = useMemo(() => filterNavItems(mainNavItems), [hasPermission]);
  const filteredFinanceNav = useMemo(() => filterNavItems(financeNavItems), [hasPermission]);
  const filteredManagementNav = useMemo(() => filterNavItems(managementNavItems), [hasPermission]);

  const getCount = (countKey?: keyof NonNullable<typeof counts>) => {
    if (!countKey || !counts) return 0;
    return counts[countKey] || 0;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/system');
  };

  const isActive = (href: string) => location.pathname === href;

  const userInitials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : profile?.email?.slice(0, 2).toUpperCase() || 'AD';

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-muted/30">
        {/* Sidebar */}
        <Sidebar collapsible="icon" className="border-r border-sidebar-border shadow-sm">
          {/* Logo */}
          <SidebarHeader className="p-4 border-b border-sidebar-border group-data-[collapsible=icon]:px-2">
            <Link to="/admin" className="flex items-center group-data-[collapsible=icon]:justify-center">
              <img 
                src={astralineLogo} 
                alt="Astraline" 
                className="h-8 w-auto transition-all duration-300 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:object-left group-data-[collapsible=icon]:object-cover"
              />
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
                  {filteredMainNav.map((item) => {
                    const count = getCount(item.countKey);
                    return (
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
                          <Link to={item.href} className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <item.icon className="w-5 h-5 shrink-0" />
                              <span className="transition-all duration-300 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0">{item.label}</span>
                            </div>
                            {count > 0 && (
                              <Badge variant="destructive" className="h-5 min-w-5 text-xs px-1.5 group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:top-0 group-data-[collapsible=icon]:right-0 group-data-[collapsible=icon]:scale-75">
                                {count > 99 ? '99+' : count}
                              </Badge>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Finance */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-muted-foreground/70 uppercase text-[11px] font-semibold tracking-wider mb-2 transition-all duration-300">
                Finance
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1 group-data-[collapsible=icon]:space-y-2">
                  {filteredFinanceNav.map((item) => {
                    const count = getCount(item.countKey);
                    return (
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
                          <Link to={item.href} className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <item.icon className="w-5 h-5 shrink-0" />
                              <span className="transition-all duration-300 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0">{item.label}</span>
                            </div>
                            {count > 0 && (
                              <Badge variant="destructive" className="h-5 min-w-5 text-xs px-1.5 group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:top-0 group-data-[collapsible=icon]:right-0 group-data-[collapsible=icon]:scale-75">
                                {count > 99 ? '99+' : count}
                              </Badge>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Management - only show if user has any management items */}
            {filteredManagementNav.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-muted-foreground/70 uppercase text-[11px] font-semibold tracking-wider mb-2 transition-all duration-300">
                  Management
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="space-y-1 group-data-[collapsible=icon]:space-y-2">
                    {filteredManagementNav.map((item) => (
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
            )}
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
                      {profile?.full_name || 'Admin User'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {hasRole('super_admin') ? 'Super Admin' : 'Employee'}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground transition-all duration-300 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0" />
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
              <GlobalSearch />
            </div>

            <div className="flex items-center gap-2">
              <NotificationDropdown />
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
