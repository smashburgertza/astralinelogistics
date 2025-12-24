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
import { CreditCard, Receipt, CheckCircle, Clock, XCircle } from 'lucide-react';

const statusConfig: Record<string, { icon: typeof CheckCircle; className: string }> = {
  completed: { icon: CheckCircle, className: 'bg-green-100 text-green-800 border-green-200' },
  pending: { icon: Clock, className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  failed: { icon: XCircle, className: 'bg-red-100 text-red-800 border-red-200' },
};

const paymentMethodLabels: Record<string, string> = {
  card: 'Credit Card',
  bank_transfer: 'Bank Transfer',
  cash: 'Cash',
  mobile_money: 'Mobile Money',
};

export default function CustomerPayments() {
  const { data: payments, isLoading } = useCustomerPayments();

  const totalPaid = payments?.reduce((sum, p) => 
    p.status === 'completed' ? sum + p.amount : sum, 0
  ) || 0;

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
              <CardDescription>Total Paid</CardDescription>
              <CardTitle className="text-2xl text-green-600">
                ${totalPaid.toFixed(2)}
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
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Last Payment</CardDescription>
              <CardTitle className="text-2xl">
                {payments?.[0]?.paid_at 
                  ? format(new Date(payments[0].paid_at), 'MMM d, yyyy')
                  : '—'
                }
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
              All your completed and pending payments
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
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => {
                      const status = payment.status || 'pending';
                      const StatusIcon = statusConfig[status]?.icon || Clock;
                      
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
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            ${payment.amount.toFixed(2)} {payment.currency?.toUpperCase()}
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
