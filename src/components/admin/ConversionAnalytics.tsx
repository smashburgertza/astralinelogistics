import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useConversionAnalytics } from '@/hooks/useConversionAnalytics';
import { TrendingUp, Eye, UserPlus, Percent } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { format, parseISO } from 'date-fns';

const SOURCE_LABELS: Record<string, string> = {
  shipping_calculator: 'Shipping Calculator',
  shop_for_me: 'Shop For Me',
};

const chartConfig = {
  views: {
    label: 'Views',
    color: 'hsl(var(--chart-1))',
  },
  signups: {
    label: 'Signups',
    color: 'hsl(var(--chart-2))',
  },
};

export function ConversionAnalytics() {
  const { data, isLoading } = useConversionAnalytics(30);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Conversion Tracking
          </CardTitle>
          <CardDescription>Teaser view to signup conversion rates (last 30 days)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const { stats, dailyStats, totals } = data || { stats: [], dailyStats: [], totals: { views: 0, signups: 0, conversionRate: 0 } };

  // Format daily stats for the chart
  const chartData = dailyStats.map((day) => ({
    date: day.date,
    views: day.views,
    signups: day.signups,
    formattedDate: format(parseISO(day.date), 'MMM d'),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Conversion Tracking
        </CardTitle>
        <CardDescription>Teaser view to signup conversion rates (last 30 days)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Stats */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <div className="bg-muted/50 rounded-lg p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Eye className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Views</p>
              <p className="text-2xl font-bold">{totals.views.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <UserPlus className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Signups</p>
              <p className="text-2xl font-bold">{totals.signups.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Percent className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
              <p className="text-2xl font-bold">{totals.conversionRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* Daily Trend Chart */}
        {chartData.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Daily Trends</h4>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="fillSignups" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="formattedDate"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs"
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
                <ChartTooltip
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="hsl(var(--chart-1))"
                  fill="url(#fillViews)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="signups"
                  stroke="hsl(var(--chart-2))"
                  fill="url(#fillSignups)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </div>
        ) : null}

        {/* By Source */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">By Source</h4>
          <div className="space-y-2">
            {stats.map((stat) => (
              <div key={stat.source} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div>
                  <p className="font-medium">{SOURCE_LABELS[stat.source] || stat.source}</p>
                  <p className="text-sm text-muted-foreground">
                    {stat.totalViews} views → {stat.totalSignups} signups
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${stat.conversionRate > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {stat.conversionRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">conversion</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {totals.views === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No conversion data yet. Views and signups from the teaser gate will appear here.
          </p>
        )}
      </CardContent>
    </Card>
  );
}