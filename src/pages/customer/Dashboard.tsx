import { useState } from 'react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { StatCard } from '@/components/admin/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Package, FileText, CreditCard, MapPin, ArrowRight, Plane, Clock, CheckCircle, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCustomerStats, useCustomerShipments, useCustomerInvoices } from '@/hooks/useCustomerPortal';
import { SHIPMENT_STATUSES, REGIONS } from '@/lib/constants';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [trackingNumber, setTrackingNumber] = useState('');
  const { data: stats, isLoading: statsLoading } = useCustomerStats();
  const { data: shipments, isLoading: shipmentsLoading } = useCustomerShipments();
  const { data: invoices, isLoading: invoicesLoading } = useCustomerInvoices();

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
          value={statsLoading ? '...' : `$${(stats?.totalPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
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
        <Card className="lg:col-span-2 shadow-lg border-0">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-heading text-lg">My Shipments</CardTitle>
              <CardDescription>Track your active shipments</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
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
                <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No shipments yet</p>
                <Button asChild>
                  <Link to="/">Request a Quote</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentShipments.map((shipment) => {
                  const StatusIcon = getStatusIcon(shipment.status || 'collected');
                  const statusConfig = SHIPMENT_STATUSES[shipment.status as keyof typeof SHIPMENT_STATUSES];
                  const region = REGIONS[shipment.origin_region as keyof typeof REGIONS];

                  return (
                    <div
                      key={shipment.id}
                      className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => navigate(`/tracking?number=${shipment.tracking_number}`)}
                    >
                      <div className="w-10 h-10 rounded-lg bg-brand-navy/10 flex items-center justify-center">
                        <StatusIcon className="w-5 h-5 text-brand-navy" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-sm font-medium text-brand-gold">
                            {shipment.tracking_number}
                          </code>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-sm text-muted-foreground">
                            {region?.flag} {region?.label}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(shipment.created_at || ''), 'MMM d, yyyy')}
                          <span>•</span>
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

        {/* Quick Track & Invoices */}
        <div className="space-y-6">
          {/* Quick Track */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Quick Track</CardTitle>
              <CardDescription>Enter a tracking number to check status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter tracking number..."
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
                />
                <Button onClick={handleTrack}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pending Invoices */}
          <Card className="shadow-lg border-0">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-heading text-lg">Pending Invoices</CardTitle>
                <CardDescription>Awaiting payment</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
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
                  <CheckCircle className="w-10 h-10 text-green-500/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No pending invoices</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div>
                        <p className="font-medium text-sm">{invoice.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">
                          Due: {invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">
                          ${Number(invoice.amount).toFixed(2)}
                        </p>
                        <Badge variant="outline" className="text-amber-600 border-amber-600">
                          Pending
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Help Card */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-brand-navy to-brand-navy/80 text-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                  <Plane className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-medium">Need help shipping?</p>
                  <Link to="/" className="text-brand-gold hover:underline text-sm">
                    Contact our team →
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
