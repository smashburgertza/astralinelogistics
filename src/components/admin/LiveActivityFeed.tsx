import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { 
  Activity, Package, FileText, DollarSign, 
  UserPlus, CheckCircle, Truck, Clock,
  AlertCircle, RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'shipment' | 'invoice' | 'estimate' | 'customer' | 'expense' | 'payment';
  action: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export function LiveActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchRecentActivity();

    // Set up real-time subscriptions
    const shipmentsChannel = supabase
      .channel('shipments-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shipments' },
        (payload) => {
          const newActivity = createActivityFromShipment(payload);
          if (newActivity) {
            setActivities(prev => [newActivity, ...prev].slice(0, 20));
          }
        }
      )
      .subscribe();

    const invoicesChannel = supabase
      .channel('invoices-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices' },
        (payload) => {
          const newActivity = createActivityFromInvoice(payload);
          if (newActivity) {
            setActivities(prev => [newActivity, ...prev].slice(0, 20));
          }
        }
      )
      .subscribe();

    const customersChannel = supabase
      .channel('customers-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'customers' },
        (payload) => {
          const newActivity = createActivityFromCustomer(payload);
          if (newActivity) {
            setActivities(prev => [newActivity, ...prev].slice(0, 20));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(shipmentsChannel);
      supabase.removeChannel(invoicesChannel);
      supabase.removeChannel(customersChannel);
    };
  }, []);

  const createActivityFromShipment = (payload: any): ActivityItem | null => {
    const { eventType, new: newData, old: oldData } = payload;
    const data = newData || oldData;
    if (!data) return null;

    let action = '';
    let description = '';

    if (eventType === 'INSERT') {
      action = 'created';
      description = `New shipment ${data.tracking_number} created`;
    } else if (eventType === 'UPDATE' && newData?.status !== oldData?.status) {
      action = 'status_changed';
      description = `Shipment ${data.tracking_number} → ${newData.status}`;
    } else {
      return null;
    }

    return {
      id: `shipment-${data.id}-${Date.now()}`,
      type: 'shipment',
      action,
      description,
      timestamp: new Date(),
      metadata: { tracking_number: data.tracking_number, status: data.status }
    };
  };

  const createActivityFromInvoice = (payload: any): ActivityItem | null => {
    const { eventType, new: newData, old: oldData } = payload;
    const data = newData || oldData;
    if (!data) return null;

    let action = '';
    let description = '';

    if (eventType === 'INSERT') {
      action = 'created';
      description = `Invoice ${data.invoice_number} created`;
    } else if (eventType === 'UPDATE' && newData?.status === 'paid' && oldData?.status !== 'paid') {
      action = 'paid';
      description = `Invoice ${data.invoice_number} marked as paid`;
    } else {
      return null;
    }

    return {
      id: `invoice-${data.id}-${Date.now()}`,
      type: 'invoice',
      action,
      description,
      timestamp: new Date(),
      metadata: { invoice_number: data.invoice_number, amount: data.amount }
    };
  };

  const createActivityFromCustomer = (payload: any): ActivityItem | null => {
    const data = payload.new;
    if (!data) return null;

    return {
      id: `customer-${data.id}-${Date.now()}`,
      type: 'customer',
      action: 'created',
      description: `New customer: ${data.name}`,
      timestamp: new Date(),
      metadata: { name: data.name, email: data.email }
    };
  };

  const fetchRecentActivity = async () => {
    try {
      const activities: ActivityItem[] = [];
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Fetch recent shipments
      const { data: shipments } = await supabase
        .from('shipments')
        .select('id, tracking_number, status, created_at, updated_at')
        .gte('created_at', last24Hours.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      shipments?.forEach(s => {
        activities.push({
          id: `shipment-${s.id}`,
          type: 'shipment',
          action: 'created',
          description: `Shipment ${s.tracking_number} created`,
          timestamp: new Date(s.created_at || ''),
          metadata: { tracking_number: s.tracking_number, status: s.status }
        });
      });

      // Fetch recent invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, status, amount, created_at, paid_at')
        .gte('created_at', last24Hours.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      invoices?.forEach(i => {
        activities.push({
          id: `invoice-${i.id}`,
          type: 'invoice',
          action: i.status === 'paid' ? 'paid' : 'created',
          description: i.status === 'paid' 
            ? `Invoice ${i.invoice_number} paid` 
            : `Invoice ${i.invoice_number} created`,
          timestamp: new Date(i.paid_at || i.created_at || ''),
          metadata: { invoice_number: i.invoice_number, amount: i.amount }
        });
      });

      // Fetch recent customers
      const { data: customers } = await supabase
        .from('customers')
        .select('id, name, email, created_at')
        .gte('created_at', last24Hours.toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

      customers?.forEach(c => {
        activities.push({
          id: `customer-${c.id}`,
          type: 'customer',
          action: 'created',
          description: `New customer: ${c.name}`,
          timestamp: new Date(c.created_at || ''),
          metadata: { name: c.name, email: c.email }
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
      case 'payment':
        return CheckCircle;
      default:
        return Activity;
    }
  };

  const getActivityColor = (type: string, action: string) => {
    if (action === 'paid') return 'bg-emerald-500/10 text-emerald-600';
    switch (type) {
      case 'shipment':
        return 'bg-blue-500/10 text-blue-600';
      case 'invoice':
        return 'bg-violet-500/10 text-violet-600';
      case 'customer':
        return 'bg-amber-500/10 text-amber-600';
      case 'expense':
        return 'bg-orange-500/10 text-orange-600';
      default:
        return 'bg-muted text-muted-foreground';
    }
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
              <div key={i} className="h-12 bg-muted/50 rounded-lg" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm">No recent activity</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Activity from the last 24 hours will appear here</p>
          </div>
        ) : (
          <ScrollArea className="h-[320px] pr-4">
            <div className="space-y-3">
              {activities.map((activity) => {
                const Icon = getActivityIcon(activity.type, activity.action);
                const colorClass = getActivityColor(activity.type, activity.action);

                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize shrink-0">
                      {activity.type}
                    </Badge>
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
