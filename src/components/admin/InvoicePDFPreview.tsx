import { forwardRef } from 'react';
import { Invoice } from '@/hooks/useInvoices';
import { CURRENCY_SYMBOLS, REGIONS } from '@/lib/constants';
import { format } from 'date-fns';

interface InvoicePDFPreviewProps {
  invoice: Invoice;
}

export const InvoicePDFPreview = forwardRef<HTMLDivElement, InvoicePDFPreviewProps>(
  ({ invoice }, ref) => {
    const currencySymbol = CURRENCY_SYMBOLS[invoice.currency || 'USD'] || '$';
    const regionInfo = invoice.shipments?.origin_region
      ? REGIONS[invoice.shipments.origin_region as keyof typeof REGIONS]
      : null;

    return (
      <div
        ref={ref}
        className="bg-white p-8 max-w-[800px] mx-auto text-black"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-8 border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold text-primary">INVOICE</h1>
            <p className="text-muted-foreground mt-1">{invoice.invoice_number}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-semibold">Astra Shipping</h2>
            <p className="text-sm text-muted-foreground">Global Freight Solutions</p>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground uppercase mb-2">Bill To</h3>
            <p className="font-medium">{invoice.customers?.name}</p>
            {invoice.customers?.company_name && (
              <p className="text-muted-foreground">{invoice.customers.company_name}</p>
            )}
            {(invoice.customers as any)?.address && (
              <p className="text-sm text-muted-foreground">{(invoice.customers as any).address}</p>
            )}
            {(invoice.customers as any)?.email && (
              <p className="text-sm text-muted-foreground">{(invoice.customers as any).email}</p>
            )}
          </div>
          <div className="text-right">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice Date:</span>
                <span>{format(new Date(invoice.created_at || new Date()), 'MMM dd, yyyy')}</span>
              </div>
              {invoice.due_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due Date:</span>
                  <span>{format(new Date(invoice.due_date), 'MMM dd, yyyy')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className={invoice.status === 'paid' ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
                  {invoice.status?.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Shipment Details */}
        {invoice.shipments && (
          <div className="mb-8 p-4 bg-muted/30 rounded-lg">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase mb-2">Shipment Details</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Tracking:</span>
                <p className="font-mono font-medium">{invoice.shipments.tracking_number}</p>
              </div>
              {regionInfo && (
                <div>
                  <span className="text-muted-foreground">Origin:</span>
                  <p className="font-medium">{regionInfo.flag} {regionInfo.label}</p>
                </div>
              )}
              {invoice.shipments.total_weight_kg && (
                <div>
                  <span className="text-muted-foreground">Weight:</span>
                  <p className="font-medium">{invoice.shipments.total_weight_kg} kg</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Line Items */}
        <table className="w-full mb-8">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 text-muted-foreground text-sm">Description</th>
              <th className="text-right py-3 text-muted-foreground text-sm">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-4">
                Shipping Services
                {invoice.shipments?.description && (
                  <p className="text-sm text-muted-foreground mt-1">{invoice.shipments.description}</p>
                )}
              </td>
              <td className="text-right py-4 font-medium">
                {currencySymbol}{Number(invoice.amount).toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Total */}
        <div className="flex justify-end mb-8">
          <div className="w-64">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{currencySymbol}{Number(invoice.amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-3 text-lg font-bold">
              <span>Total</span>
              <span>{currencySymbol}{Number(invoice.amount).toFixed(2)} {invoice.currency}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="border-t pt-6">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase mb-2">Notes</h3>
            <p className="text-sm">{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t text-center text-sm text-muted-foreground">
          <p>Thank you for your business!</p>
          <p className="mt-1">Questions? Contact us at support@astrashipping.com</p>
        </div>
      </div>
    );
  }
);

InvoicePDFPreview.displayName = 'InvoicePDFPreview';
