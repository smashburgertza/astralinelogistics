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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSalaryAdvances, useCreateSalaryAdvance, useApproveSalaryAdvance } from '@/hooks/usePayroll';
import { useEmployees } from '@/hooks/useEmployees';
import { useBankAccounts } from '@/hooks/useAccounting';
import { formatAmount } from '@/components/shared/CurrencyDisplay';
import { format } from 'date-fns';
import { Plus, Check, X } from 'lucide-react';

export function SalaryAdvancesTab() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState<string | null>(null);
  const [selectedBankAccount, setSelectedBankAccount] = useState('');

  // Form state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('TZS');
  const [reason, setReason] = useState('');
  const [advanceDate, setAdvanceDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: advances = [], isLoading } = useSalaryAdvances();
  const { data: employees = [] } = useEmployees();
  const { data: bankAccounts = [] } = useBankAccounts();
  
  const createAdvance = useCreateSalaryAdvance();
  const approveAdvance = useApproveSalaryAdvance();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-amber-500 text-amber-600">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Approved</Badge>;
      case 'deducted':
        return <Badge className="bg-green-600">Deducted</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleCreate = () => {
    createAdvance.mutate({
      employee_id: selectedEmployeeId,
      amount: parseFloat(amount),
      currency,
      advance_date: advanceDate,
      reason,
      status: 'pending',
      paid_from_account_id: null,
    }, {
      onSuccess: () => {
        setShowCreateDialog(false);
        resetForm();
      },
    });
  };

  const handleApprove = () => {
    if (!showApproveDialog) return;
    approveAdvance.mutate(
      { id: showApproveDialog, bankAccountId: selectedBankAccount || undefined },
      { onSuccess: () => {
        setShowApproveDialog(null);
        setSelectedBankAccount('');
      }}
    );
  };

  const resetForm = () => {
    setSelectedEmployeeId('');
    setAmount('');
    setCurrency('TZS');
    setReason('');
    setAdvanceDate(new Date().toISOString().split('T')[0]);
  };

  const getEmployeeName = (employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.full_name || emp?.email || 'Unknown';
  };

  const activeBankAccounts = bankAccounts.filter(b => b.is_active);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Salary Advances</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Track advances given to employees. Approved advances are auto-deducted in the next payroll.
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Record Advance
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : advances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No salary advances recorded.
                  </TableCell>
                </TableRow>
              ) : (
                advances.map((advance) => (
                  <TableRow key={advance.id}>
                    <TableCell className="font-medium">
                      {getEmployeeName(advance.employee_id)}
                    </TableCell>
                    <TableCell>
                      {format(new Date(advance.advance_date), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatAmount(advance.amount, advance.currency)}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {advance.reason || '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(advance.status)}</TableCell>
                    <TableCell className="text-right">
                      {advance.status === 'pending' && (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => setShowApproveDialog(advance.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
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
            <DialogTitle>Record Salary Advance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Employee *</Label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name || emp.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TZS">TZS</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Advance Date</Label>
              <Input
                type="date"
                value={advanceDate}
                onChange={(e) => setAdvanceDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Optional reason for the advance"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreate} 
                disabled={!selectedEmployeeId || !amount || createAdvance.isPending}
              >
                {createAdvance.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={!!showApproveDialog} onOpenChange={(open) => !open && setShowApproveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Salary Advance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Approving this advance will mark it for deduction in the next payroll run.
            </p>
            
            <div className="space-y-2">
              <Label>Pay from Account (Optional)</Label>
              <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Select if paying now" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Don't deduct from account</SelectItem>
                  {activeBankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_name} - {formatAmount(account.current_balance || 0, account.currency || 'TZS')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                If selected, the bank balance will be reduced immediately
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowApproveDialog(null)}>
                Cancel
              </Button>
              <Button onClick={handleApprove} disabled={approveAdvance.isPending}>
                {approveAdvance.isPending ? 'Approving...' : 'Approve'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
