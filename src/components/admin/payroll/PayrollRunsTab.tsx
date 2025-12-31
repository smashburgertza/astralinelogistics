import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  usePayrollRuns, 
  useCreatePayrollRun,
  useDeletePayrollRun,
  MONTH_NAMES 
} from '@/hooks/usePayroll';
import { formatAmount } from '@/components/shared/CurrencyDisplay';
import { format } from 'date-fns';
import { Plus, Eye, Trash2, Play } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PayrollDetailDialog } from './PayrollDetailDialog';

export function PayrollRunsTab() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [viewingPayroll, setViewingPayroll] = useState<string | null>(null);

  const { data: payrollRuns = [], isLoading } = usePayrollRuns();
  const createPayroll = useCreatePayrollRun();
  const deletePayroll = useDeletePayrollRun();

  const handleCreate = () => {
    createPayroll.mutate(
      { month: parseInt(selectedMonth), year: parseInt(selectedYear) },
      { onSuccess: () => setShowCreateDialog(false) }
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'generated':
        return <Badge variant="outline" className="border-amber-500 text-amber-600">Generated</Badge>;
      case 'approved':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Approved</Badge>;
      case 'paid':
        return <Badge className="bg-green-600">Paid</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Payroll Runs</CardTitle>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Payroll Run
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payroll #</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right">Net Payable</TableHead>
                <TableHead>Run Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : payrollRuns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No payroll runs yet. Create your first one!
                  </TableCell>
                </TableRow>
              ) : (
                payrollRuns.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-medium">{run.payroll_number}</TableCell>
                    <TableCell>
                      {MONTH_NAMES[run.period_month - 1]} {run.period_year}
                    </TableCell>
                    <TableCell>{getStatusBadge(run.status)}</TableCell>
                    <TableCell className="text-right">
                      {formatAmount(run.total_gross || 0, run.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatAmount(run.total_deductions || 0, run.currency)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatAmount(run.total_net || 0, run.currency)}
                    </TableCell>
                    <TableCell>
                      {format(new Date(run.run_date), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewingPayroll(run.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {run.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deletePayroll.mutate(run.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Payroll Run</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((month, idx) => (
                      <SelectItem key={idx} value={(idx + 1).toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createPayroll.isPending}>
                {createPayroll.isPending ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      {viewingPayroll && (
        <PayrollDetailDialog
          payrollRunId={viewingPayroll}
          open={!!viewingPayroll}
          onOpenChange={(open) => !open && setViewingPayroll(null)}
        />
      )}
    </>
  );
}
