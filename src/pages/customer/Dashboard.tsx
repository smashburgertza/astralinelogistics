import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { StatCard } from '@/components/admin/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, FileText, CreditCard, MapPin, ArrowRight, Plane } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CustomerDashboard() {
  return (
    <CustomerLayout title="Dashboard" subtitle="Track your shipments and manage your account.">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Active Shipments"
          value={0}
          subtitle="In transit"
          icon={Package}
          variant="navy"
        />
        <StatCard
          title="Pending Invoices"
          value={0}
          subtitle="Awaiting payment"
          icon={FileText}
          variant="warning"
        />
        <StatCard
          title="Total Paid"
          value="$0"
          subtitle="All time"
          icon={CreditCard}
          variant="success"
        />
        <StatCard
          title="Delivered"
          value={0}
          subtitle="Completed shipments"
          icon={MapPin}
          variant="primary"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Shipments */}
        <Card className="shadow-lg border-0">
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
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No shipments yet</p>
              <Button asChild>
                <Link to="/contact">Request a Quote</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Track */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Quick Track</CardTitle>
            <CardDescription>Enter a tracking number to check status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Enter tracking number..."
                  className="flex-1 px-4 py-2 rounded-lg border border-border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button>Track</Button>
              </div>
              
              <div className="p-4 rounded-xl bg-muted/50 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-navy/10 flex items-center justify-center">
                  <Plane className="w-6 h-6 text-brand-navy" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Need help shipping?</p>
                  <Link to="/contact" className="text-primary hover:underline font-medium text-sm">
                    Contact our team →
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CustomerLayout>
  );
}
