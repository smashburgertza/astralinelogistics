import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CheckCircle,
  XCircle,
  Users,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { usePaymentsPendingVerification, useVerifyPayment } from '@/hooks/useAgentInvoices';
import { B2BInvoices } from '@/components/admin/B2BInvoices';
import { VerifyPaymentDialog, VerifyPaymentData } from '@/components/admin/VerifyPaymentDialog';

export default function SettlementsPage() {
  const [activeTab, setActiveTab] = useState('invoices');
  const { data: pendingVerifications, isLoading: verificationsLoading } = usePaymentsPendingVerification();
  const verifyPayment = useVerifyPayment();
  
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);

  const handleOpenVerify = (payment: any) => {
    setSelectedPayment(payment);
    setVerifyDialogOpen(true);
  };

  const handleVerify = (data: VerifyPaymentData) => {
    verifyPayment.mutate({
      paymentId: data.paymentId,
      status: 'verified',
      invoiceId: data.invoiceId,
      depositAccountId: data.depositAccountId,
      amount: data.amount,
      currency: data.currency,
      invoiceNumber: data.invoiceNumber,
      amountInTzs: data.amountInTzs,
      exchangeRate: data.exchangeRate,
      isAgentPayment: data.isAgentPayment,
      invoiceDirection: data.invoiceDirection,
    }, {
      onSuccess: () => {
        setVerifyDialogOpen(false);
        setSelectedPayment(null);
      },
    });
  };

  const handleReject = (data: { paymentId: string; invoiceId: string }) => {
    verifyPayment.mutate({
      paymentId: data.paymentId,
      status: 'rejected',
      invoiceId: data.invoiceId,
      isAgentPayment: selectedPayment?.invoices?.invoice_direction === 'to_agent',
    }, {
      onSuccess: () => {
        setVerifyDialogOpen(false);
        setSelectedPayment(null);
      },
    });
  };

  return (
    <AdminLayout title="B2B Agent" subtitle="Manage agent invoices and payment verification">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Agent Invoices
          </TabsTrigger>
          <TabsTrigger value="verification" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Verify Payments
            {pendingVerifications && pendingVerifications.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {pendingVerifications.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Agent Invoices Tab (B2B) */}
        <TabsContent value="invoices" className="space-y-6">
          <B2BInvoices />
        </TabsContent>

        {/* Payment Verification Tab */}
        <TabsContent value="verification" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Pending Payment Verifications
              </CardTitle>
              <CardDescription>
                Review and verify payments marked by agents and customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {verificationsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : pendingVerifications && pendingVerifications.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Payer</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingVerifications.map((payment: any) => {
                      const isAgentPayment = payment.invoices?.invoice_direction === 'to_agent';
                      const payerName = isAgentPayment
                        ? payment.agent?.company_name || payment.agent?.full_name || 'Unknown Agent'
                        : payment.customer?.company_name || payment.customer?.name || 'Unknown Customer';
                      
                      return (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono text-sm">
                            {payment.invoices?.invoice_number}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{payerName}</div>
                              {payment.agent?.agent_code && (
                                <div className="text-xs text-muted-foreground">
                                  {payment.agent.agent_code}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              isAgentPayment 
                                ? "bg-blue-50 text-blue-700 border-blue-200" 
                                : "bg-purple-50 text-purple-700 border-purple-200"
                            }>
                              {isAgentPayment ? 'Agent' : 'Customer'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {payment.currency} {payment.amount?.toLocaleString()}
                          </TableCell>
                          <TableCell className="capitalize">
                            {payment.payment_method?.replace('_', ' ')}
                          </TableCell>
                          <TableCell className="font-mono text-sm max-w-[150px] truncate">
                            {payment.stripe_payment_id || '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(payment.paid_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => handleOpenVerify(payment)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>No payments pending verification</p>
                  <p className="text-sm mt-1">
                    Agent and customer payments will appear here for your review
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Verify Payment Dialog */}
      <VerifyPaymentDialog
        payment={selectedPayment}
        open={verifyDialogOpen}
        onOpenChange={setVerifyDialogOpen}
        onVerify={handleVerify}
        onReject={handleReject}
        isLoading={verifyPayment.isPending}
      />
    </AdminLayout>
  );
}
