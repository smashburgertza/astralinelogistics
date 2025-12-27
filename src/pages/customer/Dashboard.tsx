import { useState } from 'react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { StatCard } from '@/components/admin/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Package, FileText, CreditCard, MapPin, ArrowRight, Plane, Clock, CheckCircle, Search, ShoppingCart, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCustomerStats, useCustomerShipments, useCustomerInvoices } from '@/hooks/useCustomerPortal';
import { SHIPMENT_STATUSES } from '@/lib/constants';
import { useRegions } from '@/hooks/useRegions';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { NotificationsList } from '@/components/customer/NotificationsList';

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [trackingNumber, setTrackingNumber] = useState('');
  const { data: stats, isLoading: statsLoading } = useCustomerStats();
  const { data: shipments, isLoading: shipmentsLoading } = useCustomerShipments();
  const { data: invoices, isLoading: invoicesLoading } = useCustomerInvoices();
  const { data: regions } = useRegions();

  const recentShipments = shipments?.slice(0, 5) || [];
  const pendingInvoices = invoices?.filter(i => i.status === 'pending').slice(0, 3) || [];

  const handleTrack = () => {
    if (trackingNumber.trim()) {
      navigate(`/tracking?number=${encodeURIComponent(trackingNumber.trim())}`);
    }
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      collected: Package,
      in_transit: Plane,
      arrived: MapPin,
      delivered: CheckCircle,
    };
    return icons[status as keyof typeof icons] || Package;
  };

  const getRegionInfo = (regionCode: string) => {
    return regions?.find(r => r.code === regionCode);
  };

  return (
    <CustomerLayout title="Dashboard" subtitle="Track your shipments and manage your account.">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Active Shipments"
          value={statsLoading ? '...' : stats?.activeShipments || 0}
          subtitle="In transit"
          icon={Package}
          variant="navy"
        />
        <StatCard
          title="Pending Invoices"
          value={statsLoading ? '...' : stats?.pendingInvoices || 0}
          subtitle="Awaiting payment"
          icon={FileText}
          variant="warning"
        />
        <StatCard
          title="Total Paid"
          value={statsLoading ? '...' : `$${(stats?.totalPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          subtitle="All time"
          icon={CreditCard}
          variant="success"
        />
        <StatCard
          title="Delivered"
          value={statsLoading ? '...' : stats?.deliveredShipments || 0}
          subtitle="Completed shipments"
          icon={MapPin}
          variant="primary"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Shipments */}
        <Card className="lg:col-span-2 shadow-xl border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                  <Package className="w-4 h-4 text-white" />
                </div>
                My Shipments
              </CardTitle>
              <CardDescription className="mt-1">Track your active shipments</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-accent hover:text-accent/80" asChild>
              <Link to="/customer/shipments">
                View all <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {shipmentsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : recentShipments.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground font-medium mb-4">No shipments yet</p>
                <Button asChild>
                  <Link to="/">Request a Quote</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentShipments.map((shipment) => {
                  const StatusIcon = getStatusIcon(shipment.status || 'collected');
                  const statusConfig = SHIPMENT_STATUSES[shipment.status as keyof typeof SHIPMENT_STATUSES];
                  const region = getRegionInfo(shipment.origin_region);

                  return (
                    <div
                      key={shipment.id}
                      className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all duration-200 border border-transparent hover:border-border/50 cursor-pointer group"
                      onClick={() => navigate(`/tracking?number=${shipment.tracking_number}`)}
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <StatusIcon className="w-6 h-6 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-sm font-semibold text-primary">
                            {shipment.tracking_number}
                          </code>
                          <span className="text-muted-foreground/50">•</span>
                          <span className="text-sm text-muted-foreground">
                            <span className="text-base">{region?.flag_emoji}</span> {region?.name}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(shipment.created_at || ''), 'MMM d, yyyy')}
                          <span className="text-muted-foreground/50">•</span>
                          <span>{shipment.total_weight_kg} kg</span>
                        </p>
                      </div>
                      <Badge variant="outline" className={statusConfig?.color}>
                        {statusConfig?.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications, Quick Track & Invoices */}
        <div className="space-y-6">
          {/* Notifications */}
          <NotificationsList />

          {/* Quick Track */}
          <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
                  <Search className="w-4 h-4 text-white" />
                </div>
                Quick Track
              </CardTitle>
              <CardDescription>Enter a tracking number to check status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter tracking number..."
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
                  className="bg-muted/50 border-0"
                />
                <Button onClick={handleTrack} className="shrink-0">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pending Invoices */}
          <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-semibold">Pending Invoices</CardTitle>
                <CardDescription>Awaiting payment</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-accent hover:text-accent/80" asChild>
                <Link to="/customer/invoices">
                  View all <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {invoicesLoading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : pendingInvoices.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="text-sm text-muted-foreground">No pending invoices</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-orange-500/5 border border-orange-500/10 hover:bg-orange-500/10 transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-sm">{invoice.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">
                          Due: {invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-primary">
                          ${Number(invoice.amount).toFixed(2)}
                        </p>
                        <Badge variant="outline" className="text-orange-600 border-orange-500/50 bg-orange-500/10">
                          Pending
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shop For Me Card */}
          <Card className="shadow-xl border-0 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardContent className="relative z-10 p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  <ShoppingCart className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white text-lg">Shop For Me</p>
                  <Link to="/shop-for-me" className="text-white/80 hover:text-white text-sm flex items-center gap-1 group">
                    Paste links, we'll buy & ship 
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Help Card */}
          <Card className="shadow-xl border-0 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
            <CardContent className="relative z-10 p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  <Plane className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white text-lg">Need help shipping?</p>
                  <Link to="/" className="text-amber-300 hover:text-amber-200 text-sm flex items-center gap-1 group">
                    Contact our team
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </CustomerLayout>
  );
}
