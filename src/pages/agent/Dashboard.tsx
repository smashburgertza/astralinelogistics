import { AgentLayout } from '@/components/layout/AgentLayout';
import { StatCard } from '@/components/admin/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Upload, TrendingUp, ArrowRight, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { REGIONS } from '@/lib/constants';

export default function AgentDashboard() {
  const { getRegion } = useAuth();
  const region = getRegion();
  const regionInfo = region ? REGIONS[region] : null;

  return (
    <AgentLayout 
      title="Agent Dashboard" 
      subtitle={regionInfo ? `Managing shipments from ${regionInfo.label}` : 'Upload and manage shipments'}
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Shipments This Month"
          value={0}
          subtitle="Uploaded"
          icon={Package}
          variant="navy"
        />
        <StatCard
          title="Total Weight"
          value="0 kg"
          subtitle="This month"
          icon={TrendingUp}
          variant="primary"
        />
        <StatCard
          title="Pending Upload"
          value={0}
          subtitle="Awaiting"
          icon={Upload}
          variant="warning"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Upload */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Quick Upload</CardTitle>
            <CardDescription>Add a new shipment to the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-primary" />
              </div>
              <p className="text-muted-foreground mb-4">Ready to upload a new shipment?</p>
              <Button size="lg" asChild>
                <Link to="/agent/upload">
                  <Upload className="w-5 h-5 mr-2" />
                  Upload Shipment
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Shipments */}
        <Card className="shadow-lg border-0">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-heading text-lg">Recent Uploads</CardTitle>
              <CardDescription>Your latest shipment uploads</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/agent/shipments">
                View all <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No shipments uploaded yet</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AgentLayout>
  );
}
