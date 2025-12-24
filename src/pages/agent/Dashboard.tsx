import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Upload, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { REGIONS } from '@/lib/constants';

export default function AgentDashboard() {
  const { getRegion } = useAuth();
  const region = getRegion();
  const regionInfo = region ? REGIONS[region] : null;

  return (
    <DashboardLayout title="Agent Dashboard" portalType="agent">
      <div className="mb-6">
        <p className="text-muted-foreground">
          {regionInfo ? `${regionInfo.flag} ${regionInfo.label} Agent` : 'Agent Portal'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Shipments This Month</CardTitle>
            <Package className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Weight (kg)</CardTitle>
            <TrendingUp className="w-4 h-4 text-success" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Upload</CardTitle>
            <Upload className="w-4 h-4 text-warning" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Shipments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No shipments uploaded yet.</p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
