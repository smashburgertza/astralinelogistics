import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ConversionStats {
  source: string;
  totalViews: number;
  totalFormStarts: number;
  totalSignups: number;
  conversionRate: number;
  formAbandonmentRate: number;
}

interface DailyStats {
  date: string;
  views: number;
  formStarts: number;
  signups: number;
}

export function useConversionAnalytics(days: number = 30) {
  return useQuery({
    queryKey: ['conversion-analytics', days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('teaser_conversion_events')
        .select('event_type, source, created_at')
        .gte('created_at', startDate.toISOString());
      
      if (error) throw error;
      
      // Calculate stats by source
      const bySource: Record<string, { views: number; formStarts: number; signups: number }> = {
        shipping_calculator: { views: 0, formStarts: 0, signups: 0 },
        shop_for_me: { views: 0, formStarts: 0, signups: 0 },
      };
      
      // Calculate daily stats
      const dailyMap: Record<string, { views: number; formStarts: number; signups: number }> = {};
      
      data?.forEach((event) => {
        const source = event.source as keyof typeof bySource;
        const eventType = event.event_type;
        
        if (bySource[source]) {
          if (eventType === 'view') {
            bySource[source].views++;
          } else if (eventType === 'form_started') {
            bySource[source].formStarts++;
          } else if (eventType === 'signup') {
            bySource[source].signups++;
          }
        }
        
        // Daily aggregation
        const dateKey = new Date(event.created_at).toISOString().split('T')[0];
        if (!dailyMap[dateKey]) {
          dailyMap[dateKey] = { views: 0, formStarts: 0, signups: 0 };
        }
        if (eventType === 'view') {
          dailyMap[dateKey].views++;
        } else if (eventType === 'form_started') {
          dailyMap[dateKey].formStarts++;
        } else if (eventType === 'signup') {
          dailyMap[dateKey].signups++;
        }
      });
      
      const stats: ConversionStats[] = Object.entries(bySource).map(([source, counts]) => ({
        source,
        totalViews: counts.views,
        totalFormStarts: counts.formStarts,
        totalSignups: counts.signups,
        conversionRate: counts.views > 0 ? (counts.signups / counts.views) * 100 : 0,
        formAbandonmentRate: counts.formStarts > 0 ? ((counts.formStarts - counts.signups) / counts.formStarts) * 100 : 0,
      }));
      
      const dailyStats: DailyStats[] = Object.entries(dailyMap)
        .map(([date, counts]) => ({
          date,
          views: counts.views,
          formStarts: counts.formStarts,
          signups: counts.signups,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      const totals = {
        views: stats.reduce((sum, s) => sum + s.totalViews, 0),
        formStarts: stats.reduce((sum, s) => sum + s.totalFormStarts, 0),
        signups: stats.reduce((sum, s) => sum + s.totalSignups, 0),
        conversionRate: 0,
        formAbandonmentRate: 0,
      };
      totals.conversionRate = totals.views > 0 ? (totals.signups / totals.views) * 100 : 0;
      totals.formAbandonmentRate = totals.formStarts > 0 ? ((totals.formStarts - totals.signups) / totals.formStarts) * 100 : 0;
      
      return { stats, dailyStats, totals };
    },
  });
}
