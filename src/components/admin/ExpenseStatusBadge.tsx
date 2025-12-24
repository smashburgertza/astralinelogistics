import { Badge } from '@/components/ui/badge';
import { EXPENSE_STATUSES } from '@/hooks/useExpenses';

interface ExpenseStatusBadgeProps {
  status: string;
}

export function ExpenseStatusBadge({ status }: ExpenseStatusBadgeProps) {
  const statusInfo = EXPENSE_STATUSES.find(s => s.value === status) || EXPENSE_STATUSES[0];

  return (
    <Badge className={statusInfo.color} variant="secondary">
      {statusInfo.label}
    </Badge>
  );
}
