import { useState } from 'react';
import { format } from 'date-fns';
import { MoreHorizontal, Pencil, Trash2, Shield } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useEmployees,
  useUpdateEmployee,
  useDeleteEmployee,
  EMPLOYEE_ROLES,
  EmployeeRole,
  Employee,
} from '@/hooks/useEmployees';

const PERMISSIONS = [
  { key: 'manage_shipments', label: 'Manage Shipments' },
  { key: 'manage_customers', label: 'Manage Customers' },
  { key: 'manage_invoices', label: 'Manage Invoices' },
  { key: 'manage_payments', label: 'Manage Payments' },
  { key: 'manage_expenses', label: 'Manage Expenses' },
  { key: 'view_reports', label: 'View Reports' },
  { key: 'manage_agents', label: 'Manage Agents' },
];

export function EmployeeTable() {
  const { data: employees, isLoading } = useEmployees();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();
  
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [editRole, setEditRole] = useState<EmployeeRole>('support');
  const [editPermissions, setEditPermissions] = useState<Record<string, boolean>>({});

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setEditRole(employee.employee_role || 'support');
    setEditPermissions(employee.permissions || {});
  };

  const handleSaveEdit = async () => {
    if (!editingEmployee) return;
    await updateEmployee.mutateAsync({
      userId: editingEmployee.user_id,
      employeeRole: editRole,
      permissions: editPermissions,
    });
    setEditingEmployee(null);
  };

  const handleDelete = async () => {
    if (!deletingEmployee) return;
    await deleteEmployee.mutateAsync(deletingEmployee.user_id);
    setDeletingEmployee(null);
  };

  const togglePermission = (key: string) => {
    setEditPermissions(prev => ({ ...prev, [key]: !prev[key] }));
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

  if (!employees?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Shield className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <p>No employees yet. Create your first employee above.</p>
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
          {employees.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell className="font-medium">
                {employee.profile?.full_name || 'Unknown'}
              </TableCell>
              <TableCell>{employee.profile?.email}</TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {employee.employee_role ? EMPLOYEE_ROLES[employee.employee_role]?.label : 'No Role'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(employee.permissions || {})
                    .filter(([_, v]) => v)
                    .slice(0, 3)
                    .map(([key]) => (
                      <Badge key={key} variant="outline" className="text-xs">
                        {PERMISSIONS.find(p => p.key === key)?.label || key}
                      </Badge>
                    ))}
                  {Object.values(employee.permissions || {}).filter(Boolean).length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{Object.values(employee.permissions || {}).filter(Boolean).length - 3} more
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {employee.created_at ? format(new Date(employee.created_at), 'MMM d, yyyy') : '-'}
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
                      onClick={() => setDeletingEmployee(employee)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove Employee
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Edit Dialog */}
      <Dialog open={!!editingEmployee} onOpenChange={() => setEditingEmployee(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update role and permissions for {editingEmployee?.profile?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as EmployeeRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EMPLOYEE_ROLES).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="grid grid-cols-2 gap-2 pt-2">
                {PERMISSIONS.map((permission) => (
                  <div key={permission.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={permission.key}
                      checked={editPermissions[permission.key] || false}
                      onCheckedChange={() => togglePermission(permission.key)}
                    />
                    <Label htmlFor={permission.key} className="text-sm font-normal cursor-pointer">
                      {permission.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setEditingEmployee(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={updateEmployee.isPending}>
                {updateEmployee.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingEmployee} onOpenChange={() => setDeletingEmployee(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {deletingEmployee?.profile?.full_name}? 
              They will be converted to a regular customer account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
