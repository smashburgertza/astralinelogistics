import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  Eye, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  RefreshCw, 
  MoreHorizontal, 
  Edit, 
  Trash2,
  Download,
  Calendar,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  FileText
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO } from 'date-fns';
import { 
  useJournalEntries, 
  useDeleteJournalEntry, 
  usePendingTransactions,
  useTransactionStats,
  useApproveTransaction,
  useRejectTransaction,
  useSubmitForApproval
} from '@/hooks/useAccounting';
import { SimpleTransactionDialog } from './SimpleTransactionDialog';
import { JournalEntryDetailDialog } from './JournalEntryDetailDialog';
import { EditTransactionDialog } from './EditTransactionDialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { StatCard } from '@/components/admin/StatCard';

const formatCurrency = (amount: number, currency: string = 'TZS') => {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
};

const DATE_PRESETS = [
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'Last 3 Months', value: 'last_3_months' },
  { label: 'This Year', value: 'this_year' },
  { label: 'All Time', value: 'all' },
  { label: 'Custom', value: 'custom' },
];

export function TransactionsTab() {
  const today = new Date();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [datePreset, setDatePreset] = useState('this_month');
  const [startDate, setStartDate] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), 'yyyy-MM-dd'));
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [editEntryId, setEditEntryId] = useState<string | null>(null);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectEntryId, setRejectEntryId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: entries = [], isLoading } = useJournalEntries();
  const { data: pendingEntries = [], isLoading: pendingLoading } = usePendingTransactions();
  const { data: stats } = useTransactionStats();
  const deleteEntry = useDeleteJournalEntry();
  const approveTransaction = useApproveTransaction();
  const rejectTransaction = useRejectTransaction();
  const submitForApproval = useSubmitForApproval();

  // Handle date preset changes
  const handleDatePreset = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    
    switch (preset) {
      case 'this_month':
        setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        break;
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        setStartDate(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
        break;
      case 'last_3_months':
        setStartDate(format(startOfMonth(subMonths(now, 2)), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        break;
      case 'this_year':
        setStartDate(format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd'));
        setEndDate(format(now, 'yyyy-MM-dd'));
        break;
      case 'all':
        setStartDate('');
        setEndDate('');
        break;
    }
  };

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const matchesSearch = entry.description.toLowerCase().includes(search.toLowerCase()) ||
                           entry.entry_number.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === 'all' || entry.reference_type === typeFilter;
      const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
      
      // Date filtering
      let matchesDate = true;
      if (startDate && endDate) {
        const entryDate = parseISO(entry.entry_date);
        matchesDate = isWithinInterval(entryDate, {
          start: parseISO(startDate),
          end: parseISO(endDate)
        });
      }
      
      return matchesSearch && matchesType && matchesStatus && matchesDate;
    }).sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime());
  }, [entries, search, typeFilter, statusFilter, startDate, endDate]);

  // Calculate totals
  const totals = useMemo(() => {
    let income = 0;
    let expenses = 0;
    
    filteredEntries.forEach(entry => {
      if (entry.reference_type === 'income' || entry.reference_type === 'payment') {
        entry.lines?.forEach((line) => {
          if (line.credit_amount) income += Number(line.credit_amount);
        });
      } else if (entry.reference_type === 'expense') {
        entry.lines?.forEach((line) => {
          if (line.debit_amount) expenses += Number(line.debit_amount);
        });
      }
    });
    
    return { income, expenses, net: income - expenses };
  }, [filteredEntries]);

  const handleDelete = () => {
    if (deleteEntryId) {
      deleteEntry.mutate(deleteEntryId, {
        onSuccess: () => setDeleteEntryId(null),
      });
    }
  };

  const handleApprove = (id: string) => {
    approveTransaction.mutate(id);
  };

  const handleReject = () => {
    if (rejectEntryId && rejectReason) {
      rejectTransaction.mutate(
        { id: rejectEntryId, reason: rejectReason },
        {
          onSuccess: () => {
            setRejectDialogOpen(false);
            setRejectEntryId(null);
            setRejectReason('');
          },
        }
      );
    }
  };

  const handleSubmitForApproval = (id: string) => {
    submitForApproval.mutate(id);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Reference', 'Description', 'Type', 'Status', 'Debit', 'Credit'];
    const rows = filteredEntries.map(entry => {
      const debit = entry.lines?.reduce((sum: number, line) => sum + (Number(line.debit_amount) || 0), 0) || 0;
      const credit = entry.lines?.reduce((sum: number, line) => sum + (Number(line.credit_amount) || 0), 0) || 0;
      return [
        format(new Date(entry.entry_date), 'yyyy-MM-dd'),
        entry.entry_number,
        `"${entry.description}"`,
        entry.reference_type || 'other',
        entry.status,
        debit,
        credit
      ].join(',');
    });
    
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getTypeIcon = (type: string | null) => {
    switch (type) {
      case 'income':
      case 'payment':
        return <ArrowDownCircle className="h-4 w-4 text-green-600" />;
      case 'expense':
        return <ArrowUpCircle className="h-4 w-4 text-red-600" />;
      default:
        return <RefreshCw className="h-4 w-4 text-blue-600" />;
    }
  };

  const getTypeBadge = (type: string | null) => {
    switch (type) {
      case 'income':
      case 'payment':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Income</Badge>;
      case 'expense':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Expense</Badge>;
      case 'transfer':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Transfer</Badge>;
      default:
        return <Badge variant="secondary">{type || 'Other'}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'posted':
        return <Badge className="bg-green-100 text-green-700">Posted</Badge>;
      case 'pending_approval':
        return <Badge className="bg-amber-100 text-amber-700">Pending Approval</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700">Rejected</Badge>;
      case 'voided':
        return <Badge variant="destructive">Voided</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getEntryAmount = (entry: any) => {
    const lines = entry.lines || [];
    const debit = lines.reduce((sum: number, line: any) => sum + (Number(line.debit_amount) || 0), 0);
    const credit = lines.reduce((sum: number, line: any) => sum + (Number(line.credit_amount) || 0), 0);
    return Math.max(debit, credit);
  };

  const pendingCount = stats?.pendingCount || 0;

  const renderTransactionTable = (transactionList: any[], showApprovalActions: boolean = false, loading: boolean = false) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead className="w-28">Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-28">Type</TableHead>
            <TableHead className="text-right w-32">Amount</TableHead>
            <TableHead className="w-32">Status</TableHead>
            <TableHead className="w-20"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                Loading transactions...
              </TableCell>
            </TableRow>
          ) : transactionList.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                {showApprovalActions 
                  ? 'No transactions pending approval.'
                  : 'No transactions found. Click "New Transaction" to add one.'}
              </TableCell>
            </TableRow>
          ) : (
            transactionList.map((entry) => (
              <TableRow key={entry.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>
                  <div className={`p-2 rounded-full w-fit ${
                    entry.reference_type === 'income' || entry.reference_type === 'payment' ? 'bg-green-100' :
                    entry.reference_type === 'expense' ? 'bg-red-100' : 'bg-blue-100'
                  }`}>
                    {getTypeIcon(entry.reference_type)}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {format(new Date(entry.entry_date), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{entry.description}</p>
                    <p className="text-xs text-muted-foreground">{entry.entry_number}</p>
                  </div>
                </TableCell>
                <TableCell>{getTypeBadge(entry.reference_type)}</TableCell>
                <TableCell className="text-right font-medium">
                  <span className={
                    entry.reference_type === 'income' || entry.reference_type === 'payment' 
                      ? 'text-green-600' 
                      : entry.reference_type === 'expense' 
                        ? 'text-red-600' 
                        : ''
                  }>
                    {formatCurrency(getEntryAmount(entry))}
                  </span>
                </TableCell>
                <TableCell>
                  {getStatusBadge(entry.status)}
                </TableCell>
                <TableCell>
                  {showApprovalActions ? (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleApprove(entry.id)}
                        disabled={approveTransaction.isPending}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setRejectEntryId(entry.id);
                          setRejectDialogOpen(true);
                        }}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setSelectedEntryId(entry.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedEntryId(entry.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {entry.status === 'draft' && (
                          <>
                            <DropdownMenuItem onClick={() => handleSubmitForApproval(entry.id)}>
                              <Send className="h-4 w-4 mr-2" />
                              Submit for Approval
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditEntryId(entry.id)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => setDeleteEntryId(entry.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                        {entry.status === 'rejected' && (
                          <>
                            <DropdownMenuItem onClick={() => setEditEntryId(entry.id)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit & Resubmit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => setDeleteEntryId(entry.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Pending Approval"
          value={stats?.pendingCount ?? 0}
          icon={Clock}
          variant="navy"
        />
        <StatCard
          title="Draft"
          value={stats?.draftCount ?? 0}
          icon={FileText}
          variant="default"
        />
        <StatCard
          title="Posted"
          value={stats?.postedCount ?? 0}
          icon={CheckCircle}
          variant="success"
        />
        <StatCard
          title="Rejected"
          value={stats?.rejectedCount ?? 0}
          icon={XCircle}
          variant="default"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <ArrowDownCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Income</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.income)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-100">
                <ArrowUpCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expenses</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totals.expenses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${totals.net >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                <RefreshCw className={`h-5 w-5 ${totals.net >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net</p>
                <p className={`text-2xl font-bold ${totals.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totals.net)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="queue" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="queue" className="relative">
              Approval Queue
              {pendingCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="ml-2 h-5 min-w-[20px] px-1.5 text-xs"
                >
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">All Transactions</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Transaction
            </Button>
          </div>
        </div>

        <TabsContent value="queue" className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 border">
            <h3 className="font-medium mb-1">Pending Approval</h3>
            <p className="text-sm text-muted-foreground">
              Review and approve or reject transactions submitted by employees. Approved transactions will be posted to the ledger.
            </p>
          </div>
          {renderTransactionTable(pendingEntries, true, pendingLoading)}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={datePreset} onValueChange={handleDatePreset}>
              <SelectTrigger className="w-40">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                {DATE_PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {datePreset === 'custom' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    {startDate && endDate ? `${format(parseISO(startDate), 'MMM d')} - ${format(parseISO(endDate), 'MMM d')}` : 'Select dates'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="start">
                  <div className="flex gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="payment">Payments</SelectItem>
                <SelectItem value="expense">Expenses</SelectItem>
                <SelectItem value="transfer">Transfers</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_approval">Pending Approval</SelectItem>
                <SelectItem value="posted">Posted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="voided">Voided</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {renderTransactionTable(filteredEntries, false, isLoading)}
        </TabsContent>
      </Tabs>

      <SimpleTransactionDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
      />

      {selectedEntryId && (
        <JournalEntryDetailDialog
          entryId={selectedEntryId}
          open={!!selectedEntryId}
          onOpenChange={(open) => !open && setSelectedEntryId(null)}
        />
      )}

      <EditTransactionDialog
        open={!!editEntryId}
        onOpenChange={(open) => !open && setEditEntryId(null)}
        entryId={editEntryId}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteEntryId} onOpenChange={(open) => !open && setDeleteEntryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this journal entry. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground"
              disabled={deleteEntry.isPending}
            >
              {deleteEntry.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Transaction</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this transaction.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Reason for Rejection</Label>
              <Textarea
                id="reject-reason"
                placeholder="Enter the reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectReason || rejectTransaction.isPending}
            >
              {rejectTransaction.isPending ? 'Rejecting...' : 'Reject Transaction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}