import { AgentLayout } from '@/components/layout/AgentLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Receipt,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAgentSettlements, Settlement } from '@/hooks/useSettlements';
import { useAgentBalance } from '@/hooks/useAgentBalance';
import { useAgentFullConfig } from '@/hooks/useAgentSettings';
import { cn } from '@/lib/utils';
import { StatCard } from '@/components/admin/StatCard';
import { InvoiceStatusBadge } from '@/components/admin/InvoiceStatusBadge';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', icon: Clock },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: CheckCircle },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: CreditCard },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300', icon: XCircle },
};

export default function AgentSettlementsPage() {
  const { data: settlements, isLoading: settlementsLoading } = useAgentSettlements();
  const { data: balance, isLoading: balanceLoading } = useAgentBalance();
  const { data: agentConfig } = useAgentFullConfig();
  
  const baseCurrency = agentConfig?.settings?.base_currency || 'USD';
  
  const formatCurrency = (amount: number, currency?: string) => {
    return `${currency || baseCurrency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Calculate stats
  const pendingSettlements = settlements?.filter(s => s.status === 'pending' || s.status === 'approved') || [];
  const paidSettlements = settlements?.filter(s => s.status === 'paid') || [];
  const paymentsToUs = settlements?.filter(s => s.settlement_type === 'payment_to_agent') || [];
  const paymentsFromUs = settlements?.filter(s => s.settlement_type === 'collection_from_agent') || [];

  const totalReceivedFromAstraline = paidSettlements
    .filter(s => s.settlement_type === 'payment_to_agent')
    .reduce((sum, s) => sum + s.total_amount, 0);
  
  const totalPaidToAstraline = paidSettlements
    .filter(s => s.settlement_type === 'collection_from_agent')
    .reduce((sum, s) => sum + s.total_amount, 0);

  const isLoading = settlementsLoading || balanceLoading;

  return (
    <AgentLayout 
      title="Settlements" 
      subtitle="Track your payments to and from Astraline"
    >
      {/* Balance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border-green-200 dark:border-green-900/50 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Astraline Owes You</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {balanceLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    formatCurrency(balance?.pending_to_agent || 0)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-900/50 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <TrendingDown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">You Owe Astraline</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {balanceLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    formatCurrency(balance?.pending_from_agent || 0)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <StatCard
          title="Received from Astraline"
          value={formatCurrency(totalReceivedFromAstraline)}
          icon={ArrowDownLeft}
          variant="success"
          subtitle="All time"
        />

        <StatCard
          title="Paid to Astraline"
          value={formatCurrency(totalPaidToAstraline)}
          icon={ArrowUpRight}
          variant="primary"
          subtitle="All time"
        />
      </div>

      {/* Settlement Records */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Settlement History</CardTitle>
          <CardDescription>
            Track settlement status and payment history with Astraline
          </CardDescription>
        </CardHeader>
        <CardContent>
          {settlementsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : settlements && settlements.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Settlement #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Paid On</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlements.map((settlement) => {
                  const StatusIcon = STATUS_CONFIG[settlement.status as keyof typeof STATUS_CONFIG]?.icon || Clock;
                  const statusConfig = STATUS_CONFIG[settlement.status as keyof typeof STATUS_CONFIG];
                  const isPaymentToAgent = settlement.settlement_type === 'payment_to_agent';
                  
                  return (
                    <TableRow key={settlement.id}>
                      <TableCell className="font-mono text-sm">
                        {settlement.settlement_number}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "gap-1",
                            isPaymentToAgent 
                              ? "border-green-300 text-green-700 dark:border-green-700 dark:text-green-400" 
                              : "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400"
                          )}
                        >
                          {isPaymentToAgent ? (
                            <ArrowDownLeft className="h-3 w-3" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3" />
                          )}
                          {isPaymentToAgent ? 'From Astraline' : 'To Astraline'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(settlement.period_start), 'MMM d')} - {format(new Date(settlement.period_end), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-bold",
                        isPaymentToAgent ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"
                      )}>
                        {isPaymentToAgent ? '+' : '-'}{settlement.currency} {settlement.total_amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('gap-1', statusConfig?.color)}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {settlement.paid_at 
                          ? format(new Date(settlement.paid_at), 'MMM d, yyyy')
                          : '-'
                        }
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No settlements yet</p>
              <p className="text-sm mt-1">Settlements will appear here once created by Astraline</p>
            </div>
          )}
        </CardContent>
      </Card>
    </AgentLayout>
  );
}
