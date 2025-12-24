import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { PublicLayout } from "@/components/layout/PublicLayout";
import Index from "./pages/Index";
import AuthPage from "./pages/Auth";
import TrackingPage from "./pages/Tracking";
import ShopForMe from "./pages/ShopForMe";
import AboutPage from "./pages/About";
import ContactPage from "./pages/Contact";
import CustomerDashboard from "./pages/customer/Dashboard";
import CustomerShipmentsPage from "./pages/customer/Shipments";
import CustomerInvoicesPage from "./pages/customer/Invoices";
import CustomerTrackPage from "./pages/customer/Track";
import CustomerOrdersPage from "./pages/customer/Orders";
import CustomerSettingsPage from "./pages/customer/Settings";
import CustomerPaymentsPage from "./pages/customer/Payments";
import AgentDashboard from "./pages/agent/Dashboard";
import AgentUploadPage from "./pages/agent/Upload";
import AgentShipmentsPage from "./pages/agent/Shipments";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminShipmentsPage from "./pages/admin/Shipments";
import AdminInvoicesPage from "./pages/admin/Invoices";
import AdminCustomersPage from "./pages/admin/Customers";
import AdminExpensesPage from "./pages/admin/Expenses";
import AdminOrderRequestsPage from "./pages/admin/OrderRequests";
import AdminPageContentPage from "./pages/admin/PageContent";
import AdminAgentsPage from "./pages/admin/Agents";
import AdminEmployeesPage from "./pages/admin/Employees";
import AdminSettingsPage from "./pages/admin/Settings";
import AdminReportsPage from "./pages/admin/Reports";
import AdminCommissionsPage from "./pages/admin/Commissions";
import AdminEstimatesPage from "./pages/admin/Estimates";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
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
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
            </Route>
            
            {/* Auth */}
            <Route path="/auth" element={<AuthPage />} />
            
            {/* Customer Portal */}
            <Route path="/customer" element={<CustomerDashboard />} />
            <Route path="/customer/shipments" element={<CustomerShipmentsPage />} />
            <Route path="/customer/invoices" element={<CustomerInvoicesPage />} />
            <Route path="/customer/track" element={<CustomerTrackPage />} />
            <Route path="/customer/orders" element={<CustomerOrdersPage />} />
            <Route path="/customer/settings" element={<CustomerSettingsPage />} />
            <Route path="/customer/payments" element={<CustomerPaymentsPage />} />
            
            {/* Agent Portal */}
            <Route path="/agent" element={<AgentDashboard />} />
            <Route path="/agent/upload" element={<AgentUploadPage />} />
            <Route path="/agent/shipments" element={<AgentShipmentsPage />} />
            
            {/* Admin Portal */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/shipments" element={<AdminShipmentsPage />} />
            <Route path="/admin/invoices" element={<AdminInvoicesPage />} />
            <Route path="/admin/customers" element={<AdminCustomersPage />} />
            <Route path="/admin/expenses" element={<AdminExpensesPage />} />
            <Route path="/admin/orders" element={<AdminOrderRequestsPage />} />
            <Route path="/admin/content" element={<AdminPageContentPage />} />
            <Route path="/admin/agents" element={<AdminAgentsPage />} />
            <Route path="/admin/employees" element={<AdminEmployeesPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
            <Route path="/admin/reports" element={<AdminReportsPage />} />
            <Route path="/admin/commissions" element={<AdminCommissionsPage />} />
            <Route path="/admin/estimates" element={<AdminEstimatesPage />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
