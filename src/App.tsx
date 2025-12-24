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
import CustomerDashboard from "./pages/customer/Dashboard";
import AgentDashboard from "./pages/agent/Dashboard";
import AgentUploadPage from "./pages/agent/Upload";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminShipmentsPage from "./pages/admin/Shipments";
import AdminInvoicesPage from "./pages/admin/Invoices";
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
            </Route>
            
            {/* Auth */}
            <Route path="/auth" element={<AuthPage />} />
            
            {/* Customer Portal */}
            <Route path="/customer" element={<CustomerDashboard />} />
            
            {/* Agent Portal */}
            <Route path="/agent" element={<AgentDashboard />} />
            <Route path="/agent/upload" element={<AgentUploadPage />} />
            
            {/* Admin Portal */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/shipments" element={<AdminShipmentsPage />} />
            <Route path="/admin/invoices" element={<AdminInvoicesPage />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
