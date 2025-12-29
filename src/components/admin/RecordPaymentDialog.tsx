import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useChartOfAccounts } from '@/hooks/useAccounting';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { Invoice } from '@/hooks/useInvoices';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { Banknote, CreditCard, Smartphone, Building2 } from 'lucide-react';

interface RecordPaymentDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecordPayment: (paymentDetails: PaymentDetails) => void;
  isLoading?: boolean;
}

export interface PaymentDetails {
  invoiceId: string;
  amount: number;
  paymentMethod: string;
  depositAccountId?: string;
  paymentCurrency: string;
  paymentDate: string;
  reference?: string;
  notes?: string;
}

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'mobile_money', label: 'Mobile Money', icon: Smartphone },
  { value: 'card', label: 'Card Payment', icon: CreditCard },
];

export function RecordPaymentDialog({ 
  invoice, 
  open, 
  onOpenChange, 
  onRecordPayment,
  isLoading 
}: RecordPaymentDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [depositAccountId, setDepositAccountId] = useState('');
  const [paymentCurrency, setPaymentCurrency] = useState(invoice?.currency || 'USD');
  const [amount, setAmount] = useState(invoice?.amount?.toString() || '');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  // Get all active asset accounts (cash, bank, mobile money accounts)
  const { data: accounts = [] } = useChartOfAccounts({ active: true });
  const { data: exchangeRates = [] } = useExchangeRates();

  // Filter to cash/bank type accounts
  const depositAccounts = accounts.filter(a => 
    a.account_type === 'asset' && 
    (a.account_subtype?.toLowerCase().includes('cash') || 
     a.account_subtype?.toLowerCase().includes('bank') ||
     a.account_code.startsWith('11')) // Cash and bank accounts typically start with 11
  );

  // Reset form when invoice changes
  useState(() => {
    if (invoice) {
      setAmount(invoice.amount?.toString() || '');
      setPaymentCurrency(invoice.currency || 'USD');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invoice) return;

    onRecordPayment({
      invoiceId: invoice.id,
      amount: parseFloat(amount),
      paymentMethod,
      depositAccountId: depositAccountId || undefined,
      paymentCurrency,
      paymentDate,
      reference: reference || undefined,
      notes: notes || undefined,
    });
  };

  const currencySymbol = CURRENCY_SYMBOLS[invoice?.currency || 'USD'] || '$';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record payment for invoice {invoice?.invoice_number}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Invoice Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Invoice Amount:</span>
              <span className="font-medium">
                {currencySymbol}{Number(invoice?.amount || 0).toFixed(2)} {invoice?.currency}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Customer:</span>
              <span className="font-medium">
                {invoice?.customers?.name || invoice?.shipments?.customer_name || 'Unknown'}
              </span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setPaymentMethod(method.value)}
                  className={`p-3 rounded-lg border text-left transition-all flex items-center gap-2 ${
                    paymentMethod === method.value
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <method.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{method.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Deposit Account Selection - Always show */}
          <div className="space-y-2">
            <Label>Deposit To Account</Label>
            <Select value={depositAccountId} onValueChange={setDepositAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {depositAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.account_code} - {account.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount and Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount Received</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={paymentCurrency} onValueChange={setPaymentCurrency}>
                <SelectTrigger>
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

          {/* Payment Date */}
          <div className="space-y-2">
            <Label>Payment Date</Label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
          </div>

          {/* Reference Number */}
          <div className="space-y-2">
            <Label>Reference / Transaction ID (optional)</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g., Bank reference, M-Pesa code"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional payment details..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
