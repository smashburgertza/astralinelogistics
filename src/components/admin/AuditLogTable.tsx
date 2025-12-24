import { format } from 'date-fns';
import { FileText, UserPlus, UserMinus, Settings, Shield } from 'lucide-react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuditLogs, formatAuditAction } from '@/hooks/useAuditLogs';

export function AuditLogTable() {
  const { data: logs, isLoading } = useAuditLogs();

  const getActionIcon = (action: string, tableName: string | null) => {
    if (tableName === 'user_roles') {
      if (action === 'INSERT') return <UserPlus className="h-4 w-4" />;
      if (action === 'DELETE') return <UserMinus className="h-4 w-4" />;
      return <Shield className="h-4 w-4" />;
    }
    if (tableName === 'profiles') return <Settings className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'INSERT':
        return <Badge variant="default">Create</Badge>;
      case 'UPDATE':
        return <Badge variant="secondary">Update</Badge>;
      case 'DELETE':
        return <Badge variant="destructive">Delete</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]"></TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Performed By</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs?.map((log) => (
          <TableRow key={log.id}>
            <TableCell>
              <div className="flex items-center justify-center text-muted-foreground">
                {getActionIcon(log.action, log.table_name)}
              </div>
            </TableCell>
            <TableCell>{getActionBadge(log.action)}</TableCell>
            <TableCell>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help">{formatAuditAction(log)}</span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-sm">
                  <div className="text-xs space-y-1">
                    <p><strong>Table:</strong> {log.table_name}</p>
                    {log.old_data && (
                      <p><strong>Old:</strong> {JSON.stringify(log.old_data).slice(0, 100)}...</p>
                    )}
                    {log.new_data && (
                      <p><strong>New:</strong> {JSON.stringify(log.new_data).slice(0, 100)}...</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {log.user_email || 'System'}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {log.created_at
                ? format(new Date(log.created_at), 'MMM d, yyyy HH:mm')
                : 'N/A'}
            </TableCell>
          </TableRow>
        ))}
        {logs?.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
              No audit logs found
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
