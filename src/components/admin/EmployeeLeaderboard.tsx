import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { 
  Trophy, Medal, Award, Crown,
  FileText, DollarSign, Package, TrendingUp, Sparkles
} from 'lucide-react';
import { startOfWeek, startOfMonth, startOfQuarter, startOfYear, format } from 'date-fns';
import { useAwardBadges, useAllEmployeeBadges } from '@/hooks/useEmployeeBadges';
import { EmployeeBadgesDisplay } from './EmployeeBadgesDisplay';

type MetricType = 'revenue' | 'invoices' | 'estimates' | 'shipments';
type TimePeriod = 'week' | 'month' | 'quarter' | 'year' | 'all';

interface LeaderboardEntry {
  userId: string;
  fullName: string;
  email: string;
  employeeRole: string | null;
  value: number;
  rank: number;
}

const METRIC_CONFIG = {
  revenue: { label: 'Revenue Generated', icon: DollarSign, color: 'from-emerald-400 to-green-500', prefix: 'TZS ' },
  invoices: { label: 'Invoices Issued', icon: FileText, color: 'from-blue-400 to-indigo-500', prefix: '' },
  estimates: { label: 'Estimates Created', icon: TrendingUp, color: 'from-purple-400 to-violet-500', prefix: '' },
  shipments: { label: 'Shipments Handled', icon: Package, color: 'from-orange-400 to-amber-500', prefix: '' },
};

const TIME_PERIOD_CONFIG = {
  week: { label: 'This Week', getStart: () => startOfWeek(new Date(), { weekStartsOn: 1 }) },
  month: { label: 'This Month', getStart: () => startOfMonth(new Date()) },
  quarter: { label: 'This Quarter', getStart: () => startOfQuarter(new Date()) },
  year: { label: 'This Year', getStart: () => startOfYear(new Date()) },
  all: { label: 'All Time', getStart: () => null },
};

