import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { useCustomerPayments } from '@/hooks/useCustomerPayments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { CreditCard, Receipt, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { useExchangeRatesMap } from '@/hooks/useExchangeRates';

const statusConfig: Record<string, { icon: typeof CheckCircle; className: string; label: string }> = {
  completed: { icon: CheckCircle, className: 'bg-green-100 text-green-800 border-green-200', label: 'Completed' },
  pending: { icon: Clock, className: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Pending' },
  failed: { icon: XCircle, className: 'bg-red-100 text-red-800 border-red-200', label: 'Failed' },
};

const verificationConfig: Record<string, { icon: typeof CheckCircle; className: string; label: string }> = {
  verified: { icon: CheckCircle, className: 'bg-green-100 text-green-800 border-green-200', label: 'Verified' },
  pending: { icon: Clock, className: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Pending Verification' },
  rejected: { icon: XCircle, className: 'bg-red-100 text-red-800 border-red-200', label: 'Rejected' },
};

const paymentMethodLabels: Record<string, string> = {
  card: 'Credit Card',
  bank_transfer: 'Bank Transfer',
  cash: 'Cash',
  mobile_money: 'Mobile Money',
};

export default function CustomerPayments() {
  const { data: payments, isLoading } = useCustomerPayments();
  const { getRate } = useExchangeRatesMap();

  const formatTZS = (amount: number) => {
    return `TZS ${amount.toLocaleString('en-TZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const convertToTZS = (amount: number, currency: string) => {
    const rate = getRate(currency);
    return amount * rate;
  };

  const totalPaidTZS = payments?.reduce((sum, p) => {
    if (p.status === 'completed' && p.verification_status === 'verified') {
      const currency = p.currency || 'TZS';
      return sum + convertToTZS(p.amount, currency);
    }
    return sum;
  }, 0) || 0;

  const pendingVerificationCount = payments?.filter(p => p.verification_status === 'pending').length || 0;

  return (
    <CustomerLayout 
      title="Payments" 
      subtitle="View your payment history"
    >
      <div className="space-y-6">
        {/* Summary Card */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Verified Payments (TZS)</CardDescription>
              <CardTitle className="text-2xl text-green-600">
                {formatTZS(totalPaidTZS)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Transactions</CardDescription>
              <CardTitle className="text-2xl">
                {payments?.length || 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className={pendingVerificationCount > 0 ? 'border-amber-200 bg-amber-50/50 dark:bg-amber-900/10' : ''}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                {pendingVerificationCount > 0 && <AlertCircle className="h-3 w-3 text-amber-600" />}
                Pending Verification
              </CardDescription>
              <CardTitle className={`text-2xl ${pendingVerificationCount > 0 ? 'text-amber-600' : ''}`}>
                {pendingVerificationCount}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Payment History
            </CardTitle>
            <CardDescription>
              All your payments and their verification status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : payments && payments.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Verification</TableHead>
                      <TableHead className="text-right">Amount (TZS)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => {
                      const status = payment.status || 'pending';
                      const verification = payment.verification_status || 'pending';
                      const StatusIcon = statusConfig[status]?.icon || Clock;
                      const VerificationIcon = verificationConfig[verification]?.icon || Clock;
                      const currency = payment.currency || 'TZS';
                      const amountInTZS = convertToTZS(payment.amount, currency);
                      
                      return (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {payment.paid_at 
                              ? format(new Date(payment.paid_at), 'MMM d, yyyy')
                              : '—'
                            }
                          </TableCell>
                          <TableCell className="font-medium">
                            {payment.invoice?.invoice_number || '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-muted-foreground" />
                              {paymentMethodLabels[payment.payment_method] || payment.payment_method}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={statusConfig[status]?.className || ''}
                            >
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig[status]?.label || status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={verificationConfig[verification]?.className || ''}
                            >
                              <VerificationIcon className="h-3 w-3 mr-1" />
                              {verificationConfig[verification]?.label || verification}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div>
                              <span className="font-semibold">{formatTZS(amountInTZS)}</span>
                              {currency !== 'TZS' && (
                                <p className="text-xs text-muted-foreground">
                                  {currency} {payment.amount.toFixed(2)}
                                </p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No payments yet</h3>
                <p className="text-muted-foreground">
                  Your payment history will appear here once you make a payment.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CustomerLayout>
  );
}
