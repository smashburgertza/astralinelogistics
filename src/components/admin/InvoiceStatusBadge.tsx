import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { INVOICE_STATUSES } from '@/hooks/useInvoices';

const statusIcons = {
  pending: Clock,
  paid: CheckCircle,
  overdue: AlertCircle,
  cancelled: XCircle,
};

interface InvoiceStatusBadgeProps {
  status: string;
}

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  const statusConfig = INVOICE_STATUSES[status as keyof typeof INVOICE_STATUSES] || INVOICE_STATUSES.pending;
  const Icon = statusIcons[status as keyof typeof statusIcons] || Clock;

  return (
    <Badge variant="outline" className={`${statusConfig.color} border-0 gap-1`}>
      <Icon className="h-3 w-3" />
      {statusConfig.label}
    </Badge>
  );
}
