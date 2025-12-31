import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Loader2 } from "lucide-react";

// Public pages - loaded eagerly for fast initial render
import Index from "./pages/Index";
import AuthPage from "./pages/Auth";
import SystemAuthPage from "./pages/SystemAuth";
import TrackingPage from "./pages/Tracking";
import ShopForMe from "./pages/ShopForMe";
import OrderTracking from "./pages/OrderTracking";
import AboutPage from "./pages/About";
import ContactPage from "./pages/Contact";
import NotFound from "./pages/NotFound";

// Customer Portal - lazy loaded
const CustomerDashboard = lazy(() => import("./pages/customer/Dashboard"));
const CustomerShipmentsPage = lazy(() => import("./pages/customer/Shipments"));
const CustomerInvoicesPage = lazy(() => import("./pages/customer/Invoices"));
const CustomerEstimatesPage = lazy(() => import("./pages/customer/Estimates"));
const CustomerTrackPage = lazy(() => import("./pages/customer/Track"));
const CustomerOrdersPage = lazy(() => import("./pages/customer/Orders"));
const CustomerSettingsPage = lazy(() => import("./pages/customer/Settings"));
const CustomerPaymentsPage = lazy(() => import("./pages/customer/Payments"));

// Agent Portal - lazy loaded
const AgentDashboard = lazy(() => import("./pages/agent/Dashboard"));
const AgentUploadPage = lazy(() => import("./pages/agent/Upload"));
const AgentShipmentsPage = lazy(() => import("./pages/agent/Shipments"));
const AgentInvoicesPage = lazy(() => import("./pages/agent/Invoices"));
const AgentSettlementsPage = lazy(() => import("./pages/agent/Settlements"));
const AgentSettingsPage = lazy(() => import("./pages/agent/Settings"));

// Admin Portal - lazy loaded
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminShipmentsPage = lazy(() => import("./pages/admin/Shipments"));
const AdminBillingPage = lazy(() => import("./pages/admin/Billing"));
const AdminCustomersPage = lazy(() => import("./pages/admin/Customers"));
const AdminExpensesPage = lazy(() => import("./pages/admin/Expenses"));
const AdminOrderRequestsPage = lazy(() => import("./pages/admin/OrderRequests"));
const AdminPageContentPage = lazy(() => import("./pages/admin/PageContent"));
const AdminAgentsPage = lazy(() => import("./pages/admin/Agents"));
const AdminEmployeesPage = lazy(() => import("./pages/admin/Employees"));
const AdminSettingsPage = lazy(() => import("./pages/admin/Settings"));
const AdminCommissionsPage = lazy(() => import("./pages/admin/Commissions"));
const AdminEmployeeDashboard = lazy(() => import("./pages/admin/EmployeeDashboard"));
const AdminAccountingPage = lazy(() => import("./pages/admin/Accounting"));
const AdminAnalyticsPage = lazy(() => import("./pages/admin/Analytics"));
const AdminProfilePage = lazy(() => import("./pages/admin/Profile"));
const AdminNotificationsPage = lazy(() => import("./pages/admin/Notifications"));
const AdminPayrollPage = lazy(() => import("./pages/admin/Payroll"));

const AdminSettlementsPage = lazy(() => import("./pages/admin/Settlements"));
const AdminApprovalsPage = lazy(() => import("./pages/admin/Approvals"));

const queryClient = new QueryClient();

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

