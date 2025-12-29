import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useJournalEntry, useUpdateJournalEntry, useDeleteJournalEntry, usePostJournalEntry, useVoidJournalEntry, JOURNAL_STATUSES } from '@/hooks/useAccounting';
import { Badge } from '@/components/ui/badge';
import { Trash2, CheckCircle, XCircle } from 'lucide-react';

interface EditTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryId: string | null;
}

export function EditTransactionDialog({ open, onOpenChange, entryId }: EditTransactionDialogProps) {
  const { data: entry, isLoading } = useJournalEntry(entryId || '');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  const updateEntry = useUpdateJournalEntry();
  const deleteEntry = useDeleteJournalEntry();
  const postEntry = usePostJournalEntry();
  const voidEntry = useVoidJournalEntry();

  useEffect(() => {
    if (entry) {
      setDate(entry.entry_date);
      setDescription(entry.description);
      setNotes(entry.notes || '');
    }
  }, [entry]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryId) return;
    
    updateEntry.mutate({
      id: entryId,
      entry: {
        entry_date: date,
        description,
        notes: notes || null,
      },
    }, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  const handleDelete = () => {
    if (!entryId) return;
    deleteEntry.mutate(entryId, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  const handlePost = () => {
    if (!entryId) return;
    postEntry.mutate(entryId, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  const handleVoid = () => {
    if (!entryId) return;
    voidEntry.mutate(entryId, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  const isDraft = entry?.status === 'draft';
  const isPosted = entry?.status === 'posted';
  const isVoided = entry?.status === 'voided';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Edit Transaction</DialogTitle>
            {entry && (
              <Badge className={JOURNAL_STATUSES[entry.status]?.color}>
                {JOURNAL_STATUSES[entry.status]?.label}
              </Badge>
            )}
          </div>
        </DialogHeader>
        
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : entry ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Entry Number</Label>
              <Input value={entry.entry_number} disabled className="font-mono" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isVoided}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isVoided}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isVoided}
                rows={2}
              />
            </div>

            {/* Journal Lines Summary */}
            {entry.lines && entry.lines.length > 0 && (
              <div className="rounded-md border p-3 bg-muted/30">
                <Label className="text-sm font-medium mb-2 block">Journal Lines</Label>
                <div className="space-y-1 text-sm">
                  {entry.lines.map((line) => (
                    <div key={line.id} className="flex justify-between">
                      <span className="text-muted-foreground">
                        {line.account?.account_code} - {line.account?.account_name}
                      </span>
                      <span>
                        {line.debit_amount > 0 && `DR ${line.debit_amount.toLocaleString()}`}
                        {line.credit_amount > 0 && `CR ${line.credit_amount.toLocaleString()}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <div className="flex gap-2">
                {isDraft && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this journal entry. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                
                {isDraft && (
                  <Button type="button" variant="outline" size="sm" onClick={handlePost}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Post
                  </Button>
                )}

                {isPosted && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="outline" size="sm">
                        <XCircle className="h-4 w-4 mr-2" />
                        Void
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Void Transaction?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will void the journal entry. The entry will be marked as voided but not deleted.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleVoid}>
                          Void Entry
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                {!isVoided && (
                  <Button type="submit" disabled={updateEntry.isPending}>
                    {updateEntry.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                )}
              </div>
            </div>
          </form>
        ) : (
          <div className="py-8 text-center text-muted-foreground">Entry not found</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
