import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Eye, ArrowDownCircle, ArrowUpCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useJournalEntries } from '@/hooks/useAccounting';
import { SimpleTransactionDialog } from './SimpleTransactionDialog';
import { JournalEntryDetailDialog } from './JournalEntryDetailDialog';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
};

export function TransactionsTab() {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  const { data: entries = [], isLoading } = useJournalEntries({ 
    status: 'posted' // Only show posted entries
  });

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.description.toLowerCase().includes(search.toLowerCase()) ||
                         entry.entry_number.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || entry.reference_type === typeFilter;
    return matchesSearch && matchesType;
  });

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
        return <Badge className="bg-green-100 text-green-700">Income</Badge>;
      case 'expense':
        return <Badge className="bg-red-100 text-red-700">Expense</Badge>;
      case 'transfer':
        return <Badge className="bg-blue-100 text-blue-700">Transfer</Badge>;
      default:
        return <Badge variant="secondary">{type || 'Other'}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Transactions</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Record and view all your financial transactions
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Transaction
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="payment">Payments</SelectItem>
              <SelectItem value="expense">Expenses</SelectItem>
              <SelectItem value="transfer">Transfers</SelectItem>
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
                <TableHead className="w-32 text-right">Amount</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading transactions...
                  </TableCell>
                </TableRow>
              ) : filteredEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                      {/* Amount would need to be fetched from lines - showing placeholder */}
                      —
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setSelectedEntryId(entry.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
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
    </Card>
  );
}
