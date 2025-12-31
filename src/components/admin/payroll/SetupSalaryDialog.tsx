import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useEmployees } from '@/hooks/useEmployees';
import { useEmployeeSalary, useCreateEmployeeSalary, useUpdateEmployeeSalary } from '@/hooks/usePayroll';

interface SetupSalaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string | null;
}

export function SetupSalaryDialog({ open, onOpenChange, employeeId }: SetupSalaryDialogProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employeeId || '');
  const [baseSalary, setBaseSalary] = useState('');
  const [currency, setCurrency] = useState('TZS');
  const [otherAllowances, setOtherAllowances] = useState('0');
  const [payeRate, setPayeRate] = useState('0');
  const [nssfEmployeeRate, setNssfEmployeeRate] = useState('10');
  const [nssfEmployerRate, setNssfEmployerRate] = useState('10');
  const [healthInsurance, setHealthInsurance] = useState('0');
  const [isActive, setIsActive] = useState(true);

  const { data: employees = [] } = useEmployees();
  const { data: existingSalary } = useEmployeeSalary(selectedEmployeeId || undefined);
  const createSalary = useCreateEmployeeSalary();
  const updateSalary = useUpdateEmployeeSalary();

  // Prefill when editing
  useEffect(() => {
    if (employeeId) {
      setSelectedEmployeeId(employeeId);
    }
  }, [employeeId]);

  useEffect(() => {
    if (existingSalary) {
      setBaseSalary(existingSalary.base_salary.toString());
      setCurrency(existingSalary.currency);
      setOtherAllowances((existingSalary.other_allowances || 0).toString());
      setPayeRate((existingSalary.paye_rate || 0).toString());
      setNssfEmployeeRate((existingSalary.nssf_employee_rate || 10).toString());
      setNssfEmployerRate((existingSalary.nssf_employer_rate || 10).toString());
      setHealthInsurance((existingSalary.health_insurance || 0).toString());
      setIsActive(existingSalary.is_active ?? true);
    }
  }, [existingSalary]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      employee_id: selectedEmployeeId,
      base_salary: parseFloat(baseSalary),
      currency,
      pay_frequency: 'monthly',
      other_allowances: parseFloat(otherAllowances) || 0,
      paye_rate: parseFloat(payeRate) || 0,
      nssf_employee_rate: parseFloat(nssfEmployeeRate) || 0,
      nssf_employer_rate: parseFloat(nssfEmployerRate) || 0,
      health_insurance: parseFloat(healthInsurance) || 0,
      is_active: isActive,
      effective_from: new Date().toISOString().split('T')[0],
    };

    if (existingSalary) {
      updateSalary.mutate(
        { id: existingSalary.id, ...data },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createSalary.mutate(data, { onSuccess: () => onOpenChange(false) });
    }
  };

  const resetForm = () => {
    setSelectedEmployeeId('');
    setBaseSalary('');
    setCurrency('TZS');
    setOtherAllowances('0');
    setPayeRate('0');
    setNssfEmployeeRate('10');
    setNssfEmployerRate('10');
    setHealthInsurance('0');
    setIsActive(true);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{existingSalary ? 'Update Salary' : 'Setup Employee Salary'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select 
              value={selectedEmployeeId} 
              onValueChange={setSelectedEmployeeId}
              disabled={!!employeeId}
            >
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
              <Label>Base Salary *</Label>
              <Input
                type="number"
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
                placeholder="0.00"
                required
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
            <Label>Other Allowances</Label>
            <Input
              type="number"
              value={otherAllowances}
              onChange={(e) => setOtherAllowances(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">Transport, housing, meals, etc.</p>
          </div>

          <div className="p-4 bg-muted rounded-lg space-y-4">
            <h4 className="font-medium text-sm">Deductions</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>PAYE Rate (%)</Label>
                <Input
                  type="number"
                  value={payeRate}
                  onChange={(e) => setPayeRate(e.target.value)}
                  placeholder="0"
                  min="0"
                  max="100"
                />
              </div>
              <div className="space-y-2">
                <Label>Health Insurance (Fixed)</Label>
                <Input
                  type="number"
                  value={healthInsurance}
                  onChange={(e) => setHealthInsurance(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>NSSF Employee (%)</Label>
                <Input
                  type="number"
                  value={nssfEmployeeRate}
                  onChange={(e) => setNssfEmployeeRate(e.target.value)}
                  placeholder="10"
                  min="0"
                  max="100"
                />
              </div>
              <div className="space-y-2">
                <Label>NSSF Employer (%)</Label>
                <Input
                  type="number"
                  value={nssfEmployerRate}
                  onChange={(e) => setNssfEmployerRate(e.target.value)}
                  placeholder="10"
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="is_active">Active on Payroll</Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createSalary.isPending || updateSalary.isPending}>
              {createSalary.isPending || updateSalary.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
