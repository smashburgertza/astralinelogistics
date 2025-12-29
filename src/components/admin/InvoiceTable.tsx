import { useState, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, FileText, Download, Eye, CheckCircle, XCircle, Clock, AlertCircle, Pencil } from 'lucide-react';
import { Invoice, useUpdateInvoiceStatus, useRecordPayment, RecordPaymentParams } from '@/hooks/useInvoices';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { InvoicePDFPreview } from './InvoicePDFPreview';
import { InvoiceDetailDialog } from './InvoiceDetailDialog';
import { RecordPaymentDialog, PaymentDetails } from './RecordPaymentDialog';
import { EditInvoiceDialog } from './EditInvoiceDialog';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { useRegions } from '@/hooks/useRegions';
import { format } from 'date-fns';
import { useReactToPrint } from 'react-to-print';

interface InvoiceTableProps {
  invoices?: Invoice[];
  isLoading: boolean;
}

export function InvoiceTable({ invoices, isLoading }: InvoiceTableProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [invoiceForPayment, setInvoiceForPayment] = useState<Invoice | null>(null);
  const updateStatus = useUpdateInvoiceStatus();
  const recordPayment = useRecordPayment();
  const printRef = useRef<HTMLDivElement>(null);
  const { data: regions = [] } = useRegions();

  const handleEditInvoice = (invoice: Invoice) => {
    setInvoiceToEdit(invoice);
    setEditOpen(true);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: selectedInvoice?.invoice_number || 'Invoice',
  });

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDetailOpen(true);
  };

  const handleDownloadPDF = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setTimeout(() => {
      handlePrint();
    }, 100);
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Shipment</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!invoices?.length) {
    return (
      <div className="rounded-lg border p-12 text-center">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No invoices found</h3>
        <p className="text-muted-foreground mt-1">Create your first invoice to get started</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Shipment</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => {
              const currencySymbol = CURRENCY_SYMBOLS[invoice.currency || 'USD'] || '$';
              const regionInfo = invoice.shipments?.origin_region
                ? regions.find(r => r.code === invoice.shipments?.origin_region)
                : null;
              const totalAmount = Number(invoice.amount || 0);
              const amountPaid = Number(invoice.amount_paid || 0);
              const isPartiallyPaid = amountPaid > 0 && amountPaid < totalAmount;

              return (
                <TableRow 
                  key={invoice.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewInvoice(invoice)}
                >
                  <TableCell>
                    <span className="font-mono font-medium">{invoice.invoice_number}</span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {invoice.customers?.name || invoice.shipments?.customer_name || 'Unknown'}
                      </p>
                      {invoice.customers?.company_name && (
                        <p className="text-sm text-muted-foreground">{invoice.customers.company_name}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {invoice.shipments ? (
                      <div className="flex items-center gap-2">
                        {regionInfo && <span>{regionInfo.flag_emoji}</span>}
                        <span className="font-mono text-sm">{invoice.shipments.tracking_number}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">
                        {currencySymbol}{totalAmount.toFixed(2)}
                      </span>
                      {invoice.rate_per_kg && (
                        <p className="text-xs text-muted-foreground">
                          @ {currencySymbol}{Number(invoice.rate_per_kg).toFixed(2)}/kg
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className={amountPaid > 0 ? 'font-medium text-emerald-600' : 'text-muted-foreground'}>
                        {currencySymbol}{amountPaid.toFixed(2)}
                      </span>
                      {isPartiallyPaid && (
                        <Badge variant="outline" className="ml-2 text-xs bg-blue-50 text-blue-700 border-blue-200">
                          Partial
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={invoice.status || 'pending'} />
                  </TableCell>
                  <TableCell>
                    {invoice.due_date ? (
                      <span className={new Date(invoice.due_date) < new Date() && invoice.status !== 'paid' ? 'text-destructive' : ''}>
                        {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleViewInvoice(invoice);
                        }}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadPDF(invoice);
                        }}>
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </DropdownMenuItem>
                        {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleEditInvoice(invoice);
                          }}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit Invoice
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {invoice.status !== 'paid' && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            setInvoiceForPayment(invoice);
                            setPaymentDialogOpen(true);
                          }}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Record Payment
                          </DropdownMenuItem>
                        )}
                        {invoice.status !== 'pending' && invoice.status !== 'paid' && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            updateStatus.mutate({ id: invoice.id, status: 'pending' });
                          }}>
                            <Clock className="h-4 w-4 mr-2" />
                            Mark as Pending
                          </DropdownMenuItem>
                        )}
                        {invoice.status !== 'overdue' && invoice.status !== 'paid' && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            updateStatus.mutate({ id: invoice.id, status: 'overdue' });
                          }}>
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Mark as Overdue
                          </DropdownMenuItem>
                        )}
                        {invoice.status !== 'cancelled' && (
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              updateStatus.mutate({ id: invoice.id, status: 'cancelled' });
                            }}
                            className="text-destructive"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancel Invoice
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Invoice Detail Dialog */}
      <InvoiceDetailDialog
        invoice={selectedInvoice}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      {/* Hidden print container */}
      <div className="hidden">
        {selectedInvoice && <InvoicePDFPreview ref={printRef} invoice={selectedInvoice} />}
      </div>

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        invoice={invoiceForPayment}
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        isLoading={recordPayment.isPending}
        onRecordPayment={(details: PaymentDetails) => {
          recordPayment.mutate({
            invoiceId: details.invoiceId,
            amount: details.amount,
            paymentMethod: details.paymentMethod,
            depositAccountId: details.depositAccountId,
            paymentCurrency: details.paymentCurrency,
            paymentDate: details.paymentDate,
            reference: details.reference,
            notes: details.notes,
          }, {
            onSuccess: () => {
              setPaymentDialogOpen(false);
              setInvoiceForPayment(null);
            },
          });
        }}
      />

      {/* Edit Invoice Dialog */}
      {invoiceToEdit && (
        <EditInvoiceDialog
          invoice={invoiceToEdit}
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) setInvoiceToEdit(null);
          }}
        />
      )}
    </>
  );
}