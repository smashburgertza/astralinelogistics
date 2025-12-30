import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, CloudUpload, PackageSearch, Settings2,
  LogOut, BellRing, ChevronDown, Building2, FileText, Receipt
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
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface AgentLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const navItems = [
  { label: 'Dashboard', href: '/agent', icon: LayoutDashboard },
  { label: 'My Shipments', href: '/agent/shipments', icon: PackageSearch },
  { label: 'My Invoices', href: '/agent/invoices', icon: FileText },
  { label: 'Settlements', href: '/agent/settlements', icon: Receipt },
];

const accountNavItems = [
  { label: 'Settings', href: '/agent/settings', icon: Settings2 },
];

export function AgentLayout({ children, title, subtitle }: AgentLayoutProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/system');
  };

  const isActive = (href: string) => location.pathname === href;

  const userInitials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : profile?.email?.slice(0, 2).toUpperCase() || 'AG';

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-muted/30">
        {/* Sidebar */}
        <Sidebar collapsible="icon" className="border-r border-sidebar-border shadow-sm">
          {/* Logo */}
          <SidebarHeader className="p-4 border-b border-sidebar-border group-data-[collapsible=icon]:px-2">
            <Link to="/" className="flex items-center group-data-[collapsible=icon]:justify-center">
              <img 
                src={astralineLogo} 
                alt="Astraline" 
                className="h-8 w-auto transition-all duration-300 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:object-left group-data-[collapsible=icon]:object-cover"
              />
            </Link>
          </SidebarHeader>

          {/* Company Name Badge */}
          {profile?.company_name && (
            <div className="px-4 py-3 border-b border-sidebar-border group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-2">
              <div className="flex items-center gap-2 text-sm group-data-[collapsible=icon]:justify-center">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-accent" />
                </div>
                <span className="text-muted-foreground font-medium transition-all duration-300 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden truncate">
                  {profile.company_name}
                </span>
              </div>
            </div>
          )}

          <SidebarContent className="px-3 py-4 group-data-[collapsible=icon]:px-2">
            {/* Main Navigation */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-muted-foreground/70 uppercase text-[11px] font-semibold tracking-wider mb-2 transition-all duration-300">
                Operations
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1 group-data-[collapsible=icon]:space-y-2">
                  {navItems.map((item) => (
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
                      {profile?.full_name || 'Agent'}
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
                <DropdownMenuItem onClick={() => navigate('/agent/settings')}>
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