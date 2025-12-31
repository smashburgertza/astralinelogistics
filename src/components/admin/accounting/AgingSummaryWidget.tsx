import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, ChevronRight } from 'lucide-react';
import { useAgingSummary, AgingReport } from '@/hooks/useAgingReports';
import { Skeleton } from '@/components/ui/skeleton';

interface AgingSummaryWidgetProps {
  onViewDetails?: () => void;
}

export function AgingSummaryWidget({ onViewDetails }: AgingSummaryWidgetProps) {
  const { ar: arAging, ap: apAging, isLoading } = useAgingSummary();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getSummaryFromReport = (report?: AgingReport) => {
    if (!report) {
      return { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total: 0 };
    }
    return {
      current: report.current.total,
      '1-30': 0, // current bucket is 0-30
      '31-60': report.days30.total,
      '61-90': report.days60.total,
      '90+': report.days90Plus.total,
      total: report.totalOutstanding,
    };
  };

  const arSummary = getSummaryFromReport(arAging);
  const apSummary = getSummaryFromReport(apAging);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">AR/AP Aging Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const getOverdueColor = (amount: number, total: number) => {
    if (amount === 0 || total === 0) return 'text-muted-foreground';
    const percentage = (amount / total) * 100;
    if (percentage > 30) return 'text-red-600';
    if (percentage > 15) return 'text-amber-600';
    return 'text-green-600';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            AR/AP Aging Summary
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Accounts Receivable */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-700">Receivables</span>
              <span className="font-semibold">{formatCurrency(arSummary.total)}</span>
            </div>
            <div className="grid grid-cols-4 gap-1 text-xs">
              <div className="text-center p-2 bg-green-50 rounded">
                <div className="font-medium">0-30</div>
                <div className="text-green-700">{formatCurrency(arSummary.current)}</div>
              </div>
              <div className="text-center p-2 bg-amber-50 rounded">
                <div className="font-medium">31-60</div>
                <div className={getOverdueColor(arSummary['31-60'], arSummary.total)}>
                  {formatCurrency(arSummary['31-60'])}
                </div>
              </div>
              <div className="text-center p-2 bg-orange-50 rounded">
                <div className="font-medium">61-90</div>
                <div className={getOverdueColor(arSummary['61-90'], arSummary.total)}>
                  {formatCurrency(arSummary['61-90'])}
                </div>
              </div>
              <div className="text-center p-2 bg-red-100 rounded">
                <div className="font-medium">90+</div>
                <div className={getOverdueColor(arSummary['90+'], arSummary.total)}>
                  {formatCurrency(arSummary['90+'])}
                </div>
              </div>
            </div>
          </div>

          {/* Accounts Payable */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-red-700">Payables</span>
              <span className="font-semibold">{formatCurrency(apSummary.total)}</span>
            </div>
            <div className="grid grid-cols-4 gap-1 text-xs">
              <div className="text-center p-2 bg-green-50 rounded">
                <div className="font-medium">0-30</div>
                <div className="text-green-700">{formatCurrency(apSummary.current)}</div>
              </div>
              <div className="text-center p-2 bg-amber-50 rounded">
                <div className="font-medium">31-60</div>
                <div className={getOverdueColor(apSummary['31-60'], apSummary.total)}>
                  {formatCurrency(apSummary['31-60'])}
                </div>
              </div>
              <div className="text-center p-2 bg-orange-50 rounded">
                <div className="font-medium">61-90</div>
                <div className={getOverdueColor(apSummary['61-90'], apSummary.total)}>
                  {formatCurrency(apSummary['61-90'])}
                </div>
              </div>
              <div className="text-center p-2 bg-red-100 rounded">
                <div className="font-medium">90+</div>
                <div className={getOverdueColor(apSummary['90+'], apSummary.total)}>
                  {formatCurrency(apSummary['90+'])}
                </div>
              </div>
            </div>
          </div>

          {onViewDetails && (
            <Button variant="ghost" size="sm" className="w-full" onClick={onViewDetails}>
              View detailed aging reports
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
