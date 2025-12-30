import { useState } from 'react';
import { format } from 'date-fns';
import { 
  Plus, ArrowRight, Trash2, CheckCircle, XCircle, Clock,
  MessageSquare, Pencil
} from 'lucide-react';
import { Estimate } from '@/hooks/useEstimates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  useEstimates,
  useUpdateEstimateStatus,
  useConvertEstimateToInvoice,
  useDeleteEstimate,
} from '@/hooks/useEstimates';
import { useExchangeRates, convertToTZS } from '@/hooks/useExchangeRates';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { useActiveRegions, regionsToMap } from '@/hooks/useRegions';
import { CreateEstimateDialog } from './CreateEstimateDialog';
import { EditEstimateDialog } from './EditEstimateDialog';

const CUSTOMER_RESPONSE_CONFIG = {
  pending: { label: 'Awaiting', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  denied: { label: 'Declined', color: 'bg-red-100 text-red-800', icon: XCircle },
};

export function EstimatesTabContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [estimateToEdit, setEstimateToEdit] = useState<Estimate | null>(null);
  const { data: estimates, isLoading } = useEstimates();
  const { data: exchangeRates } = useExchangeRates();
  const { data: regions } = useActiveRegions();
  const regionsMap = regionsToMap(regions);
  const updateStatus = useUpdateEstimateStatus();
  const convertToInvoice = useConvertEstimateToInvoice();
  const deleteEstimate = useDeleteEstimate();

  const handleEditEstimate = (estimate: Estimate) => {
    setEstimateToEdit(estimate);
    setEditOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center">
        <CreateEstimateDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          regions={regions || []}
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Estimate
            </Button>
          }
        />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>All Estimates</CardTitle>
            <CardDescription>Manage and convert estimates to invoices</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estimate #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Customer Response</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead className="w-[180px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!estimates || estimates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No estimates yet. Create your first estimate.
                  </TableCell>
                </TableRow>
              ) : (
                estimates.map((estimate) => {
                  const customerResponseConfig = CUSTOMER_RESPONSE_CONFIG[(estimate as any).customer_response as keyof typeof CUSTOMER_RESPONSE_CONFIG] || CUSTOMER_RESPONSE_CONFIG.pending;
                  const ResponseIcon = customerResponseConfig.icon;
                  
                  return (
                    <TableRow key={estimate.id}>
                      <TableCell className="font-mono font-medium">
                        {estimate.estimate_number}
                      </TableCell>
                      <TableCell>
                        {estimate.customers?.name || '-'}
                      </TableCell>
                      <TableCell>
                        {regionsMap[estimate.origin_region]?.name || estimate.origin_region}
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-semibold">
                            {CURRENCY_SYMBOLS[estimate.currency] || '$'}{estimate.total.toFixed(2)}
                          </span>
                          {estimate.currency !== 'TZS' && exchangeRates && (
                            <p className="text-xs text-muted-foreground">
                              ≈ TZS {convertToTZS(estimate.total, estimate.currency, exchangeRates).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline" className={`${customerResponseConfig.color} gap-1`}>
                            <ResponseIcon className="h-3 w-3" />
                            {customerResponseConfig.label}
                          </Badge>
                          {(estimate as any).customer_comments && (
                            <div className="flex items-start gap-1 text-xs text-muted-foreground max-w-[200px]">
                              <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                              <span className="truncate" title={(estimate as any).customer_comments}>
                                {(estimate as any).customer_comments}
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {estimate.valid_until ? format(new Date(estimate.valid_until), 'MMM d, yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {estimate.status !== 'converted' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditEstimate(estimate)}
                              title="Edit estimate"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {(estimate as any).customer_response === 'denied' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus.mutate({ id: estimate.id, status: 'followed_up' })}
                              title="Mark as followed up"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          )}
                          {(estimate as any).customer_response === 'pending' && estimate.status !== 'converted' && (
                            <Button
                              size="sm"
                              onClick={() => convertToInvoice.mutate(estimate.id)}
                              disabled={convertToInvoice.isPending}
                              title="Convert to invoice"
                            >
                              <ArrowRight className="h-4 w-4 mr-1" />
                              Invoice
                            </Button>
                          )}
                          {estimate.status !== 'converted' && (estimate as any).customer_response !== 'approved' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Estimate?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteEstimate.mutate(estimate.id)}
                                    className="bg-destructive text-destructive-foreground"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Estimate Dialog */}
      {estimateToEdit && (
        <EditEstimateDialog
          estimate={estimateToEdit}
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) setEstimateToEdit(null);
          }}
        />
      )}
    </>
  );
}