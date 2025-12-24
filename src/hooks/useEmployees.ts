import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const EMPLOYEE_ROLES = {
  manager: { label: 'Manager', description: 'Full access to all features' },
  accountant: { label: 'Accountant', description: 'Access to invoices, payments, expenses' },
  operations: { label: 'Operations', description: 'Access to shipments and customers' },
  support: { label: 'Support', description: 'View-only access to most features' },
} as const;

export type EmployeeRole = keyof typeof EMPLOYEE_ROLES;

export interface Employee {
  id: string;
  user_id: string;
  role: 'employee';
  employee_role: EmployeeRole | null;
  permissions: Record<string, boolean>;
  created_at: string;
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
  } | null;
}

export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data: employeeRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('role', 'employee');

      if (rolesError) throw rolesError;
      if (!employeeRoles?.length) return [];

      const userIds = employeeRoles.map(r => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const employees: Employee[] = employeeRoles.map(role => ({
        id: role.id,
        user_id: role.user_id,
        role: 'employee' as const,
        employee_role: role.employee_role as EmployeeRole | null,
        permissions: (role.permissions as Record<string, boolean>) || {},
        created_at: role.created_at || '',
        profile: profiles?.find(p => p.id === role.user_id) || null,
      }));

      return employees;
    },
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      email, 
      password, 
      fullName, 
      phone,
      employeeRole,
      permissions,
    }: { 
      email: string; 
      password: string; 
      fullName: string;
      phone?: string;
      employeeRole: EmployeeRole;
      permissions: Record<string, boolean>;
    }) => {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      const userId = authData.user.id;

      if (phone) {
        await supabase
          .from('profiles')
          .update({ phone, full_name: fullName })
          .eq('id', userId);
      }

      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ 
          role: 'employee',
          employee_role: employeeRole,
          permissions,
        })
        .eq('user_id', userId);

      if (roleError) throw roleError;

      return { userId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create employee: ${error.message}`);
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      employeeRole,
      permissions,
    }: { 
      userId: string; 
      employeeRole: EmployeeRole;
      permissions: Record<string, boolean>;
    }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ employee_role: employeeRole, permissions })
        .eq('user_id', userId)
        .eq('role', 'employee');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee updated');
    },
    onError: (error: any) => {
      toast.error(`Failed to update employee: ${error.message}`);
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: 'customer', employee_role: null, permissions: {} })
        .eq('user_id', userId)
        .eq('role', 'employee');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee removed');
    },
    onError: (error: any) => {
      toast.error(`Failed to remove employee: ${error.message}`);
    },
  });
}
