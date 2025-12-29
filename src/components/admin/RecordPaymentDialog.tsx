import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBankAccounts } from '@/hooks/useAccounting';
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
  remainingBalance?: number;
  /** If true, this is an outgoing payment (we pay someone) vs receiving payment */
  isOutgoingPayment?: boolean;
  /** Name to display instead of customer (e.g., "Agent") */
  payeeName?: string;
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
  isLoading,
  remainingBalance,
  isOutgoingPayment = false,
  payeeName,
}: RecordPaymentDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [depositAccountId, setDepositAccountId] = useState('');
  const [paymentCurrency, setPaymentCurrency] = useState('TZS');
  const [amountInPaymentCurrency, setAmountInPaymentCurrency] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  // Get bank accounts for deposit selection
  const { data: bankAccounts = [] } = useBankAccounts();
  const { data: exchangeRates = [] } = useExchangeRates();

  // Filter to active bank accounts
  const activeBankAccounts = bankAccounts.filter(a => a.is_active);

  const invoiceCurrency = invoice?.currency || 'USD';
  const invoiceAmount = Number(invoice?.amount || 0);
  const amountPaid = Number(invoice?.amount_paid || 0);
  const balance = remainingBalance !== undefined ? remainingBalance : invoiceAmount - amountPaid;
  const currencySymbol = CURRENCY_SYMBOLS[invoiceCurrency] || '$';
  const paymentCurrencySymbol = CURRENCY_SYMBOLS[paymentCurrency] || paymentCurrency;

  // Get exchange rate for the invoice currency to TZS
  const invoiceCurrencyRate = exchangeRates.find(r => r.currency_code === invoiceCurrency)?.rate_to_tzs || 1;
  const paymentCurrencyRate = paymentCurrency === 'TZS' ? 1 : (exchangeRates.find(r => r.currency_code === paymentCurrency)?.rate_to_tzs || 1);
  
  // Calculate the balance in TZS, then convert to payment currency
  const balanceInTZS = balance * invoiceCurrencyRate;
  const balanceInPaymentCurrency = paymentCurrencyRate > 0 ? balanceInTZS / paymentCurrencyRate : balanceInTZS;
  
  // Calculate how much of the invoice currency is being paid
  const paymentAmountNum = parseFloat(amountInPaymentCurrency) || 0;
  const amountInInvoiceCurrency = paymentCurrencyRate > 0 
    ? (paymentAmountNum * paymentCurrencyRate) / invoiceCurrencyRate 
    : paymentAmountNum;

  const isDifferentCurrency = paymentCurrency !== invoiceCurrency;

  // Reset form when invoice changes or dialog opens
  useEffect(() => {
    if (invoice && open) {
      // Default to TZS for payment (common local currency)
      setPaymentCurrency('TZS');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setReference('');
      setNotes('');
      setDepositAccountId('');
      setAmountInPaymentCurrency('');
    }
  }, [invoice, open, remainingBalance]);

  // Update amount when payment currency changes
  useEffect(() => {
    if (invoice && open && balance > 0) {
      const newBalanceInPaymentCurrency = paymentCurrencyRate > 0 
        ? (balance * invoiceCurrencyRate) / paymentCurrencyRate 
        : balance * invoiceCurrencyRate;
      setAmountInPaymentCurrency(newBalanceInPaymentCurrency.toFixed(2));
    }
  }, [paymentCurrency, invoice, open, balance, invoiceCurrencyRate, paymentCurrencyRate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invoice) return;

    // We record the payment in invoice currency for consistency
    onRecordPayment({
      invoiceId: invoice.id,
      amount: amountInInvoiceCurrency,
      paymentMethod,
      depositAccountId: depositAccountId || undefined,
      paymentCurrency,
      paymentDate,
      reference: reference || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isOutgoingPayment ? 'Record Outgoing Payment' : 'Record Payment'}</DialogTitle>
          <DialogDescription>
            {isOutgoingPayment 
              ? `Record payment to ${payeeName || 'agent'} for invoice ${invoice?.invoice_number}`
              : `Record payment for invoice ${invoice?.invoice_number}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Invoice Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Invoice Amount:</span>
              <span className="font-medium">
                {currencySymbol}{invoiceAmount.toFixed(2)} {invoice?.currency}
              </span>
            </div>
            {amountPaid > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Already Paid:</span>
                <span className="font-medium text-emerald-600">
                  {currencySymbol}{amountPaid.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm font-medium border-t pt-2">
              <span className="text-muted-foreground">
                {isOutgoingPayment ? 'Amount to Pay:' : 'Balance Due:'}
              </span>
              <span className={balance > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                {currencySymbol}{balance.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {isOutgoingPayment ? 'Pay To:' : 'Customer:'}
              </span>
              <span className="font-medium">
                {payeeName || invoice?.customers?.name || invoice?.shipments?.customer_name || 'Unknown'}
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

          {/* Deposit Account Selection */}
          <div className="space-y-2">
            <Label>{isOutgoingPayment ? 'Pay From Account' : 'Deposit To Account'}</Label>
            <Select value={depositAccountId} onValueChange={setDepositAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select bank account" />
              </SelectTrigger>
              <SelectContent>
                {activeBankAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.bank_name} - {account.account_name} ({account.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeBankAccounts.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No bank accounts configured. Add bank accounts in Accounting settings.
              </p>
            )}
          </div>

          {/* Payment Currency */}
          <div className="space-y-2">
            <Label>Payment Currency</Label>
            <Select value={paymentCurrency} onValueChange={setPaymentCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TZS">TZS - Tanzanian Shilling</SelectItem>
                <SelectItem value="USD">USD - US Dollar</SelectItem>
                {exchangeRates.filter(r => r.currency_code !== 'USD' && r.currency_code !== 'TZS').map((rate) => (
                  <SelectItem key={rate.currency_code} value={rate.currency_code}>
                    {rate.currency_code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Exchange Rate Info */}
          {isDifferentCurrency && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-blue-700 dark:text-blue-300">Exchange Rate:</span>
                <span className="font-medium text-blue-800 dark:text-blue-200">
                  1 {invoiceCurrency} = {invoiceCurrencyRate.toLocaleString()} TZS
                </span>
              </div>
              {paymentCurrency !== 'TZS' && (
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700 dark:text-blue-300">Payment Currency Rate:</span>
                  <span className="font-medium text-blue-800 dark:text-blue-200">
                    1 {paymentCurrency} = {paymentCurrencyRate.toLocaleString()} TZS
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t border-blue-200 dark:border-blue-700 pt-2">
                <span className="text-blue-700 dark:text-blue-300">Balance in {paymentCurrency}:</span>
                <span className="font-bold text-blue-800 dark:text-blue-200">
                  {paymentCurrencySymbol}{balanceInPaymentCurrency.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {/* Amount in Payment Currency */}
          <div className="space-y-2">
            <Label>
              {isOutgoingPayment ? 'Amount to Pay' : 'Amount Received'} ({paymentCurrency})
            </Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amountInPaymentCurrency}
              onChange={(e) => setAmountInPaymentCurrency(e.target.value)}
              required
            />
            {isDifferentCurrency && paymentAmountNum > 0 && (
              <p className="text-xs text-muted-foreground">
                ≈ {currencySymbol}{amountInInvoiceCurrency.toFixed(2)} {invoiceCurrency}
                {amountInInvoiceCurrency < balance && ' (partial payment)'}
              </p>
            )}
            {!isDifferentCurrency && paymentAmountNum < balance && paymentAmountNum > 0 && (
              <p className="text-xs text-blue-600">This will be a partial payment</p>
            )}
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
            <Button type="submit" disabled={isLoading || paymentAmountNum <= 0}>
              {isLoading ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}