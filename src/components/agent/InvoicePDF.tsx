import { forwardRef } from 'react';
import { format } from 'date-fns';
import { CURRENCY_SYMBOLS } from '@/lib/constants';

interface InvoiceData {
  invoice_number: string;
  created_at: string;
  due_date?: string | null;
  amount: number;
  currency?: string | null;
  status?: string | null;
  notes?: string | null;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
  } | null;
  shipment?: {
    tracking_number?: string;
    origin_region?: string;
    total_weight_kg?: number;
  } | null;
}

interface InvoicePDFProps {
  invoice: InvoiceData;
}

export const InvoicePDF = forwardRef<HTMLDivElement, InvoicePDFProps>(
  ({ invoice }, ref) => {
    const currencySymbol = CURRENCY_SYMBOLS[invoice.currency || 'USD'] || '$';

    return (
      <div ref={ref} className="bg-white text-black p-8 max-w-[800px] mx-auto print:p-0">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-gray-200">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">INVOICE</h1>
            <p className="text-gray-600 mt-1">{invoice.invoice_number}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-gray-900">Astraline Logistics</h2>
            <p className="text-gray-600 text-sm mt-1">Global Freight Solutions</p>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Bill To
            </h3>
            <div className="text-gray-900">
              <p className="font-semibold text-lg">{invoice.customer?.name || 'N/A'}</p>
              {invoice.customer?.phone && (
                <p className="text-gray-600">{invoice.customer.phone}</p>
              )}
              {invoice.customer?.email && (
                <p className="text-gray-600">{invoice.customer.email}</p>
              )}
              {invoice.customer?.address && (
                <p className="text-gray-600 mt-1">{invoice.customer.address}</p>
              )}
            </div>
          </div>

          <div className="text-right">
            <div className="inline-block text-left">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <span className="text-gray-500">Invoice Date:</span>
                <span className="font-medium">
                  {format(new Date(invoice.created_at), 'MMM d, yyyy')}
                </span>
                
                {invoice.due_date && (
                  <>
                    <span className="text-gray-500">Due Date:</span>
                    <span className="font-medium">
                      {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                    </span>
                  </>
                )}
                
                <span className="text-gray-500">Status:</span>
                <span className={`font-semibold capitalize ${
                  invoice.status === 'paid' ? 'text-green-600' : 
                  invoice.status === 'overdue' ? 'text-red-600' : 'text-amber-600'
                }`}>
                  {invoice.status || 'Pending'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Shipment Details */}
        {invoice.shipment && (
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Shipment Details
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Tracking #:</span>
                <p className="font-mono font-semibold">{invoice.shipment.tracking_number || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500">Origin:</span>
                <p className="font-semibold capitalize">{invoice.shipment.origin_region || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500">Weight:</span>
                <p className="font-semibold">{invoice.shipment.total_weight_kg?.toFixed(2) || '-'} kg</p>
              </div>
            </div>
          </div>
        )}

        {/* Amount Table */}
        <table className="w-full mb-8">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="text-right py-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-4">
                <p className="font-medium text-gray-900">Shipping Services</p>
                {invoice.shipment?.tracking_number && (
                  <p className="text-sm text-gray-500">
                    Tracking: {invoice.shipment.tracking_number}
                  </p>
                )}
              </td>
              <td className="py-4 text-right font-semibold text-gray-900">
                {currencySymbol}{Number(invoice.amount).toFixed(2)}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200">
              <td className="py-4 text-right font-semibold text-gray-900 text-lg">
                Total
              </td>
              <td className="py-4 text-right font-bold text-gray-900 text-xl">
                {currencySymbol}{Number(invoice.amount).toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Notes */}
        {invoice.notes && (
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Notes
            </h3>
            <p className="text-gray-700 text-sm whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>Thank you for your business!</p>
          <p className="mt-1">Astraline Logistics Limited</p>
        </div>
      </div>
    );
  }
);

InvoicePDF.displayName = 'InvoicePDF';
