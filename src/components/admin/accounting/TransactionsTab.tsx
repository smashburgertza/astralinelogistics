import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
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
  Filter
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO } from 'date-fns';
import { useJournalEntries, useDeleteJournalEntry } from '@/hooks/useAccounting';
import { SimpleTransactionDialog } from './SimpleTransactionDialog';
import { JournalEntryDetailDialog } from './JournalEntryDetailDialog';
import { EditTransactionDialog } from './EditTransactionDialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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

  const { data: entries = [], isLoading } = useJournalEntries();
  const deleteEntry = useDeleteJournalEntry();

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
        // Sum credit amounts for income
        entry.lines?.forEach((line) => {
          if (line.credit_amount) income += Number(line.credit_amount);
        });
      } else if (entry.reference_type === 'expense') {
        // Sum debit amounts for expenses
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

  const getEntryAmount = (entry: any) => {
    const lines = entry.lines || [];
    const debit = lines.reduce((sum: number, line: any) => sum + (Number(line.debit_amount) || 0), 0);
    const credit = lines.reduce((sum: number, line: any) => sum + (Number(line.credit_amount) || 0), 0);
    return Math.max(debit, credit);
  };

  return (
    <div className="space-y-4">
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transactions</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredEntries.length} transactions found
              </p>
            </div>
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
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-4">
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
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="posted">Posted</SelectItem>
                <SelectItem value="voided">Voided</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="w-28">Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-28">Type</TableHead>
                  <TableHead className="text-right w-32">Amount</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Loading transactions...
                    </TableCell>
                  </TableRow>
                ) : filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No transactions found. Click "New Transaction" to add one.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry) => (
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
                        <Badge 
                          variant={entry.status === 'posted' ? 'default' : entry.status === 'voided' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
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
                            <DropdownMenuItem onClick={() => setEditEntryId(entry.id)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {entry.status === 'draft' && (
                              <DropdownMenuItem 
                                onClick={() => setDeleteEntryId(entry.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

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
      </Card>
    </div>
  );
}
