import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Users, DollarSign, TrendingUp, FileText, Plane } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <DashboardLayout title="Admin Dashboard" portalType="admin">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Shipments</CardTitle>
            <Package className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Customers</CardTitle>
            <Users className="w-4 h-4 text-info" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-muted-foreground">Registered</p>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
            <DollarSign className="w-4 h-4 text-success" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">$0</p>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Invoices</CardTitle>
            <FileText className="w-4 h-4 text-warning" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Shipments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">No shipments yet.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Shipments by Region</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-8">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div><span className="text-2xl">🇪🇺</span><p className="text-sm text-muted-foreground">Europe: 0</p></div>
              <div><span className="text-2xl">🇦🇪</span><p className="text-sm text-muted-foreground">Dubai: 0</p></div>
              <div><span className="text-2xl">🇨🇳</span><p className="text-sm text-muted-foreground">China: 0</p></div>
              <div><span className="text-2xl">🇮🇳</span><p className="text-sm text-muted-foreground">India: 0</p></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
