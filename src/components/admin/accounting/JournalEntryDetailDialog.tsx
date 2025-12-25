import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useJournalEntry, JOURNAL_STATUSES } from '@/hooks/useAccounting';

interface JournalEntryDetailDialogProps {
  entryId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JournalEntryDetailDialog({ entryId, open, onOpenChange }: JournalEntryDetailDialogProps) {
  const { data: entry, isLoading } = useJournalEntry(entryId);

  const formatCurrency = (amount: number, currency: string = 'TZS') => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const totalDebits = entry?.lines?.reduce((sum, l) => sum + (Number(l.debit_amount) || 0), 0) || 0;
  const totalCredits = entry?.lines?.reduce((sum, l) => sum + (Number(l.credit_amount) || 0), 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Journal Entry Details</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : entry ? (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Entry Number</p>
                <p className="font-mono font-medium">{entry.entry_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">{format(new Date(entry.entry_date), 'dd MMM yyyy')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={JOURNAL_STATUSES[entry.status]?.color}>
                  {JOURNAL_STATUSES[entry.status]?.label}
                </Badge>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="font-medium">{entry.description}</p>
            </div>

            {entry.reference_type && (
              <div>
                <p className="text-sm text-muted-foreground">Reference</p>
                <Badge variant="outline">{entry.reference_type}</Badge>
              </div>
            )}

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-24 text-right">Debit</TableHead>
                    <TableHead className="w-24 text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entry.lines?.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        <span className="font-mono text-sm">{line.account?.account_code}</span>
                        <span className="ml-2">{line.account?.account_name}</span>
                      </TableCell>
                      <TableCell>{line.description || '-'}</TableCell>
                      <TableCell className="text-right">
                        {line.debit_amount > 0 ? formatCurrency(line.debit_amount, line.currency) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {line.credit_amount > 0 ? formatCurrency(line.credit_amount, line.currency) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-medium">
                    <TableCell colSpan={2} className="text-right">Totals:</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalDebits)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalCredits)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {entry.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="text-sm">{entry.notes}</p>
              </div>
            )}

            {entry.posted_at && (
              <div className="text-sm text-muted-foreground">
                Posted on {format(new Date(entry.posted_at), 'dd MMM yyyy HH:mm')}
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">Entry not found</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
