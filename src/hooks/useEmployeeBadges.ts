import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { startOfWeek, startOfMonth, startOfQuarter, startOfYear, format } from 'date-fns';

export type BadgeTier = 'gold' | 'silver' | 'bronze';
export type MetricType = 'revenue' | 'invoices' | 'estimates' | 'shipments';
export type TimePeriod = 'week' | 'month' | 'quarter' | 'year';

export interface Badge {
  id: string;
  employeeId: string;
  badgeType: string;
  badgeTier: BadgeTier;
  metricType: MetricType;
  timePeriod: TimePeriod;
  achievedAt: string;
  rankAchieved: number;
  valueAchieved: number;
}

export interface BadgeDefinition {
  type: string;
  tier: BadgeTier;
  rank: number;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

export const BADGE_DEFINITIONS: Record<BadgeTier, BadgeDefinition> = {
  gold: {
    type: 'top_performer',
    tier: 'gold',
    rank: 1,
    label: 'Top Performer',
    icon: '👑',
    color: 'text-amber-600',
    bgColor: 'bg-gradient-to-br from-amber-300 to-yellow-500',
  },
  silver: {
    type: 'high_achiever',
    tier: 'silver',
    rank: 2,
    label: 'High Achiever',
    icon: '🥈',
    color: 'text-slate-500',
    bgColor: 'bg-gradient-to-br from-slate-300 to-slate-400',
  },
  bronze: {
    type: 'rising_star',
    tier: 'bronze',
    rank: 3,
    label: 'Rising Star',
    icon: '🥉',
    color: 'text-amber-700',
    bgColor: 'bg-gradient-to-br from-amber-600 to-orange-700',
  },
};

export const METRIC_LABELS: Record<MetricType, string> = {
  revenue: 'Revenue',
  invoices: 'Invoices',
  estimates: 'Estimates',
  shipments: 'Shipments',
};

export const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
  week: 'Weekly',
  month: 'Monthly',
  quarter: 'Quarterly',
  year: 'Yearly',
};

const TIME_PERIOD_CONFIG = {
  week: { getStart: () => startOfWeek(new Date(), { weekStartsOn: 1 }) },
  month: { getStart: () => startOfMonth(new Date()) },
  quarter: { getStart: () => startOfQuarter(new Date()) },
  year: { getStart: () => startOfYear(new Date()) },
};

export function useEmployeeBadges(employeeId?: string) {
  const { data: badges = [], isLoading } = useQuery({
    queryKey: ['employee-badges', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];

      const { data, error } = await supabase
        .from('employee_badges')
        .select('*')
        .eq('employee_id', employeeId)
        .order('achieved_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(b => ({
        id: b.id,
        employeeId: b.employee_id,
        badgeType: b.badge_type,
        badgeTier: b.badge_tier as BadgeTier,
        metricType: b.metric_type as MetricType,
        timePeriod: b.time_period as TimePeriod,
        achievedAt: b.achieved_at,
        rankAchieved: b.rank_achieved,
        valueAchieved: Number(b.value_achieved),
      }));
    },
    enabled: !!employeeId,
  });

  return { badges, isLoading };
}

export function useAllEmployeeBadges() {
  const { data: badges = [], isLoading } = useQuery({
    queryKey: ['all-employee-badges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_badges')
        .select('*')
        .order('achieved_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(b => ({
        id: b.id,
        employeeId: b.employee_id,
        badgeType: b.badge_type,
        badgeTier: b.badge_tier as BadgeTier,
        metricType: b.metric_type as MetricType,
        timePeriod: b.time_period as TimePeriod,
        achievedAt: b.achieved_at,
        rankAchieved: b.rank_achieved,
        valueAchieved: Number(b.value_achieved),
      }));
    },
  });

  return { badges, isLoading };
}