// Component that enables real-time sync across all pages
function RealtimeSyncProvider({ children }: { children: React.ReactNode }) {
  useRealtimeSync();
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <RealtimeSyncProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/tracking" element={<TrackingPage />} />
              <Route path="/shop-for-me" element={<ShopForMe />} />
              <Route path="/order-tracking" element={<OrderTracking />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
            </Route>
            
            {/* Auth */}
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/system" element={<SystemAuthPage />} />
            
            {/* Customer Portal - Lazy Loaded */}
            <Route path="/customer" element={<Suspense fallback={<PageLoader />}><CustomerDashboard /></Suspense>} />
            <Route path="/customer/shipments" element={<Suspense fallback={<PageLoader />}><CustomerShipmentsPage /></Suspense>} />
            <Route path="/customer/invoices" element={<Suspense fallback={<PageLoader />}><CustomerInvoicesPage /></Suspense>} />
            <Route path="/customer/estimates" element={<Suspense fallback={<PageLoader />}><CustomerEstimatesPage /></Suspense>} />
            <Route path="/customer/track" element={<Suspense fallback={<PageLoader />}><CustomerTrackPage /></Suspense>} />
            <Route path="/customer/orders" element={<Suspense fallback={<PageLoader />}><CustomerOrdersPage /></Suspense>} />
            <Route path="/customer/settings" element={<Suspense fallback={<PageLoader />}><CustomerSettingsPage /></Suspense>} />
            <Route path="/customer/payments" element={<Suspense fallback={<PageLoader />}><CustomerPaymentsPage /></Suspense>} />
            
            {/* Agent Portal - Lazy Loaded */}
            <Route path="/agent" element={<Suspense fallback={<PageLoader />}><AgentDashboard /></Suspense>} />
            <Route path="/agent/upload" element={<Suspense fallback={<PageLoader />}><AgentUploadPage /></Suspense>} />
            <Route path="/agent/shipments" element={<Suspense fallback={<PageLoader />}><AgentShipmentsPage /></Suspense>} />
            <Route path="/agent/invoices" element={<Suspense fallback={<PageLoader />}><AgentInvoicesPage /></Suspense>} />
            <Route path="/agent/settlements" element={<Suspense fallback={<PageLoader />}><AgentSettlementsPage /></Suspense>} />
            <Route path="/agent/settings" element={<Suspense fallback={<PageLoader />}><AgentSettingsPage /></Suspense>} />
            
            {/* Admin Portal - Lazy Loaded with Permission Gates */}
            <Route path="/admin" element={<Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense>} />
            <Route path="/admin/my-dashboard" element={<Suspense fallback={<PageLoader />}><AdminEmployeeDashboard /></Suspense>} />
            <Route path="/admin/profile" element={<Suspense fallback={<PageLoader />}><AdminProfilePage /></Suspense>} />
            <Route path="/admin/notifications" element={<Suspense fallback={<PageLoader />}><AdminNotificationsPage /></Suspense>} />
            
            {/* Shipments - requires manage_shipments */}
            <Route path="/admin/shipments" element={<Suspense fallback={<PageLoader />}><PermissionGate permission="manage_shipments"><AdminShipmentsPage /></PermissionGate></Suspense>} />
            <Route path="/admin/orders" element={<Suspense fallback={<PageLoader />}><PermissionGate permission="manage_shipments"><AdminOrderRequestsPage /></PermissionGate></Suspense>} />
            
            {/* Customers - requires manage_customers */}
            <Route path="/admin/customers" element={<Suspense fallback={<PageLoader />}><PermissionGate permission="manage_customers"><AdminCustomersPage /></PermissionGate></Suspense>} />
            
            {/* Billing - requires manage_invoices */}
            <Route path="/admin/billing" element={<Suspense fallback={<PageLoader />}><PermissionGate permission="manage_invoices"><AdminBillingPage /></PermissionGate></Suspense>} />
            <Route path="/admin/approvals" element={<Suspense fallback={<PageLoader />}><PermissionGate permission="manage_invoices"><AdminApprovalsPage /></PermissionGate></Suspense>} />
            <Route path="/admin/settlements" element={<Suspense fallback={<PageLoader />}><PermissionGate permission="manage_invoices"><AdminSettlementsPage /></PermissionGate></Suspense>} />
            
            {/* Expenses - requires manage_expenses */}
            <Route path="/admin/expenses" element={<Suspense fallback={<PageLoader />}><PermissionGate permission="manage_expenses"><AdminExpensesPage /></PermissionGate></Suspense>} />
            
            {/* Reports & Analytics - requires view_reports */}
            <Route path="/admin/accounting" element={<Suspense fallback={<PageLoader />}><PermissionGate permission="view_reports"><AdminAccountingPage /></PermissionGate></Suspense>} />
            <Route path="/admin/analytics" element={<Suspense fallback={<PageLoader />}><PermissionGate permission="view_reports"><AdminAnalyticsPage /></PermissionGate></Suspense>} />
            <Route path="/admin/commissions" element={<Suspense fallback={<PageLoader />}><PermissionGate permission="view_reports"><AdminCommissionsPage /></PermissionGate></Suspense>} />
            
            {/* Agents - requires manage_agents */}
            <Route path="/admin/agents" element={<Suspense fallback={<PageLoader />}><PermissionGate permission="manage_agents"><AdminAgentsPage /></PermissionGate></Suspense>} />
            
            {/* Settings & Management - requires manage_settings */}
            <Route path="/admin/content" element={<Suspense fallback={<PageLoader />}><PermissionGate permission="manage_settings"><AdminPageContentPage /></PermissionGate></Suspense>} />
            <Route path="/admin/employees" element={<Suspense fallback={<PageLoader />}><PermissionGate permission="manage_settings"><AdminEmployeesPage /></PermissionGate></Suspense>} />
            <Route path="/admin/payroll" element={<Suspense fallback={<PageLoader />}><PermissionGate permission="manage_settings"><AdminPayrollPage /></PermissionGate></Suspense>} />
            <Route path="/admin/settings" element={<Suspense fallback={<PageLoader />}><PermissionGate permission="manage_settings"><AdminSettingsPage /></PermissionGate></Suspense>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </TooltipProvider>
      </RealtimeSyncProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
