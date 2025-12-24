import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateEmployee, EMPLOYEE_ROLES, EmployeeRole } from '@/hooks/useEmployees';

const PERMISSIONS = [
  { key: 'manage_shipments', label: 'Manage Shipments' },
  { key: 'manage_customers', label: 'Manage Customers' },
  { key: 'manage_invoices', label: 'Manage Invoices' },
  { key: 'manage_payments', label: 'Manage Payments' },
  { key: 'manage_expenses', label: 'Manage Expenses' },
  { key: 'view_reports', label: 'View Reports' },
  { key: 'manage_agents', label: 'Manage Agents' },
];

const formSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  employeeRole: z.enum(['manager', 'accountant', 'operations', 'support']),
  permissions: z.record(z.boolean()),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateEmployeeDialog() {
  const [open, setOpen] = useState(false);
  const createEmployee = useCreateEmployee();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      fullName: '',
      phone: '',
      employeeRole: 'support',
      permissions: PERMISSIONS.reduce((acc, p) => ({ ...acc, [p.key]: false }), {}),
    },
  });

  const selectedRole = form.watch('employeeRole');

  // Auto-set permissions based on role
  const handleRoleChange = (role: EmployeeRole) => {
    form.setValue('employeeRole', role);
    
    const permissionMap: Record<EmployeeRole, string[]> = {
      manager: PERMISSIONS.map(p => p.key),
      accountant: ['manage_invoices', 'manage_payments', 'manage_expenses', 'view_reports'],
      operations: ['manage_shipments', 'manage_customers', 'view_reports'],
      support: ['view_reports'],
    };

    const newPermissions = PERMISSIONS.reduce((acc, p) => ({
      ...acc,
      [p.key]: permissionMap[role].includes(p.key),
    }), {});

    form.setValue('permissions', newPermissions);
  };

  async function onSubmit(values: FormValues) {
    await createEmployee.mutateAsync({
      email: values.email,
      password: values.password,
      fullName: values.fullName,
      phone: values.phone || undefined,
      employeeRole: values.employeeRole,
      permissions: values.permissions,
    });
    setOpen(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Employee</DialogTitle>
          <DialogDescription>
            Add a new employee with specific role and permissions.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 234 567 8900" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="employeeRole"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={handleRoleChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(EMPLOYEE_ROLES).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex flex-col">
                            <span>{value.label}</span>
                            <span className="text-xs text-muted-foreground">{value.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-3">
              <FormLabel>Permissions</FormLabel>
              <FormDescription>
                Customize permissions for this employee. Pre-filled based on role.
              </FormDescription>
              <div className="grid grid-cols-2 gap-2">
                {PERMISSIONS.map((permission) => (
                  <FormField
                    key={permission.key}
                    control={form.control}
                    name={`permissions.${permission.key}`}
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal cursor-pointer">
                          {permission.label}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createEmployee.isPending}>
                {createEmployee.isPending ? 'Creating...' : 'Create Employee'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
