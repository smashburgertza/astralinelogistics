import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Loader2, Send, Upload, X, FileText } from 'lucide-react';
import { Expense, EXPENSE_CATEGORIES, useCreateExpense, useUpdateExpense } from '@/hooks/useExpenses';
import { useExpenseApprovers } from '@/hooks/useEmployees';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useActiveRegions } from '@/hooks/useRegions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const formSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  amount: z.coerce
    .number()
    .min(0.01, 'Amount must be greater than 0')
    .max(1000000, 'Amount cannot exceed 1,000,000'),
  currency: z.string().default('TZS'),
  description: z.string().optional(),
  assigned_to: z.string().optional(), // Optional because it's only required for new expenses
  region: z.string().optional(),
});

const createFormSchema = formSchema.refine(
  (data) => data.assigned_to && data.assigned_to.length > 0,
  { message: 'Please select an approver', path: ['assigned_to'] }
);

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
  const { data: currencies = [] } = useExchangeRates();
  const { data: regions = [] } = useActiveRegions();
  const isEditing = !!expense;

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(isEditing ? formSchema : createFormSchema),
    defaultValues: {
      category: '',
      amount: 0,
      currency: 'TZS',
      description: '',
      assigned_to: '',
      region: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (expense) {
        form.reset({
          category: expense.category,
          amount: Number(expense.amount),
          currency: expense.currency || 'TZS',
          description: expense.description || '',
          assigned_to: (expense as any).assigned_to || '',
          region: expense.region || '',
        });
        setExistingReceiptUrl(expense.receipt_url || null);
      } else {
        form.reset({
          category: '',
          amount: 0,
          currency: 'TZS',
          description: '',
          assigned_to: '',
          region: '',
        });
        setExistingReceiptUrl(null);
      }
      setReceiptFile(null);
    }
  }, [expense, open, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setReceiptFile(file);
    }
  };

  const removeFile = () => {
    setReceiptFile(null);
  };

  const uploadReceipt = async (): Promise<string | null> => {
    if (!receiptFile) return existingReceiptUrl;

    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id || 'anonymous';
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('expense-receipts')
        .upload(fileName, receiptFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('expense-receipts')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload receipt');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    const receiptUrl = await uploadReceipt();

    if (isEditing) {
      updateExpense.mutate(
        {
          id: expense.id,
          category: data.category,
          amount: data.amount,
          currency: data.currency,
          description: data.description || null,
          region: (data.region || null) as any,
          receipt_url: receiptUrl,
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
          region: (data.region || null) as any,
          receipt_url: receiptUrl,
        },
        {
          onSuccess: () => onOpenChange(false),
        }
      );
    }
  };

  const isPending = createExpense.isPending || updateExpense.isPending || uploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the expense details below.' 
              : 'Submit a new expense for approval. All expenses require manager approval.'}
          </DialogDescription>
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
                        {currencies.map((currency) => (
                          <SelectItem key={currency.currency_code} value={currency.currency_code}>
                            {currency.currency_code} - {currency.currency_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region (optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a region" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">No region</SelectItem>
                      {regions.map((region) => (
                        <SelectItem key={region.id} value={region.code}>
                          {region.flag_emoji} {region.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            {/* Receipt Upload */}
            <div className="space-y-2">
              <FormLabel>Receipt (optional)</FormLabel>
              {receiptFile ? (
                <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm flex-1 truncate">{receiptFile.name}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={removeFile}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : existingReceiptUrl ? (
                <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={existingReceiptUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex-1 truncate"
                  >
                    View existing receipt
                  </a>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <Button type="button" variant="outline" size="sm" asChild>
                      <span>Replace</span>
                    </Button>
                  </label>
                </div>
              ) : (
                <label className="flex items-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Click to upload receipt (max 5MB)
                  </span>
                </label>
              )}
            </div>

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

            {/* Shipment info */}
            {!isEditing && !shipmentId && (
              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                💡 This expense is not linked to a shipment. You can link expenses to shipments from the shipment details page.
              </p>
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