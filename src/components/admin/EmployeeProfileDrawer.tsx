import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import {
  User, Mail, Phone, Calendar, FileText, DollarSign,
  Package, TrendingUp, Award, BarChart3, Clock, CheckCircle,
  XCircle, AlertCircle, ArrowUpRight, ArrowDownRight, Trophy, Medal
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { MILESTONES } from '@/hooks/useEmployeeMilestones';
import { useEmployeeBadges } from '@/hooks/useEmployeeBadges';
import { BadgeShowcase } from '@/components/admin/EmployeeBadgesDisplay';

interface EmployeeProfileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string | null;
}

interface EmployeeProfile {
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  employeeRole: string | null;
  createdAt: string | null;
}

interface PerformanceMetrics {
  totalEstimates: number;
  totalInvoices: number;
  totalShipments: number;
  totalRevenue: number;
  paidInvoices: number;
  pendingInvoices: number;
  totalExpenses: number;
  approvedExpenses: number;
  pendingExpenses: number;
  monthlyData: Array<{
    month: string;
    estimates: number;
    invoices: number;
    shipments: number;
    revenue: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: 'estimate' | 'invoice' | 'shipment' | 'expense';
    description: string;
    date: Date;
    status?: string;
  }>;
}

export function EmployeeProfileDrawer({ open, onOpenChange, employeeId }: EmployeeProfileDrawerProps) {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [achievedMilestones, setAchievedMilestones] = useState<Array<{
    milestone_type: string;
    milestone_value: string;
    achieved_at: string;
  }>>([]);
  
  const { badges, isLoading: badgesLoading } = useEmployeeBadges(employeeId || undefined);

  useEffect(() => {
    if (open && employeeId) {
      fetchEmployeeData();
    }
  }, [open, employeeId]);

  const fetchEmployeeData = async () => {
    if (!employeeId) return;
    setLoading(true);

    try {
      // Fetch employee profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone')
        .eq('id', employeeId)
        .maybeSingle();

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('employee_role, created_at')
        .eq('user_id', employeeId)
        .maybeSingle();

      if (profileData) {
        setProfile({
          userId: profileData.id,
          fullName: profileData.full_name || 'Unknown',
          email: profileData.email,
          phone: profileData.phone,
          employeeRole: roleData?.employee_role || null,
          createdAt: roleData?.created_at || null,
        });
      }

      // Fetch performance metrics
      const now = new Date();
      
      // Estimates
      const { data: estimates } = await supabase
        .from('estimates')
        .select('id, estimate_number, created_at, status, total')
        .eq('created_by', employeeId);

      // Invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, created_at, status, amount, amount_in_tzs, paid_at')
        .eq('created_by', employeeId);

      // Shipments
      const { data: shipments } = await supabase
        .from('shipments')
        .select('id, tracking_number, created_at, status')
        .eq('created_by', employeeId);

      // Expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('id, description, created_at, status, amount')
        .or(`submitted_by.eq.${employeeId},created_by.eq.${employeeId}`);

      // Calculate monthly data for last 6 months
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);

        const monthEstimates = estimates?.filter(e => {
          const date = new Date(e.created_at || '');
          return date >= monthStart && date <= monthEnd;
        }) || [];

        const monthInvoices = invoices?.filter(inv => {
          const date = new Date(inv.created_at || '');
          return date >= monthStart && date <= monthEnd;
        }) || [];

        const monthShipments = shipments?.filter(s => {
          const date = new Date(s.created_at || '');
          return date >= monthStart && date <= monthEnd;
        }) || [];

        const monthRevenue = monthInvoices
          .filter(i => i.status === 'paid')
          .reduce((sum, i) => sum + Number(i.amount_in_tzs || i.amount), 0);

        monthlyData.push({
          month: format(monthDate, 'MMM'),
          estimates: monthEstimates.length,
          invoices: monthInvoices.length,
          shipments: monthShipments.length,
          revenue: monthRevenue,
        });
      }

      // Recent activity
      const recentActivity: PerformanceMetrics['recentActivity'] = [];

      estimates?.slice(0, 5).forEach(e => {
        recentActivity.push({
          id: e.id,
          type: 'estimate',
          description: `Estimate ${e.estimate_number}`,
          date: new Date(e.created_at || ''),
          status: e.status || undefined,
        });
      });

      invoices?.slice(0, 5).forEach(i => {
        recentActivity.push({
          id: i.id,
          type: 'invoice',
          description: `Invoice ${i.invoice_number}`,
          date: new Date(i.created_at || ''),
          status: i.status || undefined,
        });
      });

      shipments?.slice(0, 5).forEach(s => {
        recentActivity.push({
          id: s.id,
          type: 'shipment',
          description: `Shipment ${s.tracking_number}`,
          date: new Date(s.created_at || ''),
          status: s.status || undefined,
        });
      });

      recentActivity.sort((a, b) => b.date.getTime() - a.date.getTime());

      const paidInvoices = invoices?.filter(i => i.status === 'paid') || [];
      const pendingInvoices = invoices?.filter(i => i.status === 'pending') || [];
      const approvedExpenses = expenses?.filter(e => e.status === 'approved') || [];
      const pendingExpenses = expenses?.filter(e => e.status === 'pending') || [];

      setMetrics({
        totalEstimates: estimates?.length || 0,
        totalInvoices: invoices?.length || 0,
        totalShipments: shipments?.length || 0,
        totalRevenue: paidInvoices.reduce((sum, i) => sum + Number(i.amount_in_tzs || i.amount), 0),
        paidInvoices: paidInvoices.length,
        pendingInvoices: pendingInvoices.length,
        totalExpenses: expenses?.length || 0,
        approvedExpenses: approvedExpenses.length,
        pendingExpenses: pendingExpenses.length,
        monthlyData,
        recentActivity: recentActivity.slice(0, 10),
      });

      // Fetch achieved milestones
      const { data: milestones } = await supabase
        .from('employee_milestones')
        .select('milestone_type, milestone_value, achieved_at')
        .eq('employee_id', employeeId)
        .order('achieved_at', { ascending: false });

      setAchievedMilestones(milestones || []);
    } catch (error) {
      console.error('Error fetching employee data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case 'manager': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'operations': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'finance': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'customer_support': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'paid':
      case 'approved':
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'pending':
      case 'collected':
      case 'in_transit':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'denied':
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'estimate': return <FileText className="w-4 h-4 text-violet-500" />;
      case 'invoice': return <DollarSign className="w-4 h-4 text-emerald-500" />;
      case 'shipment': return <Package className="w-4 h-4 text-blue-500" />;
      case 'expense': return <DollarSign className="w-4 h-4 text-orange-500" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-md border border-border/50 rounded-xl p-3 shadow-xl">
          <p className="font-medium text-sm mb-1">{label}</p>
          {payload.map((item: any, index: number) => (
            <p key={index} className="text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-muted-foreground">{item.name}:</span>
              <span className="font-semibold">
                {item.dataKey === 'revenue' ? `TZS ${item.value.toLocaleString()}` : item.value}
              </span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden p-0">
        <ScrollArea className="h-full">
          <div className="p-6">
            <SheetHeader className="mb-6">
              <SheetTitle className="text-xl">Employee Profile</SheetTitle>
              <SheetDescription>Detailed performance metrics and history</SheetDescription>
            </SheetHeader>

            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-24 bg-muted/50 rounded-xl" />
                <div className="h-48 bg-muted/50 rounded-xl" />
                <div className="h-32 bg-muted/50 rounded-xl" />
              </div>
            ) : profile && metrics ? (
              <div className="space-y-6">
                {/* Profile Header */}
                <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20">
                  <Avatar className="h-16 w-16 border-4 border-background shadow-lg">
                    <AvatarFallback className="bg-gradient-to-br from-accent to-accent/80 text-accent-foreground font-semibold text-lg">
                      {getInitials(profile.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-semibold">{profile.fullName}</h3>
                      {profile.employeeRole && (
                        <Badge variant="outline" className={`capitalize ${getRoleBadgeColor(profile.employeeRole)}`}>
                          {profile.employeeRole.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {profile.email}
                      </p>
                      {profile.phone && (
                        <p className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          {profile.phone}
                        </p>
                      )}
                      {profile.createdAt && (
                        <p className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Joined {format(new Date(profile.createdAt), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className="bg-violet-500/5 border-violet-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-violet-600" />
                        </div>
                        <span className="text-xs text-muted-foreground">Estimates</span>
                      </div>
                      <p className="text-2xl font-bold">{metrics.totalEstimates}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-emerald-500/5 border-emerald-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <DollarSign className="w-4 h-4 text-emerald-600" />
                        </div>
                        <span className="text-xs text-muted-foreground">Invoices</span>
                      </div>
                      <p className="text-2xl font-bold">{metrics.totalInvoices}</p>
                      <p className="text-xs text-emerald-600">{metrics.paidInvoices} paid</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-500/5 border-blue-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Package className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-xs text-muted-foreground">Shipments</span>
                      </div>
                      <p className="text-2xl font-bold">{metrics.totalShipments}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-amber-500/5 border-amber-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-amber-600" />
                        </div>
                        <span className="text-xs text-muted-foreground">Revenue</span>
                      </div>
                      <p className="text-lg font-bold">TZS {(metrics.totalRevenue / 1000000).toFixed(1)}M</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabs for Charts and Activity */}
                <Tabs defaultValue="performance" className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                    <TabsTrigger value="revenue">Revenue</TabsTrigger>
                    <TabsTrigger value="badges">
                      <Medal className="w-3.5 h-3.5 mr-1" />
                      Badges
                    </TabsTrigger>
                    <TabsTrigger value="milestones">
                      <Trophy className="w-3.5 h-3.5 mr-1" />
                      Milestones
                    </TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                  </TabsList>

                  <TabsContent value="performance" className="mt-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Activity</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={metrics.monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                            <XAxis 
                              dataKey="month" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                            />
                            <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="estimates" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Estimates" />
                            <Bar dataKey="invoices" fill="#10B981" radius={[4, 4, 0, 0]} name="Invoices" />
                            <Bar dataKey="shipments" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Shipments" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="revenue" className="mt-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Revenue Trend</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                          <AreaChart data={metrics.monthlyData}>
                            <defs>
                              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                            <XAxis 
                              dataKey="month" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                            />
                            <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                              tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area 
                              type="monotone" 
                              dataKey="revenue" 
                              stroke="#10B981" 
                              strokeWidth={2}
                              fill="url(#revenueGrad)" 
                              name="Revenue"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="badges" className="mt-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Medal className="w-4 h-4 text-amber-500" />
                          Performance Badges
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {badgesLoading ? (
                          <div className="animate-pulse space-y-3">
                            <div className="h-20 bg-muted/50 rounded-lg" />
                            <div className="h-16 bg-muted/50 rounded-lg" />
                          </div>
                        ) : (
                          <BadgeShowcase badges={badges} />
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="milestones" className="mt-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-amber-500" />
                          Achievements
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {achievedMilestones.length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground">
                            <Trophy className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                            <p className="text-sm">No milestones achieved yet</p>
                            <p className="text-xs text-muted-foreground/70 mt-1">Keep working to unlock achievements!</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {achievedMilestones.map((milestone, index) => {
                              const milestoneInfo = MILESTONES.find(
                                m => m.type === milestone.milestone_type && String(m.value) === milestone.milestone_value
                              );
                              return (
                                <div
                                  key={index}
                                  className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20"
                                >
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-lg">
                                    {milestoneInfo?.icon || '🏆'}
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{milestoneInfo?.label || 'Milestone'}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Achieved on {format(new Date(milestone.achieved_at), 'MMM d, yyyy')}
                                    </p>
                                  </div>
                                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {/* Upcoming milestones */}
                        {metrics && (
                          <div className="mt-4 pt-4 border-t border-border">
                            <p className="text-xs font-medium text-muted-foreground mb-3">Next Milestones</p>
                            <div className="space-y-2">
                              {MILESTONES
                                .filter(m => !achievedMilestones.some(
                                  am => am.milestone_type === m.type && am.milestone_value === String(m.value)
                                ))
                                .slice(0, 3)
                                .map((milestone, index) => {
                                  let current = 0;
                                  let target = milestone.value;
                                  switch (milestone.type) {
                                    case 'invoices': current = metrics.totalInvoices; break;
                                    case 'estimates': current = metrics.totalEstimates; break;
                                    case 'shipments': current = metrics.totalShipments; break;
                                    case 'revenue': current = metrics.totalRevenue; break;
                                  }
                                  const progress = Math.min((current / target) * 100, 100);
                                  
                                  return (
                                    <div key={index} className="space-y-1">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="flex items-center gap-1.5">
                                          <span>{milestone.icon}</span>
                                          <span className="text-muted-foreground">{milestone.label}</span>
                                        </span>
                                        <span className="font-medium">
                                          {milestone.type === 'revenue' 
                                            ? `${(current / 1000000).toFixed(1)}M / ${(target / 1000000).toFixed(0)}M`
                                            : `${current} / ${target}`
                                          }
                                        </span>
                                      </div>
                                      <Progress value={progress} className="h-1.5" />
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="activity" className="mt-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {metrics.recentActivity.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
                        ) : (
                          <div className="space-y-3">
                            {metrics.recentActivity.map((activity) => (
                              <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                                  {getActivityIcon(activity.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{activity.description}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(activity.date, 'MMM d, yyyy')}
                                  </p>
                                </div>
                                {activity.status && getStatusIcon(activity.status)}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>

                {/* Expenses Summary */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Expenses Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold">{metrics.totalExpenses}</p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-emerald-600">{metrics.approvedExpenses}</p>
                        <p className="text-xs text-muted-foreground">Approved</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-amber-600">{metrics.pendingExpenses}</p>
                        <p className="text-xs text-muted-foreground">Pending</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <User className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p>Employee not found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
