import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Wallet, AlertTriangle } from 'lucide-react';
import { useApproveExpenseWithBankAccount } from '@/hooks/useExpenses';
import { useBankAccounts } from '@/hooks/useAccounting';

interface ExpenseApproveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: {
    id: string;
    amount: number;
    currency: string | null;
    category: string;
    description: string | null;
  } | null;
}

export function ExpenseApproveDialog({
  open,
  onOpenChange,
  expense,
}: ExpenseApproveDialogProps) {
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('');
  const approveExpense = useApproveExpenseWithBankAccount();
  const { data: bankAccounts = [], isLoading: loadingBankAccounts } = useBankAccounts();

  const expenseCurrency = expense?.currency || 'TZS';
  
  // Filter bank accounts by currency matching the expense
  const matchingAccounts = useMemo(() => {
    return bankAccounts.filter(acc => acc.currency === expenseCurrency && acc.is_active);
  }, [bankAccounts, expenseCurrency]);

  const selectedAccount = matchingAccounts.find(acc => acc.id === selectedBankAccountId);
  const insufficientFunds = selectedAccount && (selectedAccount.current_balance || 0) < (expense?.amount || 0);

  const formatBalance = (amount: number, currency: string) => {
    return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleSubmit = () => {
    if (!expense || !selectedBankAccountId) return;

    approveExpense.mutate(
      { 
        expenseId: expense.id, 
        bankAccountId: selectedBankAccountId,
      },
      {
        onSuccess: () => {
          setSelectedBankAccountId('');
          onOpenChange(false);
        },
      }
    );
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedBankAccountId('');
    }
    onOpenChange(newOpen);
  };

  if (!expense) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Approve Expense</DialogTitle>
          <DialogDescription>
            Select the bank account to pay this expense from. The account balance will be deducted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Expense Summary */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-semibold">
                {formatBalance(expense.amount, expenseCurrency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Category:</span>
              <span className="capitalize">{expense.category}</span>
            </div>
            {expense.description && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Description:</span>
                <span className="text-right max-w-[200px] truncate">{expense.description}</span>
              </div>
            )}
          </div>

          {/* Bank Account Selection */}
          <div className="space-y-2">
            <Label htmlFor="bank-account">Pay From Bank Account *</Label>
            {loadingBankAccounts ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading accounts...
              </div>
            ) : matchingAccounts.length === 0 ? (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                No bank accounts found with {expenseCurrency} currency. Please create one first.
              </div>
            ) : (
              <Select
                value={selectedBankAccountId}
                onValueChange={setSelectedBankAccountId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a bank account" />
                </SelectTrigger>
                <SelectContent>
                  {matchingAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                        <span>{account.account_name}</span>
                        <span className="text-muted-foreground">-</span>
                        <span>{account.bank_name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Selected Account Balance */}
          {selectedAccount && (
            <div className={`rounded-lg border p-3 ${insufficientFunds ? 'border-destructive/50 bg-destructive/10' : 'border-primary/50 bg-primary/10'}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Balance:</span>
                <span className={`font-semibold ${insufficientFunds ? 'text-destructive' : 'text-primary'}`}>
                  {formatBalance(selectedAccount.current_balance || 0, selectedAccount.currency || expenseCurrency)}
                </span>
              </div>
              {insufficientFunds && (
                <p className="text-xs text-destructive mt-2">
                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                  Insufficient funds. Expense amount exceeds available balance.
                </p>
              )}
              {!insufficientFunds && (
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                  <span className="text-sm text-muted-foreground">Balance After:</span>
                  <span className="font-medium text-foreground">
                    {formatBalance((selectedAccount.current_balance || 0) - expense.amount, selectedAccount.currency || expenseCurrency)}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedBankAccountId || approveExpense.isPending || insufficientFunds}
            >
              {approveExpense.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Approve & Pay
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
