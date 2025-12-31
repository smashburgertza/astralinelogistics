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
import {
  Banknote,
  CreditCard,
  Smartphone,
  Building2,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarkPaymentDialogProps {
  invoice: {
    id: string;
    invoice_number: string;
    amount: number;
    currency: string;
    status: string;
    due_date?: string | null;
    created_at: string;
    shipment?: {
      tracking_number: string;
      total_weight_kg: number;
    } | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMarkPayment: (data: MarkPaymentData) => void;
  isLoading?: boolean;
}

export interface MarkPaymentData {
  invoiceId: string;
  paymentMethod: string;
  paymentReference: string;
  paymentDate: string;
  bankName?: string;
  accountNumber?: string;
  notes?: string;
}

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building2, description: 'Direct bank transfer' },
  { value: 'mobile_money', label: 'Mobile Money', icon: Smartphone, description: 'M-Pesa, Tigo Pesa, etc.' },
  { value: 'cash', label: 'Cash', icon: Banknote, description: 'Physical cash payment' },
  { value: 'card', label: 'Card Payment', icon: CreditCard, description: 'Debit or credit card' },
];

export function MarkPaymentDialog({
  invoice,
  open,
  onOpenChange,
  onMarkPayment,
  isLoading,
}: MarkPaymentDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Reset form when dialog opens
  useEffect(() => {
    if (open && invoice) {
      setPaymentMethod('bank_transfer');
      setPaymentReference('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setBankName('');
      setAccountNumber('');
      setNotes('');
    }
  }, [open, invoice]);

  if (!invoice) return null;

  const currencySymbol = CURRENCY_SYMBOLS[invoice.currency] || invoice.currency;
  const isDueSoon = invoice.due_date && new Date(invoice.due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paymentReference.trim()) {
      return;
    }

    onMarkPayment({
      invoiceId: invoice.id,
      paymentMethod,
      paymentReference: paymentReference.trim(),
      paymentDate,
      bankName: bankName.trim() || undefined,
      accountNumber: accountNumber.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  const selectedMethod = PAYMENT_METHODS.find(m => m.value === paymentMethod);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            Mark Payment Received
          </DialogTitle>
          <DialogDescription>
            Confirm that you have received payment from Astraline for this invoice.
            Your payment will be verified by the admin team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Invoice Summary */}
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Invoice</p>
                <p className="text-lg font-bold font-mono">{invoice.invoice_number}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Amount</p>
                <p className="text-2xl font-bold text-primary">
                  {currencySymbol}{invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Invoice Date</p>
                <p className="font-medium">{format(new Date(invoice.created_at), 'dd MMM yyyy')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Due Date</p>
                <div className="flex items-center gap-2">
                  <p className={cn(
                    "font-medium",
                    isOverdue && "text-red-600",
                    isDueSoon && !isOverdue && "text-amber-600"
                  )}>
                    {invoice.due_date ? format(new Date(invoice.due_date), 'dd MMM yyyy') : 'Not set'}
                  </p>
                  {isOverdue && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
                  {isDueSoon && !isOverdue && <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">Due Soon</Badge>}
                </div>
              </div>
              {invoice.shipment && (
                <>
                  <div>
                    <p className="text-muted-foreground">Shipment</p>
                    <p className="font-mono font-medium">{invoice.shipment.tracking_number}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Weight</p>
                    <p className="font-medium">{invoice.shipment.total_weight_kg} kg</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Payment Method</Label>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setPaymentMethod(method.value)}
                  className={cn(
                    "p-4 rounded-xl border-2 text-left transition-all",
                    paymentMethod === method.value
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      paymentMethod === method.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}>
                      <method.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{method.label}</p>
                      <p className="text-xs text-muted-foreground">{method.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Payment Details */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Payment Details</Label>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Payment Date
                </Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentReference" className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Transaction Reference *
                </Label>
                <Input
                  id="paymentReference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g., TXN123456789"
                  required
                />
              </div>
            </div>

            {/* Bank Details - Show for bank transfer */}
            {paymentMethod === 'bank_transfer' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border border-dashed">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g., CRDB Bank"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number (last 4 digits)</Label>
                  <Input
                    id="accountNumber"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g., ****1234"
                    maxLength={10}
                  />
                </div>
              </div>
            )}

            {/* Mobile Money Details */}
            {paymentMethod === 'mobile_money' && (
              <div className="p-4 bg-muted/30 rounded-lg border border-dashed">
                <div className="space-y-2">
                  <Label htmlFor="mobileProvider">Mobile Money Provider</Label>
                  <Select value={bankName} onValueChange={setBankName}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M-Pesa">M-Pesa (Vodacom)</SelectItem>
                      <SelectItem value="Tigo Pesa">Tigo Pesa</SelectItem>
                      <SelectItem value="Airtel Money">Airtel Money</SelectItem>
                      <SelectItem value="Halopesa">Halopesa</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional information about this payment..."
                rows={3}
              />
            </div>
          </div>

          {/* Info Alert */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-800 dark:text-blue-200">Verification Required</p>
              <p className="text-blue-700 dark:text-blue-300 mt-1">
                Your payment confirmation will be reviewed by our team. Once verified, the invoice
                will be marked as paid and reflected in your account.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !paymentReference.trim()}>
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Payment Received
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