export function EmployeeLeaderboard() {
  const [metric, setMetric] = useState<MetricType>('revenue');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  const awardBadges = useAwardBadges();
  const { badges: allBadges } = useAllEmployeeBadges();

  useEffect(() => {
    fetchLeaderboard();
  }, [metric, timePeriod]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      // Fetch employees
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, employee_role')
        .in('role', ['employee', 'super_admin']);

      if (rolesError) throw rolesError;

      const userIds = userRoles?.map(r => r.user_id) || [];
      
      if (userIds.length === 0) {
        setLeaderboard([]);
        setLoading(false);
        return;
      }

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      const startDate = TIME_PERIOD_CONFIG[timePeriod].getStart();
      const startDateStr = startDate ? format(startDate, 'yyyy-MM-dd') : null;

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const roleMap = new Map(userRoles?.map(r => [r.user_id, r.employee_role]) || []);

      let entries: LeaderboardEntry[] = [];

      if (metric === 'revenue') {
        let query = supabase
          .from('invoices')
          .select('created_by, amount_in_tzs, amount, status')
          .in('created_by', userIds)
          .eq('status', 'paid');

        if (startDateStr) {
          query = query.gte('paid_at', startDateStr);
        }

        const { data: invoices } = await query;

        const revenueByUser = new Map<string, number>();
        invoices?.forEach(inv => {
          const current = revenueByUser.get(inv.created_by!) || 0;
          revenueByUser.set(inv.created_by!, current + Number(inv.amount_in_tzs || inv.amount));
        });

        entries = userIds.map(userId => ({
          userId,
          fullName: profileMap.get(userId)?.full_name || 'Unknown',
          email: profileMap.get(userId)?.email || '',
          employeeRole: roleMap.get(userId) || null,
          value: revenueByUser.get(userId) || 0,
          rank: 0,
        }));
      } else if (metric === 'invoices') {
        let query = supabase
          .from('invoices')
          .select('created_by, created_at')
          .in('created_by', userIds);

        if (startDateStr) {
          query = query.gte('created_at', startDateStr);
        }

        const { data: invoices } = await query;

        const countByUser = new Map<string, number>();
        invoices?.forEach(inv => {
          const current = countByUser.get(inv.created_by!) || 0;
          countByUser.set(inv.created_by!, current + 1);
        });

        entries = userIds.map(userId => ({
          userId,
          fullName: profileMap.get(userId)?.full_name || 'Unknown',
          email: profileMap.get(userId)?.email || '',
          employeeRole: roleMap.get(userId) || null,
          value: countByUser.get(userId) || 0,
          rank: 0,
        }));
      } else if (metric === 'estimates') {
        let query = supabase
          .from('estimates')
          .select('created_by, created_at')
          .in('created_by', userIds);

        if (startDateStr) {
          query = query.gte('created_at', startDateStr);
        }

        const { data: estimates } = await query;

        const countByUser = new Map<string, number>();
        estimates?.forEach(est => {
          const current = countByUser.get(est.created_by!) || 0;
          countByUser.set(est.created_by!, current + 1);
        });

        entries = userIds.map(userId => ({
          userId,
          fullName: profileMap.get(userId)?.full_name || 'Unknown',
          email: profileMap.get(userId)?.email || '',
          employeeRole: roleMap.get(userId) || null,
          value: countByUser.get(userId) || 0,
          rank: 0,
        }));
      } else if (metric === 'shipments') {
        let query = supabase
          .from('shipments')
          .select('created_by, created_at')
          .in('created_by', userIds);

        if (startDateStr) {
          query = query.gte('created_at', startDateStr);
        }

        const { data: shipments } = await query;

        const countByUser = new Map<string, number>();
        shipments?.forEach(ship => {
          const current = countByUser.get(ship.created_by!) || 0;
          countByUser.set(ship.created_by!, current + 1);
        });

        entries = userIds.map(userId => ({
          userId,
          fullName: profileMap.get(userId)?.full_name || 'Unknown',
          email: profileMap.get(userId)?.email || '',
          employeeRole: roleMap.get(userId) || null,
          value: countByUser.get(userId) || 0,
          rank: 0,
        }));
      }

      // Sort and assign ranks
      entries.sort((a, b) => b.value - a.value);
      entries.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      setLeaderboard(entries);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-5 h-5 text-amber-500" />;
      case 2: return <Medal className="w-5 h-5 text-slate-400" />;
      case 3: return <Medal className="w-5 h-5 text-amber-700" />;
      default: return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankBadgeStyle = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white border-0';
      case 2: return 'bg-gradient-to-r from-slate-300 to-slate-400 text-slate-800 border-0';
      case 3: return 'bg-gradient-to-r from-amber-600 to-orange-700 text-white border-0';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const MetricIcon = METRIC_CONFIG[metric].icon;

  return (
    <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${METRIC_CONFIG[metric].color} flex items-center justify-center`}>
                <Trophy className="w-4 h-4 text-white" />
              </div>
              Leaderboard
            </CardTitle>
            <CardDescription className="mt-1">Top performers by {METRIC_CONFIG[metric].label.toLowerCase()}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => awardBadges.mutate()}
                    disabled={awardBadges.isPending}
                    className="h-9"
                  >
                    <Sparkles className="w-4 h-4 mr-1" />
                    {awardBadges.isPending ? 'Awarding...' : 'Award Badges'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Award badges to top 3 performers for each metric and time period
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIME_PERIOD_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={metric} onValueChange={(v) => setMetric(v as MetricType)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="revenue" className="text-xs sm:text-sm">
              <DollarSign className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
              Revenue
            </TabsTrigger>
            <TabsTrigger value="invoices" className="text-xs sm:text-sm">
              <FileText className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
              Invoices
            </TabsTrigger>
            <TabsTrigger value="estimates" className="text-xs sm:text-sm">
              <TrendingUp className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
              Estimates
            </TabsTrigger>
            <TabsTrigger value="shipments" className="text-xs sm:text-sm">
              <Package className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
              Shipments
            </TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm">No data for this period</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Top 3 Podium */}
              {leaderboard.length >= 3 && (
                <div className="grid grid-cols-3 gap-2 mb-4 pt-6">
                  {/* 2nd Place */}
                  <div className="flex flex-col items-center pt-4">
                    <Avatar className="h-12 w-12 border-2 border-slate-300 shadow-md mb-2">
                      <AvatarFallback className="bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700 font-medium">
                        {getInitials(leaderboard[1]?.fullName || '')}
                      </AvatarFallback>
                    </Avatar>
                    <Medal className="w-6 h-6 text-slate-400 -mt-4 mb-1" />
                    <p className="text-xs font-medium text-center truncate max-w-full px-1">
                      {leaderboard[1]?.fullName.split(' ')[0]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {METRIC_CONFIG[metric].prefix}{leaderboard[1]?.value.toLocaleString()}
                    </p>
                  </div>
                  {/* 1st Place */}
                  <div className="flex flex-col items-center">
                    <Avatar className="h-14 w-14 border-2 border-amber-400 shadow-lg mb-2 ring-2 ring-amber-200 ring-offset-2">
                      <AvatarFallback className="bg-gradient-to-br from-amber-300 to-yellow-400 text-amber-800 font-semibold">
                        {getInitials(leaderboard[0]?.fullName || '')}
                      </AvatarFallback>
                    </Avatar>
                    <Crown className="w-7 h-7 text-amber-500 -mt-4 mb-1" />
                    <p className="text-sm font-semibold text-center truncate max-w-full px-1">
                      {leaderboard[0]?.fullName.split(' ')[0]}
                    </p>
                    <p className="text-xs font-medium text-emerald-600">
                      {METRIC_CONFIG[metric].prefix}{leaderboard[0]?.value.toLocaleString()}
                    </p>
                  </div>
                  {/* 3rd Place */}
                  <div className="flex flex-col items-center pt-6">
                    <Avatar className="h-11 w-11 border-2 border-amber-600 shadow-md mb-2">
                      <AvatarFallback className="bg-gradient-to-br from-amber-600 to-orange-700 text-white font-medium">
                        {getInitials(leaderboard[2]?.fullName || '')}
                      </AvatarFallback>
                    </Avatar>
                    <Medal className="w-5 h-5 text-amber-700 -mt-3 mb-1" />
                    <p className="text-xs font-medium text-center truncate max-w-full px-1">
                      {leaderboard[2]?.fullName.split(' ')[0]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {METRIC_CONFIG[metric].prefix}{leaderboard[2]?.value.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {/* Full List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {leaderboard.map((entry) => {
                  const employeeBadges = allBadges.filter(b => b.employeeId === entry.userId);
                  return (
                    <div
                      key={entry.userId}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        entry.rank <= 3 ? 'bg-muted/50' : 'bg-muted/20 hover:bg-muted/40'
                      }`}
                    >
                      <div className="w-8 flex justify-center">
                        {getRankIcon(entry.rank)}
                      </div>
                      <Avatar className="h-9 w-9 border border-border">
                        <AvatarFallback className="bg-accent/50 text-accent-foreground font-medium text-sm">
                          {getInitials(entry.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{entry.fullName}</p>
                          {employeeBadges.length > 0 && (
                            <EmployeeBadgesDisplay badges={employeeBadges} compact maxDisplay={3} />
                          )}
                        </div>
                        {entry.employeeRole && (
                          <p className="text-xs text-muted-foreground capitalize">
                            {entry.employeeRole.replace('_', ' ')}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${entry.rank === 1 ? 'text-emerald-600' : ''}`}>
                          {METRIC_CONFIG[metric].prefix}{entry.value.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
