import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Calendar, Package, CheckCircle, Clock, Download } from 'lucide-react';
import { useCustomerInvoices } from '@/hooks/useCustomerPortal';
import { format } from 'date-fns';

export default function CustomerInvoicesPage() {
  const { data: invoices, isLoading } = useCustomerInvoices();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Paid</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">Pending</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Overdue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <CustomerLayout title="Invoices" subtitle="View and manage your invoices">
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : !invoices?.length ? (
        <Card className="shadow-lg border-0">
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No invoices yet</h3>
            <p className="text-muted-foreground">
              Your invoices will appear here once you have shipments.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => {
            const shipment = invoice.shipments as { tracking_number: string } | null;
            const isPaid = invoice.status === 'paid';

            return (
              <Card key={invoice.id} className="shadow-lg border-0 overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    {/* Status indicator */}
                    <div className={`w-full md:w-2 ${
                      invoice.status === 'paid' ? 'bg-green-500' :
                      invoice.status === 'overdue' ? 'bg-red-500' :
                      'bg-amber-500'
                    }`} />

                    <div className="flex-1 p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            isPaid ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'
                          }`}>
                            {isPaid ? (
                              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                            ) : (
                              <FileText className="w-6 h-6 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <span className="font-bold text-lg">{invoice.invoice_number}</span>
                              {getStatusBadge(invoice.status || 'pending')}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                              {shipment && (
                                <span className="flex items-center gap-1">
                                  <Package className="h-3 w-3" />
                                  {shipment.tracking_number}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Created: {format(new Date(invoice.created_at || ''), 'MMM d, yyyy')}
                              </span>
                              {invoice.due_date && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Due: {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">
                              ${Number(invoice.amount).toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground uppercase">
                              {invoice.currency || 'USD'}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2">
                            {!isPaid && (
                              <Button size="sm">
                                Pay Now
                              </Button>
                            )}
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-1" />
                              PDF
                            </Button>
                          </div>
                        </div>
                      </div>

                      {invoice.notes && (
                        <p className="mt-4 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                          {invoice.notes}
                        </p>
                      )}

                      {isPaid && invoice.paid_at && (
                        <p className="mt-4 text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          Paid on {format(new Date(invoice.paid_at), 'MMM d, yyyy')}
                          {invoice.payment_method && ` via ${invoice.payment_method}`}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </CustomerLayout>
  );
}
