import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { useBankAccounts } from '@/hooks/useAccounting';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import {
  CheckCircle,
  XCircle,
  Building2,
  AlertTriangle,
  User,
  FileText,
  Calendar,
  Banknote,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentToVerify {
  id: string;
  invoice_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  paid_at: string;
  stripe_payment_id: string | null;
  invoices: {
    id: string;
    invoice_number: string;
    amount: number;
    currency: string;
    agent_id: string | null;
    customer_id: string | null;
    invoice_direction: 'from_agent' | 'to_agent';
  };
  agent?: {
    full_name: string | null;
    company_name: string | null;
    agent_code: string | null;
  } | null;
  customer?: {
    name: string;
    company_name?: string | null;
  } | null;
  payer_type: 'agent' | 'customer';
}

interface VerifyPaymentDialogProps {
  payment: PaymentToVerify | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerify: (data: VerifyPaymentData) => void;
  onReject: (data: { paymentId: string; invoiceId: string; reason?: string }) => void;
  isLoading?: boolean;
}

export interface VerifyPaymentData {
  paymentId: string;
  invoiceId: string;
  depositAccountId: string;
  amount: number;
  currency: string;
  invoiceNumber: string;
  amountInTzs?: number;
  exchangeRate?: number;
  isAgentPayment: boolean;
  notes?: string;
}

export function VerifyPaymentDialog({
  payment,
  open,
  onOpenChange,
  onVerify,
  onReject,
  isLoading,
}: VerifyPaymentDialogProps) {
  const [depositAccountId, setDepositAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const { data: bankAccounts = [] } = useBankAccounts();
  const { data: exchangeRates = [] } = useExchangeRates();

  const activeBankAccounts = bankAccounts.filter(a => a.is_active);

  // Reset form when dialog opens
  useEffect(() => {
    if (open && payment) {
      setDepositAccountId('');
      setNotes('');
      setRejectReason('');
      setShowRejectForm(false);
    }
  }, [open, payment]);

  if (!payment) return null;

  const isAgentPayment = payment.invoices.invoice_direction === 'to_agent';
  const payerName = isAgentPayment
    ? payment.agent?.company_name || payment.agent?.full_name || 'Unknown Agent'
    : payment.customer?.company_name || payment.customer?.name || 'Unknown Customer';

  const invoiceCurrency = payment.invoices.currency || 'USD';
  const paymentCurrency = payment.currency || invoiceCurrency;
  const currencySymbol = CURRENCY_SYMBOLS[paymentCurrency] || paymentCurrency;
  
  // Get exchange rate
  const exchangeRate = exchangeRates.find(r => r.currency_code === paymentCurrency)?.rate_to_tzs || 1;
  const amountInTzs = payment.amount * exchangeRate;

  const handleVerify = () => {
    if (!depositAccountId) return;

    onVerify({
      paymentId: payment.id,
      invoiceId: payment.invoice_id,
      depositAccountId,
      amount: payment.amount,
      currency: paymentCurrency,
      invoiceNumber: payment.invoices.invoice_number,
      amountInTzs,
      exchangeRate,
      isAgentPayment,
      notes: notes.trim() || undefined,
    });
  };

  const handleReject = () => {
    onReject({
      paymentId: payment.id,
      invoiceId: payment.invoice_id,
      reason: rejectReason.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Verify Payment
          </DialogTitle>
          <DialogDescription>
            Review and verify this payment submission. Select the account to {isAgentPayment ? 'debit' : 'credit'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Summary */}
          <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Payment Amount</p>
                <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                  {currencySymbol}{payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                {paymentCurrency !== 'TZS' && (
                  <p className="text-sm text-muted-foreground">
                    ≈ TZS {amountInTzs.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                )}
              </div>
              <Badge className={cn(
                "text-sm px-3 py-1",
                isAgentPayment 
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
              )}>
                {isAgentPayment ? 'Agent Payment' : 'Customer Payment'}
              </Badge>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">{isAgentPayment ? 'Agent' : 'Customer'}</p>
                  <p className="font-semibold">{payerName}</p>
                  {payment.agent?.agent_code && (
                    <p className="text-xs text-muted-foreground">{payment.agent.agent_code}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Invoice</p>
                  <p className="font-mono font-semibold">{payment.invoices.invoice_number}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Payment Date</p>
                  <p className="font-medium">{format(new Date(payment.paid_at), 'dd MMM yyyy, HH:mm')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Payment Method</p>
                  <p className="font-medium capitalize">{payment.payment_method.replace('_', ' ')}</p>
                </div>
              </div>
            </div>

            {payment.stripe_payment_id && (
              <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Transaction Reference</p>
                <p className="font-mono text-sm break-all">{payment.stripe_payment_id}</p>
              </div>
            )}
          </div>

          {/* Action Forms */}
          {!showRejectForm ? (
            <div className="space-y-4">
              {/* Account Selection */}
              <div className="space-y-2">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {isAgentPayment ? 'Pay From Account (Debit)' : 'Deposit To Account (Credit)'}
                </Label>
                <p className="text-sm text-muted-foreground mb-2">
                  {isAgentPayment 
                    ? 'Select the bank account from which this payment was made to the agent'
                    : 'Select the bank account where this payment will be deposited'}
                </p>
                <Select value={depositAccountId} onValueChange={setDepositAccountId}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select bank account..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeBankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center justify-between w-full gap-4">
                          <span>{account.bank_name} - {account.account_name}</span>
                          <span className="text-muted-foreground text-sm">
                            {account.currency} {account.current_balance?.toLocaleString()}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Exchange Rate Info */}
              {paymentCurrency !== 'TZS' && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 space-y-2">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <ArrowRight className="h-4 w-4" />
                    <span className="font-medium">Currency Conversion</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Exchange Rate</p>
                      <p className="font-medium">1 {paymentCurrency} = {exchangeRate.toLocaleString()} TZS</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Amount in TZS</p>
                      <p className="font-bold">TZS {amountInTzs.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Verification Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this verification..."
                  rows={2}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">Rejecting Payment</p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    This will mark the payment as rejected. The {isAgentPayment ? 'agent' : 'customer'} will need to resubmit.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rejectReason">Reason for Rejection</Label>
                <Textarea
                  id="rejectReason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why this payment is being rejected..."
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 flex-col sm:flex-row">
          {!showRejectForm ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRejectForm(true)}
                disabled={isLoading}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <div className="flex-1" />
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleVerify}
                disabled={isLoading || !depositAccountId}
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Verify & Record
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRejectForm(false)}
                disabled={isLoading}
              >
                Back
              </Button>
              <div className="flex-1" />
              <Button
                type="button"
                variant="destructive"
                onClick={handleReject}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Confirm Rejection
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
