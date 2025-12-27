import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Ship,
  Plane,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Calendar,
  Plus,
  Lock,
  Filter,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAdminBatches, useAddBatchCost, useCloseBatch, COST_CATEGORIES, BatchWithProfitability } from '@/hooks/useAdminBatches';
import { useActiveRegions } from '@/hooks/useRegions';
import { cn } from '@/lib/utils';
import { StatCard } from '@/components/admin/StatCard';

export default function BatchProfitabilityPage() {
  const [filters, setFilters] = useState({
    region: 'all',
    status: 'all',
  });

  const { data: batches, isLoading } = useAdminBatches(filters);
  const { data: regions } = useActiveRegions();

  // Calculate summary stats
  const totalRevenue = batches?.reduce((sum, b) => sum + b.total_revenue, 0) || 0;
  const totalCosts = batches?.reduce((sum, b) => sum + b.total_costs, 0) || 0;
  const totalProfit = totalRevenue - totalCosts;
  const avgMargin = batches && batches.length > 0
    ? batches.reduce((sum, b) => sum + b.profit_margin, 0) / batches.length
    : 0;

  return (
    <AdminLayout title="Batch Profitability" subtitle="Track costs and revenue by cargo batch">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          variant="navy"
        />
        <StatCard
          title="Total Costs"
          value={`$${totalCosts.toLocaleString()}`}
          icon={TrendingDown}
          variant="warning"
        />
        <StatCard
          title="Net Profit"
          value={`$${totalProfit.toLocaleString()}`}
          icon={totalProfit >= 0 ? TrendingUp : TrendingDown}
          variant={totalProfit >= 0 ? 'success' : 'warning'}
        />
        <StatCard
          title="Avg Margin"
          value={`${avgMargin.toFixed(1)}%`}
          icon={TrendingUp}
          variant="primary"
        />
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <Select value={filters.region} onValueChange={(v) => setFilters({ ...filters, region: v })}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {regions?.map((r) => (
                  <SelectItem key={r.id} value={r.code}>
                    {r.flag_emoji} {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Batches Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cargo Batches</CardTitle>
          <CardDescription>Click on a batch to manage costs</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : batches && batches.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch</TableHead>
                  <TableHead>Week</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead className="text-center">Shipments</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Costs</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => (
                  <BatchRow key={batch.id} batch={batch} />
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No batches found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}

function BatchRow({ batch }: { batch: BatchWithProfitability }) {
  const [open, setOpen] = useState(false);
  const addCost = useAddBatchCost();
  const closeBatch = useCloseBatch();
  const [costs, setCosts] = useState<Record<string, string>>({});

  const Icon = batch.cargo_type === 'sea' ? Ship : Plane;
  const isProfitable = batch.profit >= 0;

  const handleSaveCost = async (category: string) => {
    const amount = parseFloat(costs[category] || '0');
    if (isNaN(amount) || amount < 0) return;

    await addCost.mutateAsync({
      batchId: batch.id,
      costCategory: category,
      amount,
    });

    setCosts({ ...costs, [category]: '' });
  };

  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setOpen(true)}>
        <TableCell>
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-muted-foreground" />
            <span className="font-mono text-sm">{batch.batch_number}</span>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1 text-sm">
            <Calendar className="w-3 h-3" />
            {format(new Date(batch.arrival_week_start), 'MMM d')} -{' '}
            {format(new Date(batch.arrival_week_end), 'd')}
          </div>
        </TableCell>
        <TableCell className="capitalize">{batch.origin_region}</TableCell>
        <TableCell className="text-center">{batch.shipment_count}</TableCell>
        <TableCell className="text-right font-medium">${batch.total_revenue.toLocaleString()}</TableCell>
        <TableCell className="text-right text-muted-foreground">${batch.total_costs.toLocaleString()}</TableCell>
        <TableCell className={cn('text-right font-bold', isProfitable ? 'text-green-600' : 'text-red-600')}>
          {isProfitable ? '+' : ''}${batch.profit.toLocaleString()}
        </TableCell>
        <TableCell className="text-right">
          <Badge variant={isProfitable ? 'default' : 'destructive'} className="font-mono">
            {batch.profit_margin.toFixed(1)}%
          </Badge>
        </TableCell>
        <TableCell>
          <Badge variant={batch.status === 'open' ? 'secondary' : 'outline'}>
            {batch.status}
          </Badge>
        </TableCell>
        <TableCell>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
            <Plus className="w-4 h-4" />
          </Button>
        </TableCell>
      </TableRow>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon className="w-5 h-5" />
              {batch.batch_number}
              <Badge variant={batch.status === 'open' ? 'default' : 'secondary'} className="ml-2">
                {batch.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold">${batch.total_revenue.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Total Costs</p>
                <p className="text-2xl font-bold">${batch.total_costs.toLocaleString()}</p>
              </div>
              <div className={cn('p-4 rounded-lg', isProfitable ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30')}>
                <p className="text-sm text-muted-foreground">Net Profit</p>
                <p className={cn('text-2xl font-bold', isProfitable ? 'text-green-600' : 'text-red-600')}>
                  {isProfitable ? '+' : ''}${batch.profit.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Cost Categories */}
            <div>
              <h4 className="font-medium mb-3">Cost Breakdown</h4>
              <div className="space-y-3">
                {COST_CATEGORIES.map((cat) => {
                  const existingCost = batch.costs_breakdown.find((c) => c.category === cat.key);
                  return (
                    <div key={cat.key} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                      <div className="flex-1">
                        <Label className="text-sm font-medium">{cat.label}</Label>
                        {cat.agentCanEdit && (
                          <p className="text-xs text-muted-foreground">Entered by agent</p>
                        )}
                      </div>
                      {existingCost ? (
                        <div className="text-right">
                          <span className="font-bold">${existingCost.amount.toLocaleString()}</span>
                        </div>
                      ) : batch.status === 'open' ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={costs[cat.key] || ''}
                            onChange={(e) => setCosts({ ...costs, [cat.key]: e.target.value })}
                            className="w-32"
                            disabled={cat.agentCanEdit}
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSaveCost(cat.key)}
                            disabled={!costs[cat.key] || cat.agentCanEdit || addCost.isPending}
                          >
                            Add
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            {batch.status === 'open' && (
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => closeBatch.mutate(batch.id)}
                  disabled={closeBatch.isPending}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Close Batch
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
