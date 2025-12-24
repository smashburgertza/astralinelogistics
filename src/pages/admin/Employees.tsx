import { Users, Shield, Briefcase, HeadphonesIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/admin/StatCard';
import { EmployeeTable } from '@/components/admin/EmployeeTable';
import { CreateEmployeeDialog } from '@/components/admin/CreateEmployeeDialog';
import { useEmployees, EMPLOYEE_ROLES } from '@/hooks/useEmployees';

export default function AdminEmployeesPage() {
  const { data: employees } = useEmployees();

  const roleIcons = {
    manager: Briefcase,
    accountant: Users,
    operations: Shield,
    support: HeadphonesIcon,
  };

  const roleCounts = employees?.reduce((acc, emp) => {
    const role = emp.employee_role || 'support';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employee Management</h1>
          <p className="text-muted-foreground">
            Create and manage internal staff with role-based permissions
          </p>
        </div>
        <CreateEmployeeDialog />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Employees"
          value={employees?.length || 0}
          icon={Users}
        />
        {Object.entries(EMPLOYEE_ROLES).map(([key, value]) => {
          const Icon = roleIcons[key as keyof typeof roleIcons];
          return (
            <StatCard
              key={key}
              title={value.label}
              value={roleCounts[key] || 0}
              icon={Icon}
            />
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employees</CardTitle>
          <CardDescription>
            Manage your team members and their access permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmployeeTable />
        </CardContent>
      </Card>
    </div>
  );
}
