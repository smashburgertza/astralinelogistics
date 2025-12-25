import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Package, Users, Receipt, TrendingUp, AlertCircle, 
  Truck, Clock, DollarSign, ShoppingBag, FileCheck,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

interface RoleWidgetProps {
  employeeRole: string | null;
  userId: string;
}

interface OperationsData {
  pendingShipments: number;
  inTransitShipments: number;
  arrivedShipments: number;
  recentShipments: Array<{ id: string; tracking_number: string; status: string; created_at: string }>;
}

interface FinanceData {
  pendingInvoices: number;
  pendingExpenses: number;
  overdueInvoices: number;
  totalPending: number;
  recentInvoices: Array<{ id: string; invoice_number: string; amount: number; status: string }>;
}

interface CustomerSupportData {
  totalCustomers: number;
  newCustomersThisMonth: number;
  pendingOrders: number;
  recentCustomers: Array<{ id: string; name: string; email: string; created_at: string }>;
}

interface ManagerData {
  totalEmployees: number;
  totalRevenue: number;
  totalShipments: number;
  pendingApprovals: number;
}

export function RoleBasedWidgets({ employeeRole, userId }: RoleWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [operationsData, setOperationsData] = useState<OperationsData | null>(null);
  const [financeData, setFinanceData] = useState<FinanceData | null>(null);
  const [customerSupportData, setCustomerSupportData] = useState<CustomerSupportData | null>(null);
  const [managerData, setManagerData] = useState<ManagerData | null>(null);

  useEffect(() => {
    fetchRoleData();
  }, [employeeRole, userId]);

  const fetchRoleData = async () => {
    setLoading(true);
    try {
      switch (employeeRole) {
        case 'operations':
          await fetchOperationsData();
          break;
        case 'finance':
          await fetchFinanceData();
          break;
        case 'customer_support':
          await fetchCustomerSupportData();
          break;
        case 'manager':
          await fetchManagerData();
          break;
        default:
          // For other roles, fetch a mix
          await fetchManagerData();
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchOperationsData = async () => {
    const [shipmentsRes] = await Promise.all([
      supabase
        .from('shipments')
        .select('id, tracking_number, status, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    const shipments = shipmentsRes.data || [];
    setOperationsData({
      pendingShipments: shipments.filter(s => s.status === 'collected').length,
      inTransitShipments: shipments.filter(s => s.status === 'in_transit').length,
      arrivedShipments: shipments.filter(s => s.status === 'arrived').length,
      recentShipments: shipments.slice(0, 5),
    });
  };

  const fetchFinanceData = async () => {
    const [invoicesRes, expensesRes] = await Promise.all([
      supabase
        .from('invoices')
        .select('id, invoice_number, amount, status, due_date')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('expenses')
        .select('id, status, amount')
        .eq('status', 'pending'),
    ]);

    const invoices = invoicesRes.data || [];
    const expenses = expensesRes.data || [];
    const now = new Date();

    setFinanceData({
      pendingInvoices: invoices.filter(i => i.status === 'pending').length,
      pendingExpenses: expenses.length,
      overdueInvoices: invoices.filter(i => 
        i.status === 'pending' && i.due_date && new Date(i.due_date) < now
      ).length,
      totalPending: invoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + Number(i.amount), 0),
      recentInvoices: invoices.slice(0, 5),
    });
  };

  const fetchCustomerSupportData = async () => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [customersRes, ordersRes] = await Promise.all([
      supabase
        .from('customers')
        .select('id, name, email, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('order_requests')
        .select('id, status')
        .eq('status', 'pending'),
    ]);

    const customers = customersRes.data || [];
    const orders = ordersRes.data || [];

    setCustomerSupportData({
      totalCustomers: customers.length,
      newCustomersThisMonth: customers.filter(c => 
        new Date(c.created_at || '') >= thisMonthStart
      ).length,
      pendingOrders: orders.length,
      recentCustomers: customers.slice(0, 5),
    });
  };

  const fetchManagerData = async () => {
    const [employeesRes, invoicesRes, shipmentsRes, expensesRes] = await Promise.all([
      supabase
        .from('user_roles')
        .select('id')
        .in('role', ['employee', 'super_admin']),
      supabase
        .from('invoices')
        .select('amount, status'),
      supabase
        .from('shipments')
        .select('id'),
      supabase
        .from('expenses')
        .select('id, status')
        .eq('status', 'pending'),
    ]);

    const employees = employeesRes.data || [];
    const invoices = invoicesRes.data || [];
    const shipments = shipmentsRes.data || [];
    const expenses = expensesRes.data || [];

    setManagerData({
      totalEmployees: employees.length,
      totalRevenue: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + Number(i.amount), 0),
      totalShipments: shipments.length,
      pendingApprovals: expenses.length,
    });
  };

  if (loading) {
    return (
      <Card className="mb-8">
        <CardContent className="p-6">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Operations Role Widget
  if (employeeRole === 'operations' && operationsData) {
    return (
      <Card className="mb-8 shadow-lg border-0 bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-600" />
            Operations Overview
          </CardTitle>
          <CardDescription>Quick access to shipment status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-background rounded-lg border">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="h-4 w-4 text-amber-500" />
                <p className="text-sm text-muted-foreground">Pending Collection</p>
              </div>
              <p className="text-2xl font-bold text-amber-600">{operationsData.pendingShipments}</p>
            </div>
            <div className="text-center p-4 bg-background rounded-lg border">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Truck className="h-4 w-4 text-blue-500" />
                <p className="text-sm text-muted-foreground">In Transit</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">{operationsData.inTransitShipments}</p>
            </div>
            <div className="text-center p-4 bg-background rounded-lg border">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Package className="h-4 w-4 text-emerald-500" />
                <p className="text-sm text-muted-foreground">Arrived</p>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{operationsData.arrivedShipments}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Recent Shipments</p>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/shipments" className="gap-1">
                  View All <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
            <div className="space-y-2">
              {operationsData.recentShipments.map((shipment) => (
                <div key={shipment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="font-mono text-sm">{shipment.tracking_number}</span>
                  <Badge variant={
                    shipment.status === 'delivered' ? 'default' :
                    shipment.status === 'arrived' ? 'secondary' :
                    shipment.status === 'in_transit' ? 'outline' : 'secondary'
                  }>
                    {shipment.status?.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Finance Role Widget
  if (employeeRole === 'finance' && financeData) {
    return (
      <Card className="mb-8 shadow-lg border-0 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            Finance Overview
          </CardTitle>
          <CardDescription>Invoices and expenses at a glance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-background rounded-lg border">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Receipt className="h-4 w-4 text-amber-500" />
                <p className="text-sm text-muted-foreground">Pending Invoices</p>
              </div>
              <p className="text-2xl font-bold text-amber-600">{financeData.pendingInvoices}</p>
            </div>
            <div className="text-center p-4 bg-background rounded-lg border">
              <div className="flex items-center justify-center gap-1 mb-1">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
              <p className="text-2xl font-bold text-red-600">{financeData.overdueInvoices}</p>
            </div>
            <div className="text-center p-4 bg-background rounded-lg border">
              <div className="flex items-center justify-center gap-1 mb-1">
                <FileCheck className="h-4 w-4 text-blue-500" />
                <p className="text-sm text-muted-foreground">Pending Expenses</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">{financeData.pendingExpenses}</p>
            </div>
            <div className="text-center p-4 bg-background rounded-lg border">
              <div className="flex items-center justify-center gap-1 mb-1">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                <p className="text-sm text-muted-foreground">Pending Amount</p>
              </div>
              <p className="text-xl font-bold text-emerald-600">
                ${financeData.totalPending.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/invoices">View Invoices</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/expenses">View Expenses</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Customer Support Role Widget
  if (employeeRole === 'customer_support' && customerSupportData) {
    return (
      <Card className="mb-8 shadow-lg border-0 bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            Customer Support Overview
          </CardTitle>
          <CardDescription>Customer activity and pending orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-background rounded-lg border">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Users className="h-4 w-4 text-purple-500" />
                <p className="text-sm text-muted-foreground">Total Customers</p>
              </div>
              <p className="text-2xl font-bold text-purple-600">{customerSupportData.totalCustomers}</p>
            </div>
            <div className="text-center p-4 bg-background rounded-lg border">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <p className="text-sm text-muted-foreground">New This Month</p>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{customerSupportData.newCustomersThisMonth}</p>
            </div>
            <div className="text-center p-4 bg-background rounded-lg border">
              <div className="flex items-center justify-center gap-1 mb-1">
                <ShoppingBag className="h-4 w-4 text-amber-500" />
                <p className="text-sm text-muted-foreground">Pending Orders</p>
              </div>
              <p className="text-2xl font-bold text-amber-600">{customerSupportData.pendingOrders}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Recent Customers</p>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/customers" className="gap-1">
                  View All <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
            <div className="space-y-2">
              {customerSupportData.recentCustomers.map((customer) => (
                <div key={customer.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{customer.name}</p>
                    <p className="text-xs text-muted-foreground">{customer.email}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(customer.created_at), 'MMM d')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Manager / Default Role Widget
  if (managerData) {
    return (
      <Card className="mb-8 shadow-lg border-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Business Overview
          </CardTitle>
          <CardDescription>Company-wide metrics at a glance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-background rounded-lg border">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Users className="h-4 w-4 text-blue-500" />
                <p className="text-sm text-muted-foreground">Total Staff</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">{managerData.totalEmployees}</p>
            </div>
            <div className="text-center p-4 bg-background rounded-lg border">
              <div className="flex items-center justify-center gap-1 mb-1">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                <p className="text-sm text-muted-foreground">Total Revenue</p>
              </div>
              <p className="text-xl font-bold text-emerald-600">
                ${managerData.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-center p-4 bg-background rounded-lg border">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Package className="h-4 w-4 text-purple-500" />
                <p className="text-sm text-muted-foreground">Total Shipments</p>
              </div>
              <p className="text-2xl font-bold text-purple-600">{managerData.totalShipments}</p>
            </div>
            <div className="text-center p-4 bg-background rounded-lg border">
              <div className="flex items-center justify-center gap-1 mb-1">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <p className="text-sm text-muted-foreground">Pending Approvals</p>
              </div>
              <p className="text-2xl font-bold text-amber-600">{managerData.pendingApprovals}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/reports">View Reports</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/analytics">View Analytics</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
