import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Customer, useCustomerShipments, useCustomerInvoices } from '@/hooks/useCustomers';
import { CustomerDialog } from './CustomerDialog';
import { SHIPMENT_STATUSES, CURRENCY_SYMBOLS } from '@/lib/constants';
import { useRegions } from '@/hooks/useRegions';
import { format } from 'date-fns';
import { Mail, Phone, Building2, MapPin, FileText, Package, Pencil, Calendar, User, UserPlus, Shield } from 'lucide-react';

interface CustomerDetailsDrawerProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerDetailsDrawer({ customer, open, onOpenChange }: CustomerDetailsDrawerProps) {
  const { data: shipments, isLoading: shipmentsLoading } = useCustomerShipments(customer?.id || '');
  const { data: invoices, isLoading: invoicesLoading } = useCustomerInvoices(customer?.id || '');
  const { data: regions = [] } = useRegions();

  if (!customer) return null;

  const customerType = (customer as any).customer_type || 'individual';
  const customerCode = (customer as any).customer_code;
  const tin = (customer as any).tin;
  const vrn = (customer as any).vrn;
  const incharge1 = {
    name: (customer as any).incharge_1_name,
    phone: (customer as any).incharge_1_phone,
    email: (customer as any).incharge_1_email,
  };
  const incharge2 = {
    name: (customer as any).incharge_2_name,
    phone: (customer as any).incharge_2_phone,
    email: (customer as any).incharge_2_email,
  };
  const incharge3 = {
    name: (customer as any).incharge_3_name,
    phone: (customer as any).incharge_3_phone,
    email: (customer as any).incharge_3_email,
  };

  const hasIncharge = (i: typeof incharge1) => i.name || i.phone || i.email;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between pr-8">
            <div>
              <div className="flex items-center gap-2">
                <SheetTitle className="text-xl">{customer.name}</SheetTitle>
                {customerType === 'corporate' ? (
                  <Badge variant="secondary" className="gap-1">
                    <Building2 className="h-3 w-3" />
                    Corporate
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <User className="h-3 w-3" />
                    Individual
                  </Badge>
                )}
              </div>
              {customer.company_name && (
                <p className="text-muted-foreground mt-1">{customer.company_name}</p>
              )}
              {customerCode && (
                <p className="font-mono text-sm text-primary font-medium mt-1">{customerCode}</p>
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
              {customer.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm">{customer.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Corporate Details */}
          {customerType === 'corporate' && (tin || vrn) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Tax Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {tin && (
                    <div>
                      <p className="text-xs text-muted-foreground">TIN</p>
                      <p className="font-medium">{tin}</p>
                    </div>
                  )}
                  {vrn && (
                    <div>
                      <p className="text-xs text-muted-foreground">VRN</p>
                      <p className="font-medium">{vrn}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Incharge Persons */}
          {customerType === 'corporate' && (hasIncharge(incharge1) || hasIncharge(incharge2) || hasIncharge(incharge3)) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Incharge Persons
                </h3>
                <div className="space-y-3">
                  {[incharge1, incharge2, incharge3].filter(hasIncharge).map((incharge, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-muted/50 space-y-1">
                      {incharge.name && <p className="font-medium">{incharge.name}</p>}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {incharge.phone && (
                          <a href={`tel:${incharge.phone}`} className="flex items-center gap-1 hover:text-foreground">
                            <Phone className="h-3 w-3" />
                            {incharge.phone}
                          </a>
                        )}
                        {incharge.email && (
                          <a href={`mailto:${incharge.email}`} className="flex items-center gap-1 hover:text-foreground">
                            <Mail className="h-3 w-3" />
                            {incharge.email}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

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
                  const regionInfo = regions.find(r => r.code === shipment.origin_region);
                  return (
                    <div key={shipment.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div>
                        <div className="flex items-center gap-2">
                          {regionInfo && <span>{regionInfo.flag_emoji}</span>}
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
