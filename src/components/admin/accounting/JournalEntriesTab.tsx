import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Eye, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { useJournalEntries, usePostJournalEntry, useVoidJournalEntry, JOURNAL_STATUSES } from '@/hooks/useAccounting';
import { CreateJournalEntryDialog } from './CreateJournalEntryDialog';
import { JournalEntryDetailDialog } from './JournalEntryDetailDialog';

export function JournalEntriesTab() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  const { data: entries = [], isLoading } = useJournalEntries({ 
    status: statusFilter !== 'all' ? statusFilter : undefined 
  });

  const postEntry = usePostJournalEntry();
  const voidEntry = useVoidJournalEntry();

  const filteredEntries = entries.filter(entry => 
    entry.entry_number.toLowerCase().includes(search.toLowerCase()) ||
    entry.description.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Journal Entries</CardTitle>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Journal Entry
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search entries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
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
                <TableHead className="w-32">Entry #</TableHead>
                <TableHead className="w-28">Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-28">Reference</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading entries...
                  </TableCell>
                </TableRow>
              ) : filteredEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No journal entries found
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-sm">{entry.entry_number}</TableCell>
                    <TableCell>{format(new Date(entry.entry_date), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                    <TableCell>
                      {entry.reference_type ? (
                        <Badge variant="outline">{entry.reference_type}</Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={JOURNAL_STATUSES[entry.status]?.color}>
                        {JOURNAL_STATUSES[entry.status]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setSelectedEntryId(entry.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {entry.status === 'draft' && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => postEntry.mutate(entry.id)}
                              disabled={postEntry.isPending}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => voidEntry.mutate(entry.id)}
                              disabled={voidEntry.isPending}
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <CreateJournalEntryDialog 
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
