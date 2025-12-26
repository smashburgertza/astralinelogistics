import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useConversionAnalytics } from '@/hooks/useConversionAnalytics';
import { TrendingUp, Eye, UserPlus, Percent } from 'lucide-react';

const SOURCE_LABELS: Record<string, string> = {
  shipping_calculator: 'Shipping Calculator',
  shop_for_me: 'Shop For Me',
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
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const { stats, totals } = data || { stats: [], totals: { views: 0, signups: 0, conversionRate: 0 } };

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
