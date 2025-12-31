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
import { Checkbox } from '@/components/ui/checkbox';
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
import { DollarSign, MoreHorizontal, Check, X, MessageSquare, Loader2, AlertCircle, Pencil, FileText, ExternalLink } from 'lucide-react';
import { EXPENSE_CATEGORIES, Expense } from '@/hooks/useExpenses';
import { ExpenseStatusBadge } from './ExpenseStatusBadge';
import { ExpenseApprovalDialog } from './ExpenseApprovalDialog';
import { ExpenseApproveDialog } from './ExpenseApproveDialog';
import { ExpenseDialog } from './ExpenseDialog';
import { useRegions } from '@/hooks/useRegions';
import { useExchangeRatesMap } from '@/hooks/useExchangeRates';
import { useProfiles } from '@/hooks/useEmployees';

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
  receipt_url?: string | null;
  submitted_by?: string | null;
  approved_by?: string | null;
  shipments?: {
    tracking_number: string;
    origin_region: string;
  } | null;
}

interface ExpenseTableProps {
  expenses: ExpenseWithShipment[] | undefined;
  isLoading: boolean;
  showActions?: boolean;
  showBulkActions?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
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

export function ExpenseTable({ 
  expenses, 
  isLoading, 
  showActions = true,
  showBulkActions = false,
  selectedIds = [],
  onSelectionChange,
}: ExpenseTableProps) {
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    expenseId: string;
    mode: 'deny' | 'clarification';
  }>({ open: false, expenseId: '', mode: 'deny' });

  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [expenseToApprove, setExpenseToApprove] = useState<{
    id: string;
    amount: number;
    currency: string | null;
    category: string;
    description: string | null;
  } | null>(null);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const { data: regions = [] } = useRegions();
  const { getRate } = useExchangeRatesMap();
  const { data: profiles = [] } = useProfiles();

  const getProfileName = (userId: string | null | undefined) => {
    if (!userId) return null;
    const profile = profiles.find(p => p.id === userId);
    return profile?.full_name || profile?.email || userId.slice(0, 8);
  };

  const formatTZS = (amount: number) => {
    return `TZS ${amount.toLocaleString('en-TZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const convertToTZS = (amount: number, currency: string) => {
    const rate = getRate(currency);
    return amount * rate;
  };

  const handleApprove = (expense: ExpenseWithShipment) => {
    setExpenseToApprove({
      id: expense.id,
      amount: expense.amount,
      currency: expense.currency,
      category: expense.category,
      description: expense.description,
    });
    setApproveDialogOpen(true);
  };

  const openDenyDialog = (expenseId: string) => {
    setDialogState({ open: true, expenseId, mode: 'deny' });
  };

  const openClarificationDialog = (expenseId: string) => {
    setDialogState({ open: true, expenseId, mode: 'clarification' });
  };

  const handleEdit = (expense: ExpenseWithShipment) => {
    setEditingExpense(expense as Expense);
    setEditDialogOpen(true);
  };

  const toggleSelection = (id: string) => {
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const toggleAll = () => {
    if (!onSelectionChange || !expenses) return;
    const pendingExpenses = expenses.filter(e => e.status === 'pending' || e.status === 'needs_clarification');
    if (selectedIds.length === pendingExpenses.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(pendingExpenses.map(e => e.id));
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {showBulkActions && <TableHead className="w-[40px]" />}
              <TableHead>Category</TableHead>
              <TableHead>Amount (TZS)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted By</TableHead>
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
                {showBulkActions && <TableCell><Skeleton className="h-4 w-4" /></TableCell>}
                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
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
          Expenses will appear here once added.
        </p>
      </div>
    );
  }

  const pendingExpenses = expenses.filter(e => e.status === 'pending' || e.status === 'needs_clarification');

  return (
    <>
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {showBulkActions && (
                <TableHead className="w-[40px]">
                  <Checkbox 
                    checked={pendingExpenses.length > 0 && selectedIds.length === pendingExpenses.length}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
              )}
              <TableHead className="font-semibold">Category</TableHead>
              <TableHead className="font-semibold">Amount (TZS)</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Submitted By</TableHead>
              <TableHead className="font-semibold">Shipment</TableHead>
              <TableHead className="font-semibold">Region</TableHead>
              <TableHead className="font-semibold">Receipt</TableHead>
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
              const submitterName = getProfileName(expense.submitted_by);
              
              return (
                <TableRow key={expense.id}>
                  {showBulkActions && (
                    <TableCell>
                      {canTakeAction && (
                        <Checkbox 
                          checked={selectedIds.includes(expense.id)}
                          onCheckedChange={() => toggleSelection(expense.id)}
                        />
                      )}
                    </TableCell>
                  )}
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
                    {submitterName ? (
                      <span className="text-sm">{submitterName}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {expense.shipments ? (
                      <code className="font-mono text-sm text-brand-gold">
                        {expense.shipments.tracking_number}
                      </code>
                    ) : (
                      <span className="text-muted-foreground text-xs">Not linked</span>
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
                    {expense.receipt_url ? (
                      <a 
                        href={expense.receipt_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <FileText className="h-4 w-4" />
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {expense.created_at ? format(new Date(expense.created_at), 'MMM d, yyyy') : '—'}
                  </TableCell>
                  {showActions && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canTakeAction && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleApprove(expense)}
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
                            </>
                          )}
                          <DropdownMenuItem onClick={() => handleEdit(expense)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

      <ExpenseApproveDialog
        open={approveDialogOpen}
        onOpenChange={setApproveDialogOpen}
        expense={expenseToApprove}
      />

      <ExpenseDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        expense={editingExpense}
      />
    </>
  );
}