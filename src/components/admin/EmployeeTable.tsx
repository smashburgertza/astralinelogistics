import { useState } from 'react';
import { format } from 'date-fns';
import { MoreHorizontal, Shield, ShieldCheck, Pencil } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  useEmployees,
  useUpdateEmployee,
  useDeleteEmployee,
  Employee,
  EMPLOYEE_ROLES,
  PERMISSIONS,
} from '@/hooks/useEmployees';

export function EmployeeTable() {
  const { data: employees, isLoading } = useEmployees();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState({
    employeeRole: '',
    isSuperAdmin: false,
    permissions: {} as Record<string, boolean>,
  });

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setEditForm({
      employeeRole: employee.employee_role || '',
      isSuperAdmin: employee.role === 'super_admin',
      permissions: (employee.permissions as Record<string, boolean>) || {},
    });
  };

  const handleSaveEdit = async () => {
    if (!editingEmployee) return;
    await updateEmployee.mutateAsync({
      userId: editingEmployee.user_id,
      ...editForm,
    });
    setEditingEmployee(null);
  };

  const getRoleBadge = (employee: Employee) => {
    if (employee.role === 'super_admin') {
      return (
        <Badge variant="default" className="gap-1">
          <ShieldCheck className="h-3 w-3" />
          Super Admin
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <Shield className="h-3 w-3" />
        {EMPLOYEE_ROLES.find(r => r.value === employee.employee_role)?.label || 'Employee'}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees?.map((employee) => (
            <TableRow key={employee.user_id}>
              <TableCell className="font-medium">
                {employee.profile?.full_name || 'N/A'}
              </TableCell>
              <TableCell>{employee.profile?.email || 'N/A'}</TableCell>
              <TableCell>{getRoleBadge(employee)}</TableCell>
              <TableCell>
                {employee.role === 'super_admin' ? (
                  <span className="text-sm text-muted-foreground">Full Access</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(employee.permissions || {})
                      .filter(([, v]) => v)
                      .slice(0, 3)
                      .map(([key]) => (
                        <Badge key={key} variant="outline" className="text-xs">
                          {PERMISSIONS.find(p => p.key === key)?.label || key}
                        </Badge>
                      ))}
                    {Object.values(employee.permissions || {}).filter(Boolean).length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{Object.values(employee.permissions || {}).filter(Boolean).length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </TableCell>
              <TableCell>
                {employee.created_at
                  ? format(new Date(employee.created_at), 'MMM d, yyyy')
                  : 'N/A'}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(employee)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Permissions
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => deleteEmployee.mutate(employee.user_id)}
                    >
                      Remove Employee
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
          {employees?.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No employees found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={!!editingEmployee} onOpenChange={() => setEditingEmployee(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Employee Permissions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Department/Role</Label>
              <Select
                value={editForm.employeeRole}
                onValueChange={(v) => setEditForm({ ...editForm, employeeRole: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label>Super Admin</Label>
                <p className="text-sm text-muted-foreground">Full access to all features</p>
              </div>
              <Switch
                checked={editForm.isSuperAdmin}
                onCheckedChange={(v) => setEditForm({ ...editForm, isSuperAdmin: v })}
              />
            </div>

            {!editForm.isSuperAdmin && (
              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="grid gap-2 rounded-lg border p-3">
                  {PERMISSIONS.map((permission) => (
                    <div key={permission.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={permission.key}
                        checked={editForm.permissions[permission.key] || false}
                        onCheckedChange={(checked) =>
                          setEditForm({
                            ...editForm,
                            permissions: {
                              ...editForm.permissions,
                              [permission.key]: !!checked,
                            },
                          })
                        }
                      />
                      <Label htmlFor={permission.key} className="font-normal cursor-pointer">
                        {permission.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleSaveEdit}
              disabled={updateEmployee.isPending}
            >
              {updateEmployee.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
