import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Customer, useCustomerShipments, useCustomerInvoices } from '@/hooks/useCustomers';
import { CustomerDialog } from './CustomerDialog';
import { SHIPMENT_STATUSES, CURRENCY_SYMBOLS, REGIONS } from '@/lib/constants';
import { format } from 'date-fns';
import { Mail, Phone, Building2, MapPin, FileText, Package, Pencil, Calendar } from 'lucide-react';

interface CustomerDetailsDrawerProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerDetailsDrawer({ customer, open, onOpenChange }: CustomerDetailsDrawerProps) {
  const { data: shipments, isLoading: shipmentsLoading } = useCustomerShipments(customer?.id || '');
  const { data: invoices, isLoading: invoicesLoading } = useCustomerInvoices(customer?.id || '');

  if (!customer) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between pr-8">
            <div>
              <SheetTitle className="text-xl">{customer.name}</SheetTitle>
              {customer.company_name && (
                <p className="text-muted-foreground mt-1">{customer.company_name}</p>
              )}
            </div>
            <CustomerDialog
              customer={customer}
              trigger={
                <Button variant="outline" size="sm" className="gap-1">
                  <Pencil className="h-3 w-3" />
                  Edit
                </Button>
              }
            />
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Contact Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Contact Information</h3>
            <div className="space-y-2">
              {customer.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${customer.email}`} className="text-primary hover:underline">
                    {customer.email}
                  </a>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${customer.phone}`} className="hover:underline">
                    {customer.phone}
                  </a>
                </div>
              )}
              {customer.company_name && (
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.company_name}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm">{customer.address}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Notes */}
          {customer.notes && (
            <>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase">Notes</h3>
                <p className="text-sm">{customer.notes}</p>
              </div>
              <Separator />
            </>
          )}

          {/* Recent Shipments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">Recent Shipments</h3>
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
            {shipmentsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : shipments?.length ? (
              <div className="space-y-2">
                {shipments.map((shipment) => {
                  const statusConfig = SHIPMENT_STATUSES[shipment.status as keyof typeof SHIPMENT_STATUSES];
                  const regionInfo = REGIONS[shipment.origin_region as keyof typeof REGIONS];
                  return (
                    <div key={shipment.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div>
                        <div className="flex items-center gap-2">
                          {regionInfo && <span>{regionInfo.flag}</span>}
                          <span className="font-mono text-sm">{shipment.tracking_number}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {shipment.total_weight_kg} kg
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {statusConfig?.label || shipment.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No shipments found</p>
            )}
          </div>

          <Separator />

          {/* Recent Invoices */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">Recent Invoices</h3>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            {invoicesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : invoices?.length ? (
              <div className="space-y-2">
                {invoices.map((invoice) => {
                  const currencySymbol = CURRENCY_SYMBOLS[invoice.currency || 'USD'] || '$';
                  return (
                    <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div>
                        <span className="font-mono text-sm">{invoice.invoice_number}</span>
                        <p className="text-xs text-muted-foreground mt-1">
                          {currencySymbol}{Number(invoice.amount).toFixed(2)}
                        </p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={
                          invoice.status === 'paid' 
                            ? 'bg-emerald-100 text-emerald-800 border-0' 
                            : invoice.status === 'overdue'
                            ? 'bg-red-100 text-red-800 border-0'
                            : 'bg-amber-100 text-amber-800 border-0'
                        }
                      >
                        {invoice.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No invoices found</p>
            )}
          </div>

          <Separator />

          {/* Meta */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Created {format(new Date(customer.created_at || new Date()), 'MMM dd, yyyy')}</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
