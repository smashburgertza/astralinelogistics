import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
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
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useCreateEmployee, EMPLOYEE_ROLES, PERMISSIONS } from '@/hooks/useEmployees';
import { usePermissionTemplates } from '@/components/admin/PermissionTemplatesSection';

const formSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  employeeRole: z.string().min(1, 'Please select a role'),
  isSuperAdmin: z.boolean(),
  permissions: z.record(z.boolean()),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateEmployeeDialog() {
  const [open, setOpen] = useState(false);
  const createEmployee = useCreateEmployee();
  const { templates } = usePermissionTemplates();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      fullName: '',
      phone: '',
      employeeRole: '',
      isSuperAdmin: false,
      permissions: PERMISSIONS.reduce((acc, p) => ({ ...acc, [p.key]: false }), {}),
    },
  });

  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      const newPermissions = PERMISSIONS.reduce((acc, p) => ({
        ...acc,
        [p.key]: template.permissions[p.key] || false,
      }), {} as Record<string, boolean>);
      form.setValue('permissions', newPermissions);
    }
  };

  const onSubmit = async (values: FormValues) => {
    await createEmployee.mutateAsync({
      email: values.email,
      password: values.password,
      fullName: values.fullName,
      phone: values.phone,
      employeeRole: values.employeeRole,
      isSuperAdmin: values.isSuperAdmin,
      permissions: values.permissions,
    });
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Employee</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="employee@company.com" {...field} />
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
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                  <FormLabel>Department/Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EMPLOYEE_ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isSuperAdmin"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Super Admin</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Full access to all features
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {!form.watch('isSuperAdmin') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <FormLabel>Permissions</FormLabel>
                </div>
                
                {/* Quick Apply Templates */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Quick apply a template:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {templates.map((template) => (
                      <Badge
                        key={template.id}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => applyTemplate(template.id)}
                      >
                        {template.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2 rounded-lg border p-3">
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
                          <FormLabel className="font-normal cursor-pointer">
                            {permission.label}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={createEmployee.isPending}>
              {createEmployee.isPending ? 'Creating...' : 'Create Employee'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
