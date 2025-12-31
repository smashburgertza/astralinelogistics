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
} from 'lucide-react';
import { format } from 'date-fns';
import { usePaymentsPendingVerification, useVerifyPayment } from '@/hooks/useAgentInvoices';
import { B2BInvoices } from '@/components/admin/B2BInvoices';

export default function SettlementsPage() {
  const [activeTab, setActiveTab] = useState('invoices');
  const { data: pendingVerifications, isLoading: verificationsLoading } = usePaymentsPendingVerification();
  const verifyPayment = useVerifyPayment();

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
                Review and verify payments marked by agents
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
                      <TableHead>Agent</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingVerifications.map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-sm">
                          {payment.invoices?.invoice_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {payment.agent?.company_name || payment.agent?.full_name || 'Unknown'}
                            </div>
                            {payment.agent?.agent_code && (
                              <div className="text-xs text-muted-foreground">
                                {payment.agent.agent_code}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {payment.currency} {payment.amount?.toLocaleString()}
                        </TableCell>
                        <TableCell className="capitalize">
                          {payment.payment_method?.replace('_', ' ')}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {payment.stripe_payment_id || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(payment.paid_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => verifyPayment.mutate({
                                paymentId: payment.id,
                                status: 'rejected',
                                invoiceId: payment.invoice_id,
                                isAgentPayment: payment.invoices?.invoice_direction === 'to_agent',
                              })}
                              disabled={verifyPayment.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => verifyPayment.mutate({
                                paymentId: payment.id,
                                status: 'verified',
                                invoiceId: payment.invoice_id,
                                isAgentPayment: payment.invoices?.invoice_direction === 'to_agent',
                              })}
                              disabled={verifyPayment.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Verify
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>No payments pending verification</p>
                  <p className="text-sm mt-1">
                    Agent payments will appear here for your review
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
