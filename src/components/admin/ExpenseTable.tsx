import { useState } from 'react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DollarSign, MoreHorizontal, Check, X, MessageSquare, Loader2, AlertCircle } from 'lucide-react';
import { EXPENSE_CATEGORIES, useApproveExpense } from '@/hooks/useExpenses';
import { ExpenseStatusBadge } from './ExpenseStatusBadge';
import { ExpenseApprovalDialog } from './ExpenseApprovalDialog';
import { useRegions } from '@/hooks/useRegions';
import { useExchangeRatesMap } from '@/hooks/useExchangeRates';

interface ExpenseWithShipment {
  id: string;
  category: string;
  amount: number;
  currency: string | null;
  description: string | null;
  region: string | null;
  created_at: string | null;
  status?: string;
  denial_reason?: string | null;
  clarification_notes?: string | null;
  shipments?: {
    tracking_number: string;
    origin_region: string;
  } | null;
}

interface ExpenseTableProps {
  expenses: ExpenseWithShipment[] | undefined;
  isLoading: boolean;
  showActions?: boolean;
}

const getCategoryLabel = (value: string) => {
  return EXPENSE_CATEGORIES.find(c => c.value === value)?.label || value;
};

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    shipping: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    handling: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    customs: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    insurance: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    packaging: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
    storage: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    fuel: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    other: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  };
  return colors[category] || colors.other;
};

export function ExpenseTable({ expenses, isLoading, showActions = true }: ExpenseTableProps) {
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    expenseId: string;
    mode: 'deny' | 'clarification';
  }>({ open: false, expenseId: '', mode: 'deny' });

  const approveExpense = useApproveExpense();
  const { data: regions = [] } = useRegions();
  const { getRate } = useExchangeRatesMap();

  const formatTZS = (amount: number) => {
    return `TZS ${amount.toLocaleString('en-TZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const convertToTZS = (amount: number, currency: string) => {
    const rate = getRate(currency);
    return amount * rate;
  };

  const handleApprove = (expenseId: string) => {
    approveExpense.mutate(expenseId);
  };

  const openDenyDialog = (expenseId: string) => {
    setDialogState({ open: true, expenseId, mode: 'deny' });
  };

  const openClarificationDialog = (expenseId: string) => {
    setDialogState({ open: true, expenseId, mode: 'clarification' });
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Category</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Shipment</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Date</TableHead>
              {showActions && <TableHead className="w-[100px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                {showActions && <TableCell><Skeleton className="h-8 w-8" /></TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!expenses?.length) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center">
        <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-1">No expenses found</h3>
        <p className="text-muted-foreground">
          Expenses will appear here once added to shipments.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold">Category</TableHead>
              <TableHead className="font-semibold">Amount (TZS)</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Shipment</TableHead>
              <TableHead className="font-semibold">Region</TableHead>
              <TableHead className="font-semibold">Description</TableHead>
              <TableHead className="font-semibold">Date</TableHead>
              {showActions && <TableHead className="font-semibold w-[100px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense) => {
              const regionInfo = expense.region ? regions.find(r => r.code === expense.region) : null;
              const isPending = expense.status === 'pending';
              const needsClarification = expense.status === 'needs_clarification';
              const canTakeAction = isPending || needsClarification;
              const currency = expense.currency || 'TZS';
              const amountInTZS = convertToTZS(Number(expense.amount), currency);
              
              return (
                <TableRow key={expense.id}>
                  <TableCell>
                    <Badge className={getCategoryColor(expense.category)} variant="secondary">
                      {getCategoryLabel(expense.category)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">
                        {formatTZS(amountInTZS)}
                      </span>
                      {currency !== 'TZS' && (
                        <p className="text-xs text-muted-foreground">
                          {currency} {Number(expense.amount).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ExpenseStatusBadge status={expense.status || 'pending'} />
                      {expense.denial_reason && (
                        <Tooltip>
                          <TooltipTrigger>
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{expense.denial_reason}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {expense.clarification_notes && (
                        <Tooltip>
                          <TooltipTrigger>
                            <MessageSquare className="h-4 w-4 text-orange-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{expense.clarification_notes}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {expense.shipments ? (
                      <code className="font-mono text-sm text-brand-gold">
                        {expense.shipments.tracking_number}
                      </code>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {regionInfo ? (
                      <div className="flex items-center gap-2">
                        <span>{regionInfo.flag_emoji}</span>
                        <span>{regionInfo.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground max-w-[200px] truncate block">
                      {expense.description || '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {expense.created_at ? format(new Date(expense.created_at), 'MMM d, yyyy') : '—'}
                  </TableCell>
                  {showActions && (
                    <TableCell>
                      {canTakeAction && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              {approveExpense.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleApprove(expense.id)}
                              className="text-green-600"
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openDenyDialog(expense.id)}
                              className="text-red-600"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Deny
                            </DropdownMenuItem>
                            {isPending && (
                              <DropdownMenuItem
                                onClick={() => openClarificationDialog(expense.id)}
                                className="text-orange-600"
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Request Clarification
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ExpenseApprovalDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((prev) => ({ ...prev, open }))}
        expenseId={dialogState.expenseId}
        mode={dialogState.mode}
      />
    </>
  );
}
