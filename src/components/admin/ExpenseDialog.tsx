import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Send } from 'lucide-react';
import { Expense, EXPENSE_CATEGORIES, useCreateExpense, useUpdateExpense } from '@/hooks/useExpenses';
import { useExpenseApprovers } from '@/hooks/useEmployees';

const formSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  amount: z.coerce
    .number()
    .min(0.01, 'Amount must be greater than 0')
    .max(1000000, 'Amount cannot exceed 1,000,000'),
  currency: z.string().default('USD'),
  description: z.string().optional(),
  assigned_to: z.string().min(1, 'Please select an approver'),
});

type FormValues = z.infer<typeof formSchema>;

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipmentId?: string | null;
  expense?: Expense | null;
}

export function ExpenseDialog({
  open,
  onOpenChange,
  shipmentId,
  expense,
}: ExpenseDialogProps) {
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const { data: approvers = [], isLoading: approversLoading } = useExpenseApprovers();
  const isEditing = !!expense;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: '',
      amount: 0,
      currency: 'USD',
      description: '',
      assigned_to: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (expense) {
        form.reset({
          category: expense.category,
          amount: Number(expense.amount),
          currency: expense.currency || 'USD',
          description: expense.description || '',
          assigned_to: (expense as any).assigned_to || '',
        });
      } else {
        form.reset({
          category: '',
          amount: 0,
          currency: 'USD',
          description: '',
          assigned_to: '',
        });
      }
    }
  }, [expense, open, form]);

  const onSubmit = (data: FormValues) => {
    if (isEditing) {
      updateExpense.mutate(
        {
          id: expense.id,
          category: data.category,
          amount: data.amount,
          currency: data.currency,
          description: data.description || null,
        },
        {
          onSuccess: () => onOpenChange(false),
        }
      );
    } else {
      createExpense.mutate(
        {
          shipment_id: shipmentId || null,
          category: data.category,
          amount: data.amount,
          currency: data.currency,
          description: data.description || null,
          assigned_to: data.assigned_to,
        },
        {
          onSuccess: () => onOpenChange(false),
        }
      );
    }
  };

  const isPending = createExpense.isPending || updateExpense.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="AED">AED</SelectItem>
                        <SelectItem value="CNY">CNY</SelectItem>
                        <SelectItem value="INR">INR</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter expense description..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Approver Selection - only show when creating new expense */}
            {!isEditing && (
              <FormField
                control={form.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Send for Approval To</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={approversLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={approversLoading ? "Loading approvers..." : "Select an approver"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {approvers.map((approver) => (
                          <SelectItem key={approver.id} value={approver.id}>
                            {approver.full_name || approver.email}
                          </SelectItem>
                        ))}
                        {approvers.length === 0 && !approversLoading && (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No approvers available. Add employees with "Approve Expenses" permission.
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || (!isEditing && approvers.length === 0)}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {!isPending && !isEditing && <Send className="h-4 w-4 mr-2" />}
                {isEditing ? 'Save Changes' : 'Send for Approval'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