export function useAwardBadges() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Fetch employees
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['employee', 'super_admin']);

      if (rolesError) throw rolesError;

      const userIds = userRoles?.map(r => r.user_id) || [];
      if (userIds.length === 0) return { awarded: 0 };

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      let totalAwarded = 0;
      const metrics: MetricType[] = ['revenue', 'invoices', 'estimates', 'shipments'];
      const periods: TimePeriod[] = ['week', 'month', 'quarter', 'year'];

      for (const period of periods) {
        const startDate = TIME_PERIOD_CONFIG[period].getStart();
        const startDateStr = format(startDate, 'yyyy-MM-dd');
        const periodKey = format(startDate, 'yyyy-MM-dd');

        for (const metric of metrics) {
          // Calculate rankings for this metric and period
          const rankings = await calculateRankings(userIds, metric, startDateStr);

          // Award badges to top 3
          for (let i = 0; i < Math.min(3, rankings.length); i++) {
            const entry = rankings[i];
            if (entry.value === 0) continue;

            const tier: BadgeTier = i === 0 ? 'gold' : i === 1 ? 'silver' : 'bronze';
            const badgeType = `${period}_${metric}_${tier}`;

            // Check if badge already exists
            const { data: existing } = await supabase
              .from('employee_badges')
              .select('id')
              .eq('employee_id', entry.userId)
              .eq('badge_type', badgeType)
              .eq('time_period', periodKey)
              .maybeSingle();

            if (!existing) {
              const { error: insertError } = await supabase
                .from('employee_badges')
                .insert({
                  employee_id: entry.userId,
                  badge_type: badgeType,
                  badge_tier: tier,
                  metric_type: metric,
                  time_period: periodKey,
                  rank_achieved: i + 1,
                  value_achieved: entry.value,
                });

              if (!insertError) {
                // Create notification
                const def = BADGE_DEFINITIONS[tier];
                await supabase.from('notifications').insert({
                  user_id: entry.userId,
                  title: `${def.icon} New Badge Earned!`,
                  message: `You earned the ${def.label} badge for ${METRIC_LABELS[metric]} (${TIME_PERIOD_LABELS[period]})!`,
                  type: 'badge',
                });

                totalAwarded++;
              }
            }
          }
        }
      }

      return { awarded: totalAwarded };
    },
    onSuccess: (result) => {
      if (result.awarded > 0) {
        toast.success(`${result.awarded} new badge(s) awarded!`);
        queryClient.invalidateQueries({ queryKey: ['employee-badges'] });
        queryClient.invalidateQueries({ queryKey: ['all-employee-badges'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    },
    onError: (error: Error) => {
      console.error('Error awarding badges:', error);
      toast.error('Failed to award badges');
    },
  });
}

async function calculateRankings(
  userIds: string[],
  metric: MetricType,
  startDateStr: string
): Promise<Array<{ userId: string; value: number }>> {
  let entries: Array<{ userId: string; value: number }> = [];

  if (metric === 'revenue') {
    const { data: invoices } = await supabase
      .from('invoices')
      .select('created_by, amount_in_tzs, amount, status')
      .in('created_by', userIds)
      .eq('status', 'paid')
      .gte('paid_at', startDateStr);

    const revenueByUser = new Map<string, number>();
    invoices?.forEach(inv => {
      const current = revenueByUser.get(inv.created_by!) || 0;
      revenueByUser.set(inv.created_by!, current + Number(inv.amount_in_tzs || inv.amount));
    });

    entries = userIds.map(userId => ({
      userId,
      value: revenueByUser.get(userId) || 0,
    }));
  } else if (metric === 'invoices') {
    const { data: invoices } = await supabase
      .from('invoices')
      .select('created_by')
      .in('created_by', userIds)
      .gte('created_at', startDateStr);

    const countByUser = new Map<string, number>();
    invoices?.forEach(inv => {
      const current = countByUser.get(inv.created_by!) || 0;
      countByUser.set(inv.created_by!, current + 1);
    });

    entries = userIds.map(userId => ({
      userId,
      value: countByUser.get(userId) || 0,
    }));
  } else if (metric === 'estimates') {
    const { data: estimates } = await supabase
      .from('estimates')
      .select('created_by')
      .in('created_by', userIds)
      .gte('created_at', startDateStr);

    const countByUser = new Map<string, number>();
    estimates?.forEach(est => {
      const current = countByUser.get(est.created_by!) || 0;
      countByUser.set(est.created_by!, current + 1);
    });

    entries = userIds.map(userId => ({
      userId,
      value: countByUser.get(userId) || 0,
    }));
  } else if (metric === 'shipments') {
    const { data: shipments } = await supabase
      .from('shipments')
      .select('created_by')
      .in('created_by', userIds)
      .gte('created_at', startDateStr);

    const countByUser = new Map<string, number>();
    shipments?.forEach(ship => {
      const current = countByUser.get(ship.created_by!) || 0;
      countByUser.set(ship.created_by!, current + 1);
    });

    entries = userIds.map(userId => ({
      userId,
      value: countByUser.get(userId) || 0,
    }));
  }

  entries.sort((a, b) => b.value - a.value);
  return entries;
}

export function getBadgeDisplayInfo(badge: Badge) {
  const def = BADGE_DEFINITIONS[badge.badgeTier];
  return {
    ...def,
    metricLabel: METRIC_LABELS[badge.metricType],
    periodLabel: TIME_PERIOD_LABELS[badge.timePeriod],
    fullLabel: `${TIME_PERIOD_LABELS[badge.timePeriod]} ${METRIC_LABELS[badge.metricType]} ${def.label}`,
  };
}
