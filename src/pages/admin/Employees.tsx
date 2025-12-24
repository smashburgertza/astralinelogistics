import { Users, ShieldCheck, Shield } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/admin/StatCard';
import { EmployeeTable } from '@/components/admin/EmployeeTable';
import { CreateEmployeeDialog } from '@/components/admin/CreateEmployeeDialog';
import { useEmployees } from '@/hooks/useEmployees';

export default function AdminEmployeesPage() {
  const { data: employees } = useEmployees();

  const totalEmployees = employees?.length || 0;
  const superAdmins = employees?.filter(e => e.role === 'super_admin').length || 0;
  const regularEmployees = employees?.filter(e => e.role === 'employee').length || 0;

  return (
    <AdminLayout title="Employee Management" subtitle="Manage internal staff and permissions">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Total Staff"
            value={totalEmployees}
            icon={Users}
          />
          <StatCard
            title="Super Admins"
            value={superAdmins}
            icon={ShieldCheck}
          />
          <StatCard
            title="Employees"
            value={regularEmployees}
            icon={Shield}
          />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Staff Members</CardTitle>
            <CreateEmployeeDialog />
          </CardHeader>
          <CardContent>
            <EmployeeTable />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
