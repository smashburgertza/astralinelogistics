import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogFooter,
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
  Receipt,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Filter,
  Eye,
  CreditCard,
} from 'lucide-react';
import { format } from 'date-fns';
import { useSettlements, useCreateSettlement, useUpdateSettlementStatus, Settlement, SettlementType, SettlementStatus } from '@/hooks/useSettlements';
import { useAgents } from '@/hooks/useAgents';
import { cn } from '@/lib/utils';
import { StatCard } from '@/components/admin/StatCard';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800', icon: Clock },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-800', icon: CreditCard },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800', icon: XCircle },
};

export default function SettlementsPage() {
  const [filters, setFilters] = useState({ status: 'all', agent: 'all' });
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);

  const { data: settlements, isLoading } = useSettlements(filters);
  const { data: agents } = useAgents();
  const createSettlement = useCreateSettlement();
  const updateStatus = useUpdateSettlementStatus();

  // Form state for creating settlement
  const [form, setForm] = useState({
    agent_id: '',
    settlement_type: 'collection_from_agent' as SettlementType,
    period_start: '',
    period_end: '',
    total_amount: 0,
    currency: 'USD',
    notes: '',
  });

  // Stats
  const totalPending = settlements?.filter(s => s.status === 'pending').reduce((sum, s) => sum + s.total_amount, 0) || 0;
  const totalApproved = settlements?.filter(s => s.status === 'approved').reduce((sum, s) => sum + s.total_amount, 0) || 0;
  const totalPaid = settlements?.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.total_amount, 0) || 0;
  const pendingCount = settlements?.filter(s => s.status === 'pending').length || 0;

  const handleCreate = async () => {
    await createSettlement.mutateAsync({
      agent_id: form.agent_id,
      settlement_type: form.settlement_type,
      period_start: form.period_start,
      period_end: form.period_end,
      total_amount: form.total_amount,
      currency: form.currency,
      notes: form.notes,
      invoice_ids: [], // Empty for manual settlement
    });
    setForm({
      agent_id: '',
      settlement_type: 'collection_from_agent',
      period_start: '',
      period_end: '',
      total_amount: 0,
      currency: 'USD',
      notes: '',
    });
    setCreateOpen(false);
  };

  const handleStatusUpdate = async (settlementId: string, status: SettlementStatus, paymentRef?: string) => {
    await updateStatus.mutateAsync({ id: settlementId, status });
    setSelectedSettlement(null);
  };

  return (
    <AdminLayout title="Settlements" subtitle="Manage agent payment settlements">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Pending Approval"
          value={`$${totalPending.toLocaleString()}`}
          icon={Clock}
          variant="warning"
          subtitle={`${pendingCount} settlements`}
        />
        <StatCard
          title="Approved"
          value={`$${totalApproved.toLocaleString()}`}
          icon={CheckCircle}
          variant="primary"
        />
        <StatCard
          title="Paid Out"
          value={`$${totalPaid.toLocaleString()}`}
          icon={CreditCard}
          variant="success"
        />
        <StatCard
          title="This Month"
          value={settlements?.length || 0}
          icon={Receipt}
          variant="navy"
        />
      </div>

      {/* Filters & Actions */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.agent} onValueChange={(v) => setFilters({ ...filters, agent: v })}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  {agents?.map((agent) => (
                    <SelectItem key={agent.id} value={agent.user_id}>
                      {agent.profile?.full_name || agent.profile?.email || 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Settlement
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Settlements Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Settlement Records</CardTitle>
          <CardDescription>Track and manage agent settlements</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : settlements && settlements.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Settlement #</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlements.map((settlement) => {
                  const StatusIcon = STATUS_CONFIG[settlement.status as keyof typeof STATUS_CONFIG]?.icon || Clock;
                  const statusConfig = STATUS_CONFIG[settlement.status as keyof typeof STATUS_CONFIG];
                  
                  return (
                    <TableRow key={settlement.id}>
                      <TableCell className="font-mono text-sm">{settlement.settlement_number}</TableCell>
                      <TableCell>{settlement.profiles?.full_name || settlement.profiles?.email || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {settlement.settlement_type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(settlement.period_start), 'MMM d')} - {format(new Date(settlement.period_end), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {settlement.currency} {settlement.total_amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('gap-1', statusConfig?.color)}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedSettlement(settlement)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No settlements found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Settlement Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Settlement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Agent</Label>
              <Select value={form.agent_id} onValueChange={(v) => setForm({ ...form, agent_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents?.map((agent) => (
                    <SelectItem key={agent.id} value={agent.user_id}>
                      {agent.profile?.full_name || agent.profile?.email || 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Settlement Type</Label>
              <Select value={form.settlement_type} onValueChange={(v: SettlementType) => setForm({ ...form, settlement_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="collection_from_agent">Collection from Agent (Agent owes Astraline)</SelectItem>
                  <SelectItem value="payment_to_agent">Payment to Agent (Astraline owes Agent)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Period Start</Label>
                <Input
                  type="date"
                  value={form.period_start}
                  onChange={(e) => setForm({ ...form, period_start: e.target.value })}
                />
              </div>
              <div>
                <Label>Period End</Label>
                <Input
                  type="date"
                  value={form.period_end}
                  onChange={(e) => setForm({ ...form, period_end: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.total_amount || ''}
                  onChange={(e) => setForm({ ...form, total_amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="TZS">TZS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={!form.agent_id || !form.period_start || !form.period_end || form.total_amount <= 0 || createSettlement.isPending}
            >
              {createSettlement.isPending ? 'Creating...' : 'Create Settlement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settlement Detail Dialog */}
      <Dialog open={!!selectedSettlement} onOpenChange={() => setSelectedSettlement(null)}>
        <DialogContent className="sm:max-w-[500px]">
          {selectedSettlement && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  {selectedSettlement.settlement_number}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Agent</p>
                    <p className="font-medium">{selectedSettlement.profiles?.full_name || selectedSettlement.profiles?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium capitalize">{selectedSettlement.settlement_type.replace('_', ' ')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Period</p>
                    <p className="font-medium">
                      {format(new Date(selectedSettlement.period_start), 'MMM d')} - {format(new Date(selectedSettlement.period_end), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="text-xl font-bold text-primary">
                      {selectedSettlement.currency} {selectedSettlement.total_amount.toLocaleString()}
                    </p>
                  </div>
                </div>

                {selectedSettlement.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="text-sm">{selectedSettlement.notes}</p>
                  </div>
                )}

                {selectedSettlement.payment_reference && (
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Reference</p>
                    <p className="font-mono text-sm">{selectedSettlement.payment_reference}</p>
                  </div>
                )}
              </div>

              {/* Actions based on status */}
              <DialogFooter className="flex-col sm:flex-row gap-2">
                {selectedSettlement.status === 'pending' && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => handleStatusUpdate(selectedSettlement.id, 'cancelled')}
                      disabled={updateStatus.isPending}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      onClick={() => handleStatusUpdate(selectedSettlement.id, 'approved')}
                      disabled={updateStatus.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                  </>
                )}
                {selectedSettlement.status === 'approved' && (
                  <Button
                    onClick={() => {
                      const ref = prompt('Enter payment reference:');
                      if (ref) handleStatusUpdate(selectedSettlement.id, 'paid', ref);
                    }}
                    disabled={updateStatus.isPending}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Mark as Paid
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
