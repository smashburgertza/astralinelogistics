import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateJournalEntry, useChartOfAccounts, useBankAccounts } from '@/hooks/useAccounting';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { ArrowDownCircle, ArrowUpCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { formatAmount } from '@/components/shared/CurrencyDisplay';

export interface SimpleTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedAccountId?: string;
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

export function SimpleTransactionDialog({ open, onOpenChange, preselectedAccountId }: SimpleTransactionDialogProps) {
  const [transactionType, setTransactionType] = useState<TransactionType>('income');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('TZS');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [notes, setNotes] = useState('');
  
  // Transfer-specific state
  const [destinationAmount, setDestinationAmount] = useState('');
  const [destinationCurrency, setDestinationCurrency] = useState('TZS');

  const { data: accounts = [] } = useChartOfAccounts({ active: true });
  const { data: bankAccounts = [] } = useBankAccounts();
  const { data: exchangeRates = [] } = useExchangeRates();
  const createEntry = useCreateJournalEntry();

  // Find appropriate accounts for auto-entry
  const cashAccounts = accounts.filter(a => a.account_type === 'asset' && a.account_subtype?.toLowerCase().includes('cash'));
  const revenueAccounts = accounts.filter(a => a.account_type === 'revenue');
  const expenseAccounts = accounts.filter(a => a.account_type === 'expense');

  const exchangeRate = currency === 'TZS' ? 1 : exchangeRates.find(r => r.currency_code === currency)?.rate_to_tzs || 1;
  const destinationExchangeRate = destinationCurrency === 'TZS' ? 1 : exchangeRates.find(r => r.currency_code === destinationCurrency)?.rate_to_tzs || 1;

  // Get selected bank accounts for transfer
  const fromBankAccount = bankAccounts.find(b => b.id === bankAccountId);
  const toBankAccount = bankAccounts.find(b => b.id === toAccountId);

  // Auto-calculate destination amount when source amount or currencies change
  useEffect(() => {
    if (transactionType === 'transfer' && amount) {
      const numAmount = parseFloat(amount);
      if (!isNaN(numAmount) && numAmount > 0) {
        // Convert source to TZS, then to destination currency
        const amountInTzs = numAmount * exchangeRate;
        const convertedAmount = amountInTzs / destinationExchangeRate;
        setDestinationAmount(convertedAmount.toFixed(2));
      }
    }
  }, [amount, currency, destinationCurrency, exchangeRate, destinationExchangeRate, transactionType]);

  // Update destination currency when selecting destination bank account
  useEffect(() => {
    if (toBankAccount?.currency) {
      setDestinationCurrency(toBankAccount.currency);
    }
  }, [toBankAccount]);

  // Update source currency when selecting source bank account
  useEffect(() => {
    if (fromBankAccount?.currency) {
      setCurrency(fromBankAccount.currency);
    }
  }, [fromBankAccount]);

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
      // Transfer between bank accounts
      const toBank = bankAccounts.find(b => b.id === toAccountId);
      const fromBank = bankAccounts.find(b => b.id === bankAccountId);
      
      if (!toBank?.chart_account_id || !fromBank?.chart_account_id) return;
      
      debitAccountId = toBank.chart_account_id;
      creditAccountId = fromBank.chart_account_id;
      
      if (!entryDescription) {
        entryDescription = `Transfer: ${fromBank.account_name} → ${toBank.account_name}`;
      }

      // For multi-currency transfers, create journal entry with both currencies
      const numDestAmount = parseFloat(destinationAmount);
      if (isNaN(numDestAmount) || numDestAmount <= 0) return;

      const sourceAmountInTzs = numAmount * exchangeRate;
      const destAmountInTzs = numDestAmount * destinationExchangeRate;

      createEntry.mutate({
        entry: {
          entry_date: date,
          description: entryDescription,
          reference_type: 'transfer',
          reference_id: null,
          status: 'posted',
          posted_at: new Date().toISOString(),
          posted_by: null,
          created_by: null,
          notes: notes || null,
        },
        lines: [
          {
            account_id: debitAccountId,
            description: `Received from ${fromBank.account_name}`,
            debit_amount: numDestAmount,
            credit_amount: 0,
            currency: destinationCurrency,
            exchange_rate: destinationExchangeRate,
            amount_in_tzs: destAmountInTzs,
          },
          {
            account_id: creditAccountId,
            description: `Transferred to ${toBank.account_name}`,
            debit_amount: 0,
            credit_amount: numAmount,
            currency: currency,
            exchange_rate: exchangeRate,
            amount_in_tzs: sourceAmountInTzs,
          },
        ],
      }, {
        onSuccess: () => {
          onOpenChange(false);
          resetForm();
        },
      });
      return;
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
    setCurrency('TZS');
    setCategory('');
    setDescription('');
    setBankAccountId('');
    setToAccountId('');
    setNotes('');
    setDestinationAmount('');
    setDestinationCurrency('TZS');
  };

  const categories = transactionType === 'income' ? INCOME_CATEGORIES : 
                     transactionType === 'expense' ? EXPENSE_CATEGORIES : [];

  // Filter bank accounts for transfers (exclude already selected)
  const availableFromAccounts = bankAccounts.filter(b => b.is_active);
  const availableToAccounts = bankAccounts.filter(b => b.is_active && b.id !== bankAccountId);

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
            {transactionType !== 'transfer' && (
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
                      <SelectItem value="TZS">TZS</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      {exchangeRates.filter(r => !['TZS', 'USD'].includes(r.currency_code)).map((rate) => (
                        <SelectItem key={rate.currency_code} value={rate.currency_code}>
                          {rate.currency_code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
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

          {transactionType !== 'transfer' && (
            <div className="space-y-2">
              <Label>Bank Account</Label>
              <Select value={bankAccountId} onValueChange={setBankAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.filter(b => b.is_active).map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_name} ({account.bank_name}) - {account.currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {transactionType === 'transfer' && (
            <>
              {/* From Account */}
              <div className="space-y-2">
                <Label>From Account</Label>
                <Select value={bankAccountId} onValueChange={setBankAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source account" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFromAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex justify-between items-center gap-2">
                          <span>{account.account_name} ({account.currency})</span>
                          <span className="text-muted-foreground text-xs">
                            Bal: {formatAmount(account.current_balance || 0, account.currency || 'TZS')}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Source Amount */}
              <div className="space-y-2">
                <Label>Amount to Transfer</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="flex-1"
                  />
                  <div className="flex items-center px-3 bg-muted rounded-md border min-w-[80px] justify-center">
                    <span className="text-sm font-medium">{fromBankAccount?.currency || 'TZS'}</span>
                  </div>
                </div>
                {fromBankAccount && (
                  <p className="text-xs text-muted-foreground">
                    Available: {formatAmount(fromBankAccount.current_balance || 0, fromBankAccount.currency || 'TZS')}
                  </p>
                )}
              </div>

              {/* Visual Arrow */}
              <div className="flex justify-center py-2">
                <ArrowRight className="h-6 w-6 text-muted-foreground" />
              </div>

              {/* To Account */}
              <div className="space-y-2">
                <Label>To Account</Label>
                <Select value={toAccountId} onValueChange={setToAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination account" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableToAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex justify-between items-center gap-2">
                          <span>{account.account_name} ({account.currency})</span>
                          <span className="text-muted-foreground text-xs">
                            Bal: {formatAmount(account.current_balance || 0, account.currency || 'TZS')}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Destination Amount (calculated, but editable) */}
              <div className="space-y-2">
                <Label>Amount Received</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={destinationAmount}
                    onChange={(e) => setDestinationAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="flex-1"
                  />
                  <div className="flex items-center px-3 bg-muted rounded-md border min-w-[80px] justify-center">
                    <span className="text-sm font-medium">{toBankAccount?.currency || destinationCurrency}</span>
                  </div>
                </div>
                {currency !== (toBankAccount?.currency || destinationCurrency) && amount && (
                  <p className="text-xs text-muted-foreground">
                    Rate: 1 {currency} = {(exchangeRate / destinationExchangeRate).toFixed(4)} {toBankAccount?.currency || destinationCurrency}
                    <span className="ml-2 text-amber-600">(editable if bank rate differs)</span>
                  </p>
                )}
              </div>
            </>
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
