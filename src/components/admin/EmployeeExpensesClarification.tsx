import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useResubmitExpense, EXPENSE_CATEGORIES } from '@/hooks/useExpenses';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { AlertCircle, MessageSquare, Send, Loader2 } from 'lucide-react';

interface ExpenseNeedingClarification {
  id: string;
  category: string;
  amount: number;
  currency: string | null;
  description: string | null;
  clarification_notes: string | null;
  created_at: string | null;
  shipments?: {
    tracking_number: string;
  } | null;
}

export function EmployeeExpensesClarification({ userId }: { userId: string }) {
  const [selectedExpense, setSelectedExpense] = useState<ExpenseNeedingClarification | null>(null);
  const [updatedDescription, setUpdatedDescription] = useState('');
  const resubmitExpense = useResubmitExpense();

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['employee-expenses-clarification', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('id, category, amount, currency, description, clarification_notes, created_at, shipments(tracking_number)')
        .eq('submitted_by', userId)
        .eq('status', 'needs_clarification')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ExpenseNeedingClarification[];
    },
    enabled: !!userId,
  });

  const handleOpenDialog = (expense: ExpenseNeedingClarification) => {
    setSelectedExpense(expense);
    setUpdatedDescription(expense.description || '');
  };

  const handleResubmit = () => {
    if (!selectedExpense) return;
    
    resubmitExpense.mutate(
      { 
        expenseId: selectedExpense.id, 
        description: updatedDescription 
      },
      {
        onSuccess: () => {
          setSelectedExpense(null);
          setUpdatedDescription('');
        },
      }
    );
  };

  const getCategoryLabel = (value: string) => {
    return EXPENSE_CATEGORIES.find(c => c.value === value)?.label || value;
  };

  if (isLoading) {
    return (
      <Card className="shadow-lg border-0">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Expenses Needing Clarification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!expenses?.length) {
    return null; // Don't show the card if there are no expenses needing clarification
  }

  return (
    <>
      <Card className="shadow-lg border-0 border-l-4 border-l-orange-500">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Expenses Needing Clarification
            <Badge variant="destructive" className="ml-auto">
              {expenses.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            These expenses require additional information before approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {expenses.map((expense) => (
              <div 
                key={expense.id} 
                className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{getCategoryLabel(expense.category)}</Badge>
                      {expense.shipments && (
                        <code className="text-xs font-mono text-muted-foreground">
                          {expense.shipments.tracking_number}
                        </code>
                      )}
                    </div>
                    <p className="font-semibold">
                      {expense.currency || 'USD'} {Number(expense.amount).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Submitted {expense.created_at ? format(new Date(expense.created_at), 'MMM d, yyyy') : ''}
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => handleOpenDialog(expense)}
                    className="shrink-0"
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Resubmit
                  </Button>
                </div>
                
                {expense.clarification_notes && (
                  <div className="flex items-start gap-2 p-3 bg-background rounded border">
                    <MessageSquare className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-orange-700 dark:text-orange-400 mb-1">
                        Clarification Requested:
                      </p>
                      <p className="text-sm">{expense.clarification_notes}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedExpense} onOpenChange={(open) => !open && setSelectedExpense(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resubmit Expense</DialogTitle>
            <DialogDescription>
              Update the description with the requested clarification and resubmit for approval.
            </DialogDescription>
          </DialogHeader>

          {selectedExpense && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <Badge variant="outline">{getCategoryLabel(selectedExpense.category)}</Badge>
                  <span className="font-semibold">
                    {selectedExpense.currency || 'USD'} {Number(selectedExpense.amount).toFixed(2)}
                  </span>
                </div>
                {selectedExpense.clarification_notes && (
                  <div className="flex items-start gap-2 p-2 bg-orange-100 dark:bg-orange-950/30 rounded text-sm">
                    <MessageSquare className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                    <span>{selectedExpense.clarification_notes}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Updated Description</Label>
                <Textarea
                  id="description"
                  placeholder="Provide additional details or clarification..."
                  value={updatedDescription}
                  onChange={(e) => setUpdatedDescription(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Include the information requested above
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setSelectedExpense(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleResubmit}
                  disabled={resubmitExpense.isPending}
                >
                  {resubmitExpense.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Resubmit for Approval
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
