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
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign } from 'lucide-react';
import { EXPENSE_CATEGORIES } from '@/hooks/useExpenses';
import { REGIONS } from '@/lib/constants';

interface ExpenseWithShipment {
  id: string;
  category: string;
  amount: number;
  currency: string | null;
  description: string | null;
  region: string | null;
  created_at: string | null;
  shipments?: {
    tracking_number: string;
    origin_region: string;
  } | null;
}

interface ExpenseTableProps {
  expenses: ExpenseWithShipment[] | undefined;
  isLoading: boolean;
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

export function ExpenseTable({ expenses, isLoading }: ExpenseTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Category</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Shipment</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
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
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="font-semibold">Category</TableHead>
            <TableHead className="font-semibold">Amount</TableHead>
            <TableHead className="font-semibold">Shipment</TableHead>
            <TableHead className="font-semibold">Region</TableHead>
            <TableHead className="font-semibold">Description</TableHead>
            <TableHead className="font-semibold">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => {
            const regionInfo = expense.region ? REGIONS[expense.region as keyof typeof REGIONS] : null;
            
            return (
              <TableRow key={expense.id}>
                <TableCell>
                  <Badge className={getCategoryColor(expense.category)} variant="secondary">
                    {getCategoryLabel(expense.category)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="font-medium">
                    {expense.currency || 'USD'} {Number(expense.amount).toFixed(2)}
                  </span>
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
                      <span>{regionInfo.flag}</span>
                      <span>{regionInfo.label}</span>
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
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
