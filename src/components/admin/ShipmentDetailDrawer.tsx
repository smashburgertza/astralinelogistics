import { format } from 'date-fns';
import { Package, MapPin, Weight, Clock, User, Copy, Check, Box, Plus, Pencil, Trash2, DollarSign, Printer } from 'lucide-react';
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Shipment } from '@/hooks/useShipments';
import { Parcel, useParcels, useDeleteParcel } from '@/hooks/useParcels';
import { Expense, EXPENSE_CATEGORIES, useExpensesByShipment, useDeleteExpense } from '@/hooks/useExpenses';
import { ShipmentStatusBadge } from './ShipmentStatusBadge';
import { ParcelDialog } from './ParcelDialog';
import { ExpenseDialog } from './ExpenseDialog';
import { PrintLabelsDialog } from './PrintLabelsDialog';

interface ShipmentDetailDrawerProps {
  shipment: Shipment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusSteps = [
  { key: 'collected', label: 'Collected', field: 'collected_at' },
  { key: 'in_transit', label: 'In Transit', field: 'in_transit_at' },
  { key: 'arrived', label: 'Arrived', field: 'arrived_at' },
  { key: 'delivered', label: 'Delivered', field: 'delivered_at' },
] as const;

export function ShipmentDetailDrawer({ shipment, open, onOpenChange }: ShipmentDetailDrawerProps) {
  const [copied, setCopied] = useState(false);
  const [parcelDialogOpen, setParcelDialogOpen] = useState(false);
  const [editingParcel, setEditingParcel] = useState<Parcel | null>(null);
  const [deleteParcelId, setDeleteParcelId] = useState<string | null>(null);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [printLabelsOpen, setPrintLabelsOpen] = useState(false);
  
  const { data: parcels, isLoading: parcelsLoading } = useParcels(shipment?.id ?? null);
  const { data: expenses, isLoading: expensesLoading } = useExpensesByShipment(shipment?.id ?? null);
  const deleteParcel = useDeleteParcel();
  const deleteExpense = useDeleteExpense();

  const getCategoryLabel = (value: string) => {
    return EXPENSE_CATEGORIES.find(c => c.value === value)?.label || value;
  };

  const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

  const copyTrackingNumber = () => {
    if (shipment?.tracking_number) {
      navigator.clipboard.writeText(shipment.tracking_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusIndex = (status: string) => {
    return statusSteps.findIndex(step => step.key === status);
  };

  const currentStatusIndex = shipment ? getStatusIndex(shipment.status || 'collected') : -1;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {shipment ? (
          <>
            <SheetHeader className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <SheetTitle className="text-xl">Shipment Details</SheetTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {shipment.tracking_number}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={copyTrackingNumber}
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
                <ShipmentStatusBadge status={shipment.status || 'collected'} />
              </div>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Status Timeline */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Status Timeline
                </h3>
                <div className="relative">
                  {statusSteps.map((step, index) => {
                    const timestamp = shipment[step.field as keyof typeof shipment] as string | null;
                    const isCompleted = index <= currentStatusIndex;
                    const isCurrent = index === currentStatusIndex;

                    return (
                      <div key={step.key} className="flex gap-4 pb-6 last:pb-0">
                        {/* Timeline line and dot */}
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-3 h-3 rounded-full border-2 ${
                              isCompleted
                                ? 'bg-primary border-primary'
                                : 'bg-background border-muted-foreground/30'
                            } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
                          />
                          {index < statusSteps.length - 1 && (
                            <div
                              className={`w-0.5 flex-1 mt-1 ${
                                index < currentStatusIndex
                                  ? 'bg-primary'
                                  : 'bg-muted-foreground/30'
                              }`}
                            />
                          )}
                        </div>

                        {/* Status content */}
                        <div className="flex-1 -mt-0.5">
                          <p
                            className={`font-medium ${
                              isCompleted ? 'text-foreground' : 'text-muted-foreground'
                            }`}
                          >
                            {step.label}
                          </p>
                          {timestamp ? (
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(timestamp), 'MMM d, yyyy h:mm a')}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground/50">Pending</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Shipment Info */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Shipment Information
                </h3>
                <div className="grid gap-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Origin Region</p>
                      <p className="font-medium capitalize">{shipment.origin_region}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Weight className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Weight</p>
                      <p className="font-medium">{shipment.total_weight_kg} kg</p>
                    </div>
                  </div>
                  {shipment.warehouse_location && (
                    <div className="flex items-start gap-3">
                      <Box className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Warehouse Location</p>
                        <p className="font-medium">{shipment.warehouse_location}</p>
                      </div>
                    </div>
                  )}
                  {shipment.description && (
                    <div className="flex items-start gap-3">
                      <Package className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Description</p>
                        <p className="font-medium">{shipment.description}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Info */}
              {shipment.customers && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Customer
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="font-medium">{shipment.customers.name}</p>
                      {shipment.customers.company_name && (
                        <p className="text-sm text-muted-foreground">{shipment.customers.company_name}</p>
                      )}
                      {shipment.customers.email && (
                        <p className="text-sm text-muted-foreground">{shipment.customers.email}</p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Parcels */}
              <Separator />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <Box className="h-4 w-4" />
                    Parcels ({parcels?.length || 0})
                  </h3>
                  <div className="flex items-center gap-2">
                    {parcels && parcels.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPrintLabelsOpen(true)}
                      >
                        <Printer className="h-4 w-4 mr-1" />
                        Print Labels
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingParcel(null);
                        setParcelDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
                {parcelsLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : parcels && parcels.length > 0 ? (
                  <div className="space-y-3">
                    {parcels.map((parcel) => (
                      <div
                        key={parcel.id}
                        className="bg-muted/50 rounded-lg p-4 space-y-2 group"
                      >
                        <div className="flex items-center justify-between">
                          <code className="text-sm font-mono">{parcel.barcode}</code>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{parcel.weight_kg} kg</Badge>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                setEditingParcel(parcel);
                                setParcelDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                              onClick={() => setDeleteParcelId(parcel.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        {parcel.description && (
                          <p className="text-sm text-muted-foreground">{parcel.description}</p>
                        )}
                        {parcel.dimensions && (
                          <p className="text-xs text-muted-foreground">
                            Dimensions: {parcel.dimensions}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No parcels recorded for this shipment
                  </p>
                )}
              </div>

              {/* Expenses */}
              <Separator />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Expenses ({expenses?.length || 0})
                    {totalExpenses > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        ${totalExpenses.toFixed(2)}
                      </Badge>
                    )}
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingExpense(null);
                      setExpenseDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
                {expensesLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : expenses && expenses.length > 0 ? (
                  <div className="space-y-3">
                    {expenses.map((expense) => (
                      <div
                        key={expense.id}
                        className="bg-muted/50 rounded-lg p-4 space-y-1 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{getCategoryLabel(expense.category)}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {expense.currency} {Number(expense.amount).toFixed(2)}
                            </Badge>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                setEditingExpense(expense);
                                setExpenseDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                              onClick={() => setDeleteExpenseId(expense.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        {expense.description && (
                          <p className="text-sm text-muted-foreground">{expense.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(expense.created_at || ''), 'MMM d, yyyy')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No expenses recorded for this shipment
                  </p>
                )}
              </div>

              {/* Dates */}
              <Separator />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Created: {format(new Date(shipment.created_at), 'MMM d, yyyy h:mm a')}</p>
                <p>Last updated: {format(new Date(shipment.updated_at), 'MMM d, yyyy h:mm a')}</p>
              </div>
            </div>

            {/* Parcel Dialog */}
            <ParcelDialog
              open={parcelDialogOpen}
              onOpenChange={(open) => {
                setParcelDialogOpen(open);
                if (!open) setEditingParcel(null);
              }}
              shipmentId={shipment.id}
              parcel={editingParcel}
            />

            {/* Expense Dialog */}
            <ExpenseDialog
              open={expenseDialogOpen}
              onOpenChange={(open) => {
                setExpenseDialogOpen(open);
                if (!open) setEditingExpense(null);
              }}
              shipmentId={shipment.id}
              expense={editingExpense}
            />

            {/* Delete Parcel Confirmation */}
            <AlertDialog open={!!deleteParcelId} onOpenChange={() => setDeleteParcelId(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Parcel</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this parcel? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => {
                      if (deleteParcelId && shipment) {
                        deleteParcel.mutate({ id: deleteParcelId, shipmentId: shipment.id });
                        setDeleteParcelId(null);
                      }
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Delete Expense Confirmation */}
            <AlertDialog open={!!deleteExpenseId} onOpenChange={() => setDeleteExpenseId(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this expense? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => {
                      if (deleteExpenseId && shipment) {
                        deleteExpense.mutate({ id: deleteExpenseId, shipmentId: shipment.id });
                        setDeleteExpenseId(null);
                      }
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Print Labels Dialog */}
            {parcels && parcels.length > 0 && (
              <PrintLabelsDialog
                open={printLabelsOpen}
                onOpenChange={setPrintLabelsOpen}
                shipment={shipment}
                parcels={parcels}
              />
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No shipment selected</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
