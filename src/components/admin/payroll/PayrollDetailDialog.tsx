import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  usePayrollRun, 
  usePayrollItems, 
  useGeneratePayrollItems,
  useProcessPayroll,
  MONTH_NAMES 
} from '@/hooks/usePayroll';
import { useBankAccounts } from '@/hooks/useAccounting';
import { formatAmount } from '@/components/shared/CurrencyDisplay';
import { Play, CreditCard, Printer, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PayrollDetailDialogProps {
  payrollRunId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PayrollDetailDialog({ payrollRunId, open, onOpenChange }: PayrollDetailDialogProps) {
  const [selectedBankAccount, setSelectedBankAccount] = useState('');
  
  const { data: payroll, isLoading: payrollLoading } = usePayrollRun(payrollRunId);
  const { data: items = [], isLoading: itemsLoading } = usePayrollItems(payrollRunId);
  const { data: bankAccounts = [] } = useBankAccounts();
  
  const generateItems = useGeneratePayrollItems();
  const processPayroll = useProcessPayroll();

  const activeBankAccounts = bankAccounts.filter(b => b.is_active);
  const selectedBank = bankAccounts.find(b => b.id === selectedBankAccount);
  const totalPayable = (payroll?.total_net || 0) + (payroll?.total_employer_contributions || 0);
  const insufficientFunds = selectedBank && (selectedBank.current_balance || 0) < totalPayable;

  if (payrollLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-8">Loading...</div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!payroll) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>
              {payroll.payroll_number} - {MONTH_NAMES[payroll.period_month - 1]} {payroll.period_year}
            </span>
            <Badge 
              variant={payroll.status === 'paid' ? 'default' : 'secondary'}
              className={payroll.status === 'paid' ? 'bg-green-600' : ''}
            >
              {payroll.status.charAt(0).toUpperCase() + payroll.status.slice(1)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className="grid grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground">Gross Salaries</p>
            <p className="text-lg font-bold">{formatAmount(payroll.total_gross || 0, payroll.currency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Deductions</p>
            <p className="text-lg font-bold text-red-600">-{formatAmount(payroll.total_deductions || 0, payroll.currency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Net Payable</p>
            <p className="text-lg font-bold text-green-600">{formatAmount(payroll.total_net || 0, payroll.currency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Employer Contributions</p>
            <p className="text-lg font-bold">{formatAmount(payroll.total_employer_contributions || 0, payroll.currency)}</p>
          </div>
        </div>

        {/* Actions */}
        {payroll.status === 'draft' && (
          <div className="flex gap-2">
            <Button 
              onClick={() => generateItems.mutate(payrollRunId)}
              disabled={generateItems.isPending}
            >
              <Play className="h-4 w-4 mr-2" />
              {generateItems.isPending ? 'Generating...' : 'Generate Payroll'}
            </Button>
            <p className="text-sm text-muted-foreground self-center">
              This will calculate salaries and deductions for all employees
            </p>
          </div>
        )}

        {payroll.status === 'generated' && (
          <div className="space-y-4 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>Pay from Account</Label>
                <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeBankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.account_name} ({account.currency}) - Balance: {formatAmount(account.current_balance || 0, account.currency || 'TZS')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => processPayroll.mutate({ payrollRunId, bankAccountId: selectedBankAccount })}
                disabled={!selectedBankAccount || insufficientFunds || processPayroll.isPending}
                className="mt-6"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {processPayroll.isPending ? 'Processing...' : 'Process Payment'}
              </Button>
            </div>
            {insufficientFunds && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Insufficient funds. Required: {formatAmount(totalPayable, payroll.currency)}, 
                  Available: {formatAmount(selectedBank?.current_balance || 0, selectedBank?.currency || 'TZS')}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <Separator />

        {/* Employee Details */}
        <div>
          <h3 className="font-semibold mb-2">Employee Breakdown</h3>
          {itemsLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No items yet. Click "Generate Payroll" to calculate.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">Allowances</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">PAYE</TableHead>
                    <TableHead className="text-right">NSSF</TableHead>
                    <TableHead className="text-right">Health</TableHead>
                    <TableHead className="text-right">Advances</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.employee_name}</TableCell>
                      <TableCell className="text-right">{formatAmount(item.base_salary, item.currency)}</TableCell>
                      <TableCell className="text-right">{formatAmount(item.other_allowances || 0, item.currency)}</TableCell>
                      <TableCell className="text-right">{formatAmount(item.gross_salary, item.currency)}</TableCell>
                      <TableCell className="text-right text-red-600">-{formatAmount(item.paye_deduction || 0, item.currency)}</TableCell>
                      <TableCell className="text-right text-red-600">-{formatAmount(item.nssf_employee_deduction || 0, item.currency)}</TableCell>
                      <TableCell className="text-right text-red-600">-{formatAmount(item.health_deduction || 0, item.currency)}</TableCell>
                      <TableCell className="text-right text-red-600">-{formatAmount(item.advance_deduction || 0, item.currency)}</TableCell>
                      <TableCell className="text-right font-bold text-green-600">{formatAmount(item.net_salary, item.currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
