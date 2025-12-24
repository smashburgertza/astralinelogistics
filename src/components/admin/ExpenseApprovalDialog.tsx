import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useDenyExpense, useRequestClarification } from '@/hooks/useExpenses';

interface ExpenseApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseId: string;
  mode: 'deny' | 'clarification';
}

export function ExpenseApprovalDialog({
  open,
  onOpenChange,
  expenseId,
  mode,
}: ExpenseApprovalDialogProps) {
  const [reason, setReason] = useState('');
  const denyExpense = useDenyExpense();
  const requestClarification = useRequestClarification();

  const isPending = denyExpense.isPending || requestClarification.isPending;

  const handleSubmit = () => {
    if (!reason.trim()) return;

    if (mode === 'deny') {
      denyExpense.mutate(
        { expenseId, reason },
        {
          onSuccess: () => {
            setReason('');
            onOpenChange(false);
          },
        }
      );
    } else {
      requestClarification.mutate(
        { expenseId, notes: reason },
        {
          onSuccess: () => {
            setReason('');
            onOpenChange(false);
          },
        }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'deny' ? 'Deny Expense' : 'Request Clarification'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'deny'
              ? 'Provide a reason for denying this expense. The submitter will be notified.'
              : 'Describe what clarification is needed. The submitter will be notified and can resubmit.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="reason">
              {mode === 'deny' ? 'Denial Reason' : 'Clarification Needed'}
            </Label>
            <Textarea
              id="reason"
              placeholder={
                mode === 'deny'
                  ? 'Enter the reason for denial...'
                  : 'Describe what information is needed...'
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant={mode === 'deny' ? 'destructive' : 'default'}
              onClick={handleSubmit}
              disabled={!reason.trim() || isPending}
            >
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === 'deny' ? 'Deny Expense' : 'Request Clarification'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
