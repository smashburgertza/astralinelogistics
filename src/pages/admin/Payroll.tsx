import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  usePayrollRuns, 
  useEmployeeSalaries, 
  useSalaryAdvances,
  MONTH_NAMES 
} from '@/hooks/usePayroll';
import { useEmployees } from '@/hooks/useEmployees';
import { PayrollRunsTab } from '@/components/admin/payroll/PayrollRunsTab';
import { EmployeeSalariesTab } from '@/components/admin/payroll/EmployeeSalariesTab';
import { SalaryAdvancesTab } from '@/components/admin/payroll/SalaryAdvancesTab';
import { 
  Users, 
  Wallet, 
  Calculator,
  TrendingDown,
  Calendar
} from 'lucide-react';
import { formatAmount } from '@/components/shared/CurrencyDisplay';

export default function Payroll() {
  const [activeTab, setActiveTab] = useState('runs');
  
  const { data: payrollRuns = [] } = usePayrollRuns();
  const { data: salaries = [] } = useEmployeeSalaries();
  const { data: advances = [] } = useSalaryAdvances();
  const { data: employees = [] } = useEmployees();

  // Stats
  const activeSalaries = salaries.filter(s => s.is_active);
  const totalMonthlyPayroll = activeSalaries.reduce((sum, s) => sum + s.base_salary, 0);
  const pendingAdvances = advances.filter(a => a.status === 'pending');
  const approvedAdvances = advances.filter(a => a.status === 'approved' && !a.deducted_in_payroll_id);
  const totalPendingAdvances = [...pendingAdvances, ...approvedAdvances].reduce((sum, a) => sum + a.amount, 0);
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const currentPayroll = payrollRuns.find(p => p.period_month === currentMonth && p.period_year === currentYear);

  return (
    <AdminLayout title="Payroll Management" subtitle="Manage employee salaries, advances, and monthly payroll">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Employees on Payroll
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeSalaries.length}</div>
              <p className="text-xs text-muted-foreground">
                of {employees.length} total employees
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Monthly Payroll
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatAmount(totalMonthlyPayroll, 'TZS')}
              </div>
              <p className="text-xs text-muted-foreground">
                Base salaries total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Outstanding Advances
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatAmount(totalPendingAdvances, 'TZS')}
              </div>
              <p className="text-xs text-muted-foreground">
                {pendingAdvances.length} pending, {approvedAdvances.length} to deduct
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {MONTH_NAMES[currentMonth - 1]} Payroll
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currentPayroll ? (
                  <span className={
                    currentPayroll.status === 'paid' ? 'text-green-600' :
                    currentPayroll.status === 'generated' ? 'text-amber-600' :
                    'text-muted-foreground'
                  }>
                    {currentPayroll.status.charAt(0).toUpperCase() + currentPayroll.status.slice(1)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Not Started</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {currentPayroll ? formatAmount(currentPayroll.total_net || 0, 'TZS') : 'Create payroll run'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="runs" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Payroll Runs
            </TabsTrigger>
            <TabsTrigger value="salaries" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Employee Salaries
            </TabsTrigger>
            <TabsTrigger value="advances" className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Salary Advances
            </TabsTrigger>
          </TabsList>

          <TabsContent value="runs" className="mt-4">
            <PayrollRunsTab />
          </TabsContent>

          <TabsContent value="salaries" className="mt-4">
            <EmployeeSalariesTab />
          </TabsContent>

          <TabsContent value="advances" className="mt-4">
            <SalaryAdvancesTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
