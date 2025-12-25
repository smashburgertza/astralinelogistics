import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { 
  Activity, Package, FileText, DollarSign, 
  UserPlus, CheckCircle, Truck, Clock,
  RefreshCw, ExternalLink, User, MapPin
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { REGIONS, type Region } from '@/lib/constants';

interface ActivityItem {
  id: string;
  recordId: string;
  type: 'shipment' | 'invoice' | 'estimate' | 'customer' | 'expense';
  action: string;
  title: string;
  description: string;
  timestamp: Date;
  amount?: number;
  currency?: string;
  employeeName?: string;
  customerName?: string;
  status?: string;
  region?: string;
  link?: string;
}

export function LiveActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecentActivity();

    // Set up real-time subscriptions
    const shipmentsChannel = supabase
      .channel('shipments-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shipments' },
        () => fetchRecentActivity()
      )
      .subscribe();

    const invoicesChannel = supabase
      .channel('invoices-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices' },
        () => fetchRecentActivity()
      )
      .subscribe();

    const customersChannel = supabase
      .channel('customers-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'customers' },
        () => fetchRecentActivity()
      )
      .subscribe();

    const estimatesChannel = supabase
      .channel('estimates-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'estimates' },
        () => fetchRecentActivity()
      )
      .subscribe();

    const expensesChannel = supabase
      .channel('expenses-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        () => fetchRecentActivity()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(shipmentsChannel);
      supabase.removeChannel(invoicesChannel);
      supabase.removeChannel(customersChannel);
      supabase.removeChannel(estimatesChannel);
      supabase.removeChannel(expensesChannel);
    };
  }, []);

  const fetchRecentActivity = async () => {
    try {
      const activities: ActivityItem[] = [];
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Fetch employee profiles for lookup
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name');
      
      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      // Fetch recent shipments with customer info
      const { data: shipments } = await supabase
        .from('shipments')
        .select(`
          id, tracking_number, status, created_at, updated_at, 
          origin_region, total_weight_kg, created_by,
          customers(name)
        `)
        .gte('created_at', last24Hours.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      shipments?.forEach(s => {
        const customerName = (s.customers as any)?.name;
        const employeeName = profileMap.get(s.created_by || '') || undefined;
        const region = REGIONS[s.origin_region as Region];
        
        activities.push({
          id: `shipment-${s.id}`,
          recordId: s.id,
          type: 'shipment',
          action: 'created',
          title: `Shipment ${s.tracking_number}`,
          description: customerName ? `For ${customerName}` : `${s.total_weight_kg}kg shipment`,
          timestamp: new Date(s.created_at || ''),
          status: s.status || undefined,
          employeeName,
          customerName,
          region: region ? `${region.flag} ${region.label}` : undefined,
          link: '/admin/shipments',
        });
      });

      // Fetch recent invoices with customer info
      const { data: invoices } = await supabase
        .from('invoices')
        .select(`
          id, invoice_number, status, amount, amount_in_tzs, currency,
          created_at, paid_at, created_by,
          customers(name)
        `)
        .gte('created_at', last24Hours.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      invoices?.forEach(i => {
        const customerName = (i.customers as any)?.name;
        const employeeName = profileMap.get(i.created_by || '') || undefined;
        const isPaid = i.status === 'paid';
        
        activities.push({
          id: `invoice-${i.id}`,
          recordId: i.id,
          type: 'invoice',
          action: isPaid ? 'paid' : 'created',
          title: `Invoice ${i.invoice_number}`,
          description: isPaid ? 'Payment received' : (customerName ? `For ${customerName}` : 'New invoice'),
          timestamp: new Date(isPaid ? (i.paid_at || i.created_at || '') : (i.created_at || '')),
          amount: Number(i.amount_in_tzs || i.amount),
          currency: i.amount_in_tzs ? 'TZS' : (i.currency || 'USD'),
          status: i.status || undefined,
          employeeName,
          customerName,
          link: '/admin/invoices',
        });
      });

      // Fetch recent estimates with customer info
      const { data: estimates } = await supabase
        .from('estimates')
        .select(`
          id, estimate_number, status, total, currency,
          created_at, created_by, origin_region,
          customers(name)
        `)
        .gte('created_at', last24Hours.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      estimates?.forEach(e => {
        const customerName = (e.customers as any)?.name;
        const employeeName = profileMap.get(e.created_by || '') || undefined;
        const region = REGIONS[e.origin_region as Region];
        
        activities.push({
          id: `estimate-${e.id}`,
          recordId: e.id,
          type: 'estimate',
          action: e.status === 'converted' ? 'converted' : 'created',
          title: `Estimate ${e.estimate_number}`,
          description: customerName ? `For ${customerName}` : 'New estimate',
          timestamp: new Date(e.created_at || ''),
          amount: Number(e.total),
          currency: e.currency || 'USD',
          status: e.status || undefined,
          employeeName,
          customerName,
          region: region ? `${region.flag} ${region.label}` : undefined,
          link: '/admin/estimates',
        });
      });

      // Fetch recent customers
      const { data: customers } = await supabase
        .from('customers')
        .select('id, name, email, phone, company_name, created_at')
        .gte('created_at', last24Hours.toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

      customers?.forEach(c => {
        activities.push({
          id: `customer-${c.id}`,
          recordId: c.id,
          type: 'customer',
          action: 'created',
          title: `New Customer: ${c.name}`,
          description: c.company_name || c.email || c.phone || 'Customer registered',
          timestamp: new Date(c.created_at || ''),
          customerName: c.name,
          link: '/admin/customers',
        });
      });

      // Fetch recent expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('id, category, amount, currency, status, description, created_at, submitted_by, created_by')
        .gte('created_at', last24Hours.toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

      expenses?.forEach(e => {
        const employeeName = profileMap.get(e.submitted_by || e.created_by || '') || undefined;
        
        activities.push({
          id: `expense-${e.id}`,
          recordId: e.id,
          type: 'expense',
          action: e.status === 'approved' ? 'approved' : (e.status === 'denied' ? 'denied' : 'submitted'),
          title: `Expense: ${e.category}`,
          description: e.description || 'Expense submitted',
          timestamp: new Date(e.created_at || ''),
          amount: Number(e.amount),
          currency: e.currency || 'USD',
          status: e.status,
          employeeName,
          link: '/admin/expenses',
        });
      });

      // Sort by timestamp
      activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setActivities(activities.slice(0, 20));
    } catch (error) {
      console.error('Error fetching activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRecentActivity();
    setRefreshing(false);
  };

  const handleActivityClick = (activity: ActivityItem) => {
    if (activity.link) {
      navigate(activity.link);
    }
  };

  const getActivityIcon = (type: string, action: string) => {
    switch (type) {
      case 'shipment':
        return action === 'status_changed' ? Truck : Package;
      case 'invoice':
        return action === 'paid' ? CheckCircle : FileText;
      case 'estimate':
        return FileText;
      case 'customer':
        return UserPlus;
      case 'expense':
        return DollarSign;
      default:
        return Activity;
    }
  };

  const getActivityColor = (type: string, action: string) => {
    if (action === 'paid' || action === 'approved') return 'bg-emerald-500/10 text-emerald-600';
    if (action === 'denied') return 'bg-red-500/10 text-red-600';
    if (action === 'converted') return 'bg-violet-500/10 text-violet-600';
    switch (type) {
      case 'shipment':
        return 'bg-blue-500/10 text-blue-600';
      case 'invoice':
        return 'bg-violet-500/10 text-violet-600';
      case 'estimate':
        return 'bg-purple-500/10 text-purple-600';
      case 'customer':
        return 'bg-amber-500/10 text-amber-600';
      case 'expense':
        return 'bg-orange-500/10 text-orange-600';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusBadgeColor = (status?: string) => {
    switch (status) {
      case 'paid':
      case 'approved':
      case 'delivered':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'pending':
      case 'collected':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'in_transit':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'denied':
      case 'rejected':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'converted':
        return 'bg-violet-500/10 text-violet-600 border-violet-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatAmount = (amount?: number, currency?: string) => {
    if (!amount) return null;
    if (currency === 'TZS') {
      return `TZS ${amount.toLocaleString()}`;
    }
    return `${currency || 'USD'} ${amount.toLocaleString()}`;
  };

  return (
    <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
              Live Activity
            </CardTitle>
            <CardDescription className="mt-1">Real-time system updates</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-emerald-600">Live</span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
            >
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-muted/50 rounded-lg" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm">No recent activity</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Activity from the last 24 hours will appear here</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {activities.map((activity) => {
                const Icon = getActivityIcon(activity.type, activity.action);
                const colorClass = getActivityColor(activity.type, activity.action);
                const amountDisplay = formatAmount(activity.amount, activity.currency);

                return (
                  <div
                    key={activity.id}
                    onClick={() => handleActivityClick(activity)}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all cursor-pointer group border border-transparent hover:border-border/50"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold truncate">{activity.title}</p>
                        {activity.status && (
                          <Badge variant="outline" className={`text-xs capitalize ${getStatusBadgeColor(activity.status)}`}>
                            {activity.status.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                      
                      {/* Additional details row */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                        {amountDisplay && (
                          <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {amountDisplay}
                          </span>
                        )}
                        {activity.employeeName && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {activity.employeeName}
                          </span>
                        )}
                        {activity.region && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {activity.region}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground/70">
                          {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
