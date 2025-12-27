import { useMemo } from 'react';
import { AgentLayout } from '@/components/layout/AgentLayout';
import { StatCard } from '@/components/admin/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Upload, TrendingUp, ArrowRight, Plus, Clock, CloudUpload, Sparkles, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useAgentShipments, useAgentShipmentStats } from '@/hooks/useAgentShipments';
import { useAgentAssignedRegions } from '@/hooks/useAgentRegions';
import { ShipmentStatusBadge } from '@/components/admin/ShipmentStatusBadge';
import { BatchFreightCostCard } from '@/components/agent/BatchFreightCostCard';
import { useAgentBalance } from '@/hooks/useAgentBalance';

export default function AgentDashboard() {
  // Get assigned regions first - single source of truth
  const { data: assignedRegions = [] } = useAgentAssignedRegions();
  const regionCodes = useMemo(() => assignedRegions.map(r => r.region_code), [assignedRegions]);
  const regionNames = assignedRegions.map(r => r.region_name).filter(Boolean).join(', ');

  const { data: stats, isLoading: statsLoading } = useAgentShipmentStats(regionCodes);
  const { data: shipments, isLoading: shipmentsLoading } = useAgentShipments(regionCodes);
  const { data: balance, isLoading: balanceLoading } = useAgentBalance();
  
  const recentShipments = shipments?.slice(0, 5) || [];

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <AgentLayout 
      title="Agent Dashboard" 
      subtitle={regionNames ? `Managing shipments from ${regionNames}` : 'Upload and manage shipments'}
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {statsLoading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <StatCard
              title="Shipments This Month"
              value={stats?.thisMonth || 0}
              subtitle={`${stats?.total || 0} total`}
              icon={Package}
              variant="navy"
            />
            <StatCard
              title="Total Weight"
              value={`${stats?.thisMonthWeight?.toFixed(1) || 0} kg`}
              subtitle="This month"
              icon={TrendingUp}
              variant="primary"
            />
            <StatCard
              title="Collected"
              value={stats?.collected || 0}
              subtitle="Awaiting transit"
              icon={Upload}
              variant="warning"
            />
          </>
        )}
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {balanceLoading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            {/* Astraline Owes Agent */}
            <Card className="shadow-lg border-0 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Astraline Owes You</p>
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(balance?.pending_to_agent || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Paid: {formatCurrency(balance?.paid_to_agent || 0)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <ArrowDownLeft className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Agent Owes Astraline */}
            <Card className="shadow-lg border-0 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">You Owe Astraline</p>
                    <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                      {formatCurrency(balance?.pending_from_agent || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Paid: {formatCurrency(balance?.paid_from_agent || 0)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <ArrowUpRight className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Batch Freight Costs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <BatchFreightCostCard cargoType="air" />
        <BatchFreightCostCard cargoType="sea" />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Upload */}
        <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-accent/5 to-accent/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                <CloudUpload className="w-4 h-4 text-white" />
              </div>
              Quick Upload
            </CardTitle>
            <CardDescription>Add a new shipment to the system</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-teal-500/20 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
                <Plus className="w-10 h-10 text-emerald-600" />
              </div>
              <p className="text-muted-foreground mb-5 font-medium">Ready to upload a new shipment?</p>
              <Button size="lg" className="shadow-lg hover:shadow-xl transition-shadow" asChild>
                <Link to="/agent/upload">
                  <Upload className="w-5 h-5 mr-2" />
                  Upload Shipment
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Shipments */}
        <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                  <Package className="w-4 h-4 text-white" />
                </div>
                Recent Uploads
              </CardTitle>
              <CardDescription className="mt-1">Your latest shipment uploads</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-accent hover:text-accent/80" asChild>
              <Link to="/agent/shipments">
                View all <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {shipmentsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : recentShipments.length > 0 ? (
              <div className="space-y-3">
                {recentShipments.map((shipment) => (
                  <div
                    key={shipment.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all duration-200 border border-transparent hover:border-border/50 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono font-semibold text-primary truncate">
                          {shipment.tracking_number}
                        </code>
                        <ShipmentStatusBadge status={shipment.status || 'collected'} />
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(shipment.created_at), 'MMM d, yyyy')}
                        <span className="text-muted-foreground/50">•</span>
                        <span>{shipment.total_weight_kg} kg</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground font-medium">No shipments uploaded yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Start by uploading your first shipment</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
        <Button 
          variant="outline" 
          className="h-auto py-5 flex-col gap-3 bg-card/50 border-border/50 hover:bg-accent/5 hover:border-accent/50 hover:shadow-lg transition-all duration-300 group" 
          asChild
        >
          <Link to="/agent/upload">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CloudUpload className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="font-medium">New Shipment</span>
          </Link>
        </Button>
        <Button 
          variant="outline" 
          className="h-auto py-5 flex-col gap-3 bg-card/50 border-border/50 hover:bg-accent/5 hover:border-accent/50 hover:shadow-lg transition-all duration-300 group" 
          asChild
        >
          <Link to="/agent/shipments">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Package className="w-6 h-6 text-accent" />
            </div>
            <span className="font-medium">View Shipments</span>
          </Link>
        </Button>
        <Button 
          variant="outline" 
          className="h-auto py-5 flex-col gap-3 bg-card/50 border-border/50 hover:bg-accent/5 hover:border-accent/50 hover:shadow-lg transition-all duration-300 group col-span-2 md:col-span-1" 
          asChild
        >
          <Link to="/agent/settings">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6 text-violet-600" />
            </div>
            <span className="font-medium">Settings</span>
          </Link>
        </Button>
      </div>
    </AgentLayout>
  );
}
