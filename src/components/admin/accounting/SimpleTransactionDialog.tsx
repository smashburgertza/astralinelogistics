import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateJournalEntry, useChartOfAccounts, useBankAccounts } from '@/hooks/useAccounting';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { ArrowDownCircle, ArrowUpCircle, RefreshCw } from 'lucide-react';

interface SimpleTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TransactionType = 'income' | 'expense' | 'transfer';

const TRANSACTION_TYPES = [
  { 
    value: 'income' as TransactionType, 
    label: 'Money In (Income)', 
    icon: ArrowDownCircle,
    color: 'text-green-600',
    description: 'Payment received, sales, etc.'
  },
  { 
    value: 'expense' as TransactionType, 
    label: 'Money Out (Expense)', 
    icon: ArrowUpCircle,
    color: 'text-red-600',
    description: 'Bills, purchases, payments made'
  },
  { 
    value: 'transfer' as TransactionType, 
    label: 'Transfer', 
    icon: RefreshCw,
    color: 'text-blue-600',
    description: 'Move money between accounts'
  },
];

const EXPENSE_CATEGORIES = [
  { value: 'shipping', label: 'Shipping & Freight' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'rent', label: 'Rent & Lease' },
  { value: 'salaries', label: 'Salaries & Wages' },
  { value: 'supplies', label: 'Office Supplies' },
  { value: 'maintenance', label: 'Maintenance & Repairs' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'taxes', label: 'Taxes & Fees' },
  { value: 'other', label: 'Other Expense' },
];

const INCOME_CATEGORIES = [
  { value: 'shipping_revenue', label: 'Shipping Revenue' },
  { value: 'service_fee', label: 'Service Fees' },
  { value: 'handling_fee', label: 'Handling Fees' },
  { value: 'other_income', label: 'Other Income' },
];

export function SimpleTransactionDialog({ open, onOpenChange }: SimpleTransactionDialogProps) {
  const [transactionType, setTransactionType] = useState<TransactionType>('income');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('TZS');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [notes, setNotes] = useState('');

  const { data: accounts = [] } = useChartOfAccounts({ active: true });
  const { data: bankAccounts = [] } = useBankAccounts();
  const { data: exchangeRates = [] } = useExchangeRates();
  const createEntry = useCreateJournalEntry();

  // Find appropriate accounts for auto-entry
  const cashAccounts = accounts.filter(a => a.account_type === 'asset' && a.account_subtype?.toLowerCase().includes('cash'));
  const revenueAccounts = accounts.filter(a => a.account_type === 'revenue');
  const expenseAccounts = accounts.filter(a => a.account_type === 'expense');

  const exchangeRate = currency === 'TZS' ? 1 : exchangeRates.find(r => r.currency_code === currency)?.rate_to_tzs || 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    let debitAccountId: string;
    let creditAccountId: string;
    let entryDescription = description;

    const selectedBank = bankAccounts.find(b => b.id === bankAccountId);
    const bankChartAccountId = selectedBank?.chart_account_id;

    if (!bankChartAccountId && transactionType !== 'transfer') {
      // Use first cash account as fallback
      const fallbackCash = cashAccounts[0]?.id;
      if (!fallbackCash) {
        return; // Need at least one cash account
      }
    }

    if (transactionType === 'income') {
      // Debit Cash, Credit Revenue
      debitAccountId = bankChartAccountId || cashAccounts[0]?.id;
      creditAccountId = revenueAccounts.find(a => a.account_code.includes(category))?.id || revenueAccounts[0]?.id;
      if (!entryDescription) entryDescription = `Income: ${INCOME_CATEGORIES.find(c => c.value === category)?.label || category}`;
    } else if (transactionType === 'expense') {
      // Debit Expense, Credit Cash
      creditAccountId = bankChartAccountId || cashAccounts[0]?.id;
      debitAccountId = expenseAccounts.find(a => a.account_code.includes(category))?.id || expenseAccounts[0]?.id;
      if (!entryDescription) entryDescription = `Expense: ${EXPENSE_CATEGORIES.find(c => c.value === category)?.label || category}`;
    } else {
      // Transfer: Debit destination, Credit source
      debitAccountId = toAccountId;
      creditAccountId = bankChartAccountId || cashAccounts[0]?.id;
      if (!entryDescription) entryDescription = 'Transfer between accounts';
    }

    if (!debitAccountId || !creditAccountId) return;

    const amountInTzs = numAmount * exchangeRate;

    createEntry.mutate({
      entry: {
        entry_date: date,
        description: entryDescription,
        reference_type: transactionType,
        reference_id: null,
        status: 'posted', // Auto-post for simple transactions
        posted_at: new Date().toISOString(),
        posted_by: null,
        created_by: null,
        notes: notes || null,
      },
      lines: [
        {
          account_id: debitAccountId,
          description: entryDescription,
          debit_amount: numAmount,
          credit_amount: 0,
          currency,
          exchange_rate: exchangeRate,
          amount_in_tzs: amountInTzs,
        },
        {
          account_id: creditAccountId,
          description: entryDescription,
          debit_amount: 0,
          credit_amount: numAmount,
          currency,
          exchange_rate: exchangeRate,
          amount_in_tzs: amountInTzs,
        },
      ],
    }, {
      onSuccess: () => {
        onOpenChange(false);
        resetForm();
      },
    });
  };

  const resetForm = () => {
    setTransactionType('income');
    setDate(new Date().toISOString().split('T')[0]);
    setAmount('');
    setCurrency('USD');
    setCategory('');
    setDescription('');
    setBankAccountId('');
    setToAccountId('');
    setNotes('');
  };

  const categories = transactionType === 'income' ? INCOME_CATEGORIES : 
                     transactionType === 'expense' ? EXPENSE_CATEGORIES : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Transaction</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Transaction Type Selection */}
          <div className="space-y-2">
            <Label>Transaction Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {TRANSACTION_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setTransactionType(type.value)}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    transactionType === type.value
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <type.icon className={`h-5 w-5 mx-auto mb-1 ${type.color}`} />
                  <span className="text-xs font-medium">{type.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="flex gap-2">
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="flex-1"
                />
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="TZS">TZS</SelectItem>
                    {exchangeRates.map((rate) => (
                      <SelectItem key={rate.currency_code} value={rate.currency_code}>
                        {rate.currency_code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {transactionType !== 'transfer' && (
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>
              {transactionType === 'transfer' ? 'From Account' : 'Bank Account'}
            </Label>
            <Select value={bankAccountId} onValueChange={setBankAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.filter(b => b.is_active).map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.account_name} ({account.bank_name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {transactionType === 'transfer' && (
            <div className="space-y-2">
              <Label>To Account</Label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {cashAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_code} - {account.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this for?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createEntry.isPending}>
              {createEntry.isPending ? 'Saving...' : 'Save Transaction'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
