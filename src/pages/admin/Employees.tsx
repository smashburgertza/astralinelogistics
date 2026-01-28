import { useState } from 'react';
import { Users, ShieldCheck, Shield, FileText, Settings2, Key } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatCard } from '@/components/admin/StatCard';
import { EmployeeTable } from '@/components/admin/EmployeeTable';
import { CreateEmployeeDialog } from '@/components/admin/CreateEmployeeDialog';
import { AuditLogTable } from '@/components/admin/AuditLogTable';
import { CustomRolesSection } from '@/components/admin/CustomRolesSection';
import { PermissionTemplatesSection } from '@/components/admin/PermissionTemplatesSection';
import { GenericBulkActionsBar } from '@/components/admin/shared/GenericBulkActionsBar';
import { useEmployees, useBulkDeleteEmployees } from '@/hooks/useEmployees';

export default function AdminEmployeesPage() {
  const { data: employees } = useEmployees();
  const bulkDelete = useBulkDeleteEmployees();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const totalEmployees = employees?.length || 0;
  const superAdmins = employees?.filter(e => e.role === 'super_admin').length || 0;
  const regularEmployees = employees?.filter(e => e.role === 'employee').length || 0;

  const handleBulkDelete = async () => {
    await bulkDelete.mutateAsync(selectedIds);
    setSelectedIds([]);
  };

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

        <Tabs defaultValue="employees" className="space-y-4">
          <TabsList>
            <TabsTrigger value="employees" className="gap-2">
              <Users className="h-4 w-4" />
              Staff Members
            </TabsTrigger>
            <TabsTrigger value="roles" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Custom Roles
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <Key className="h-4 w-4" />
              Permission Templates
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <FileText className="h-4 w-4" />
              Audit Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="employees">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Staff Members</CardTitle>
                <CreateEmployeeDialog />
              </CardHeader>
              <CardContent className="space-y-4">
                <GenericBulkActionsBar
                  selectedCount={selectedIds.length}
                  onClearSelection={() => setSelectedIds([])}
                  onDelete={handleBulkDelete}
                  itemLabel="employee"
                  isDeleting={bulkDelete.isPending}
                  deleteWarning="This will remove their employee role. Their user account will remain active as a customer."
                />
                <EmployeeTable 
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles">
            <CustomRolesSection />
          </TabsContent>

          <TabsContent value="templates">
            <PermissionTemplatesSection />
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
              </CardHeader>
              <CardContent>
                <AuditLogTable />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
