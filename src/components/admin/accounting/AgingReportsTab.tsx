import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpRight, ArrowDownRight, Users, Receipt, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useAccountsReceivableAging, useAccountsPayableAging, AgingBucket, AgingReport } from '@/hooks/useAgingReports';

export function AgingReportsTab() {
  const [activeTab, setActiveTab] = useState('ar');
  const { data: arAging, isLoading: arLoading } = useAccountsReceivableAging();
  const { data: apAging, isLoading: apLoading } = useAccountsPayableAging();

  const formatCurrency = (amount: number, currency: string = 'TZS') => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aging Reports</CardTitle>
        <CardDescription>
          Track outstanding receivables and payables by age
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="ar" className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4" />
              Accounts Receivable
            </TabsTrigger>
            <TabsTrigger value="ap" className="flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4" />
              Accounts Payable
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ar">
            {arLoading ? (
              <AgingReportSkeleton />
            ) : arAging ? (
              <AgingReportContent 
                report={arAging} 
                type="receivable"
                formatCurrency={formatCurrency}
              />
            ) : null}
          </TabsContent>

          <TabsContent value="ap">
            {apLoading ? (
              <AgingReportSkeleton />
            ) : apAging ? (
              <AgingReportContent 
                report={apAging} 
                type="payable"
                formatCurrency={formatCurrency}
              />
            ) : null}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function AgingReportContent({ 
  report, 
  type,
  formatCurrency 
}: { 
  report: AgingReport; 
  type: 'receivable' | 'payable';
  formatCurrency: (amount: number, currency?: string) => string;
}) {
  const [expandedBucket, setExpandedBucket] = useState<string | null>(null);
  
  const buckets = [report.current, report.days30, report.days60, report.days90Plus];
  const maxAmount = Math.max(...buckets.map(b => b.total), 1);

  const getBucketColor = (bucket: AgingBucket) => {
    if (bucket.min === 0) return 'bg-green-500';
    if (bucket.min === 31) return 'bg-yellow-500';
    if (bucket.min === 61) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getBucketBadgeVariant = (bucket: AgingBucket) => {
    if (bucket.min === 0) return 'default';
    if (bucket.min === 31) return 'secondary';
    if (bucket.min === 61) return 'outline';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Total Outstanding</div>
            <div className="text-2xl font-bold">{formatCurrency(report.totalOutstanding)}</div>
            <div className="text-xs text-muted-foreground">{report.totalCount} items</div>
          </CardContent>
        </Card>
        {buckets.map((bucket) => (
          <Card 
            key={bucket.label} 
            className={`cursor-pointer transition-all hover:shadow-md ${
              expandedBucket === bucket.label ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setExpandedBucket(expandedBucket === bucket.label ? null : bucket.label)}
          >
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">{bucket.label}</div>
                {bucket.min >= 61 && bucket.count > 0 && (
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                )}
              </div>
              <div className="text-xl font-bold">{formatCurrency(bucket.total)}</div>
              <div className="text-xs text-muted-foreground">{bucket.count} items</div>
              <Progress 
                value={(bucket.total / maxAmount) * 100} 
                className={`h-1 mt-2 ${getBucketColor(bucket)}`}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Aging Chart Visualization */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Aging Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {buckets.map((bucket) => (
              <div key={bucket.label} className="flex items-center gap-4">
                <div className="w-28 text-sm font-medium">{bucket.label}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div 
                      className={`h-8 rounded ${getBucketColor(bucket)} transition-all`}
                      style={{ 
                        width: report.totalOutstanding > 0 
                          ? `${(bucket.total / report.totalOutstanding) * 100}%` 
                          : '0%',
                        minWidth: bucket.total > 0 ? '4px' : '0'
                      }}
                    />
                    <span className="text-sm font-medium">
                      {formatCurrency(bucket.total)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({report.totalOutstanding > 0 
                        ? ((bucket.total / report.totalOutstanding) * 100).toFixed(1) 
                        : 0}%)
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Items Table */}
      {expandedBucket && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {type === 'receivable' ? <Users className="h-5 w-5" /> : <Receipt className="h-5 w-5" />}
              {expandedBucket} - Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    {type === 'receivable' && <TableHead>Customer</TableHead>}
                    {type === 'payable' && <TableHead>Description</TableHead>}
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center">Days Outstanding</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {buckets
                    .find(b => b.label === expandedBucket)
                    ?.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">{item.reference}</TableCell>
                        <TableCell>
                          {type === 'receivable' ? item.customerName || '-' : item.description || '-'}
                        </TableCell>
                        <TableCell>{format(new Date(item.date), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={getBucketBadgeVariant(buckets.find(b => b.label === expandedBucket)!)}>
                            {item.daysOutstanding} days
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.amount, item.currency)}
                        </TableCell>
                      </TableRow>
                    )) || (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No items in this bucket
                        </TableCell>
                      </TableRow>
                    )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {report.totalCount === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No outstanding {type === 'receivable' ? 'receivables' : 'payables'}</p>
          <p className="text-sm">All accounts are current</p>
        </div>
      )}
    </div>
  );
}

function AgingReportSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-48" />
    </div>
  );
}
