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
import { useEmployeeSalaries } from '@/hooks/usePayroll';
import { useEmployees } from '@/hooks/useEmployees';
import { formatAmount } from '@/components/shared/CurrencyDisplay';
import { Plus, Edit2 } from 'lucide-react';
import { SetupSalaryDialog } from './SetupSalaryDialog';

export function EmployeeSalariesTab() {
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);

  const { data: salaries = [], isLoading } = useEmployeeSalaries();
  const { data: employees = [] } = useEmployees();

  const activeSalaries = salaries.filter(s => s.is_active);

  // Get employees with and without salary setup
  const employeesWithSalary = activeSalaries.map(s => {
    const employee = employees.find(e => e.user_id === s.employee_id);
    return { ...s, employee };
  });

  const employeesWithoutSalary = employees.filter(
    e => !activeSalaries.some(s => s.employee_id === e.user_id)
  );

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Employee Salaries</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Configure base salary and deduction rates for each employee
            </p>
          </div>
          <Button onClick={() => {
            setEditingEmployeeId(null);
            setShowSetupDialog(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Setup Salary
          </Button>
        </CardHeader>
        <CardContent>
          {employeesWithoutSalary.length > 0 && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <strong>{employeesWithoutSalary.length}</strong> employee(s) without salary setup: {' '}
                {employeesWithoutSalary.slice(0, 3).map(e => e.profile?.full_name || e.profile?.email || 'Unknown').join(', ')}
                {employeesWithoutSalary.length > 3 && ` and ${employeesWithoutSalary.length - 3} more`}
              </p>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="text-right">Base Salary</TableHead>
                <TableHead className="text-right">Allowances</TableHead>
                <TableHead className="text-right">PAYE %</TableHead>
                <TableHead className="text-right">NSSF %</TableHead>
                <TableHead className="text-right">Health Ins.</TableHead>
                <TableHead>Status</TableHead>
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
              ) : employeesWithSalary.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No salary configurations yet. Click "Setup Salary" to add employees to payroll.
                  </TableCell>
                </TableRow>
              ) : (
                employeesWithSalary.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.employee?.profile?.full_name || item.employee?.profile?.email || 'Unknown'}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatAmount(item.base_salary, item.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatAmount(item.other_allowances || 0, item.currency)}
                    </TableCell>
                    <TableCell className="text-right">{item.paye_rate || 0}%</TableCell>
                    <TableCell className="text-right">{item.nssf_employee_rate || 0}%</TableCell>
                    <TableCell className="text-right">
                      {formatAmount(item.health_insurance || 0, item.currency)}
                    </TableCell>
                    <TableCell>
                      {item.is_active ? (
                        <Badge className="bg-green-600">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingEmployeeId(item.employee_id);
                          setShowSetupDialog(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <SetupSalaryDialog
        open={showSetupDialog}
        onOpenChange={setShowSetupDialog}
        employeeId={editingEmployeeId}
      />
    </>
  );
}
