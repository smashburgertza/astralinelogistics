import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package, Users, DollarSign, TrendingUp, 
  Plane, ArrowRight, Clock, CheckCircle,
  AlertCircle, MapPin
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { REGIONS, SHIPMENT_STATUSES, type Region, type ShipmentStatus } from '@/lib/constants';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalShipments: number;
  activeCustomers: number;
  revenue: number;
  pendingInvoices: number;
  shipmentsByRegion: Record<string, number>;
  recentShipments: any[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalShipments: 0,
    activeCustomers: 0,
    revenue: 0,
    pendingInvoices: 0,
    shipmentsByRegion: {},
    recentShipments: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch counts
      const [shipmentsRes, customersRes, invoicesRes] = await Promise.all([
        supabase.from('shipments').select('id, origin_region, status, tracking_number, total_weight_kg, created_at', { count: 'exact' }),
        supabase.from('customers').select('id', { count: 'exact' }),
        supabase.from('invoices').select('amount, status'),
      ]);

      const shipments = shipmentsRes.data || [];
      const pendingInvoices = (invoicesRes.data || []).filter(i => i.status === 'pending');
      const paidInvoices = (invoicesRes.data || []).filter(i => i.status === 'paid');
      const revenue = paidInvoices.reduce((sum, i) => sum + Number(i.amount), 0);

      // Calculate shipments by region
      const shipmentsByRegion: Record<string, number> = {};
      shipments.forEach((s: any) => {
        shipmentsByRegion[s.origin_region] = (shipmentsByRegion[s.origin_region] || 0) + 1;
      });

      setStats({
        totalShipments: shipmentsRes.count || 0,
        activeCustomers: customersRes.count || 0,
        revenue,
        pendingInvoices: pendingInvoices.length,
        shipmentsByRegion,
        recentShipments: shipments.slice(0, 5),
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: ShipmentStatus) => {
    const config = SHIPMENT_STATUSES[status];
    return (
      <Badge variant="outline" className={`status-badge ${config.color}`}>
        {config.label}
      </Badge>
    );
  };

  return (
    <AdminLayout title="Dashboard" subtitle="Welcome back! Here's what's happening with your logistics.">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Shipments"
          value={stats.totalShipments}
          subtitle="This month"
          icon={Package}
          variant="navy"
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Active Customers"
          value={stats.activeCustomers}
          subtitle="Registered"
          icon={Users}
          variant="primary"
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          title="Revenue"
          value={`$${stats.revenue.toLocaleString()}`}
          subtitle="This month"
          icon={DollarSign}
          variant="success"
          trend={{ value: 24, isPositive: true }}
        />
        <StatCard
          title="Pending Invoices"
          value={stats.pendingInvoices}
          subtitle="Awaiting payment"
          icon={AlertCircle}
          variant="warning"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Shipments */}
        <Card className="lg:col-span-2 shadow-lg border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="font-heading text-lg">Recent Shipments</CardTitle>
              <CardDescription>Latest shipment activity</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/shipments">
                View all
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {stats.recentShipments.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No shipments yet</p>
                <Button className="mt-4" asChild>
                  <Link to="/admin/shipments/new">Create First Shipment</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.recentShipments.map((shipment: any) => (
                  <div 
                    key={shipment.id} 
                    className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-brand-navy/10 flex items-center justify-center">
                      <Plane className="w-5 h-5 text-brand-navy" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{shipment.tracking_number}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <span>{REGIONS[shipment.origin_region as Region]?.flag}</span>
                        <span>{shipment.total_weight_kg}kg</span>
                        <span>•</span>
                        <span>{format(new Date(shipment.created_at), 'MMM d')}</span>
                      </p>
                    </div>
                    {getStatusBadge(shipment.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shipments by Region */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Shipments by Region</CardTitle>
            <CardDescription>Distribution across origins</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(REGIONS).map(([key, region]) => {
                const count = stats.shipmentsByRegion[key] || 0;
                const total = stats.totalShipments || 1;
                const percentage = Math.round((count / total) * 100) || 0;

                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{region.flag}</span>
                        <span className="font-medium">{region.label}</span>
                      </div>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-brand-navy to-primary rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {stats.totalShipments === 0 && (
              <div className="text-center py-8">
                <MapPin className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No data yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
        <Button variant="outline" className="h-auto py-4 flex-col gap-2 hover:bg-primary/5 hover:border-primary" asChild>
          <Link to="/admin/shipments/new">
            <Package className="w-6 h-6 text-primary" />
            <span>New Shipment</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex-col gap-2 hover:bg-primary/5 hover:border-primary" asChild>
          <Link to="/admin/customers/new">
            <Users className="w-6 h-6 text-primary" />
            <span>Add Customer</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex-col gap-2 hover:bg-primary/5 hover:border-primary" asChild>
          <Link to="/admin/invoices/new">
            <DollarSign className="w-6 h-6 text-primary" />
            <span>Create Invoice</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex-col gap-2 hover:bg-primary/5 hover:border-primary" asChild>
          <Link to="/admin/reports">
            <TrendingUp className="w-6 h-6 text-primary" />
            <span>View Reports</span>
          </Link>
        </Button>
      </div>
    </AdminLayout>
  );
}
