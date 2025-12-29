import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Employee {
  user_id: string;
  role: 'employee' | 'super_admin';
  employee_role: string | null;
  permissions: Record<string, boolean> | null;
  profile: {
    email: string;
    full_name: string | null;
    phone: string | null;
  } | null;
  created_at: string | null;
}

export const EMPLOYEE_ROLES = [
  { value: 'manager', label: 'Manager' },
  { value: 'operations', label: 'Operations' },
  { value: 'finance', label: 'Finance' },
  { value: 'customer_support', label: 'Customer Support' },
] as const;

export const PERMISSIONS = [
  { key: 'manage_shipments', label: 'Manage Shipments' },
  { key: 'manage_invoices', label: 'Manage Invoices' },
  { key: 'manage_customers', label: 'Manage Customers' },
  { key: 'manage_agents', label: 'Manage Agents' },
  { key: 'manage_expenses', label: 'Manage Expenses' },
  { key: 'approve_expenses', label: 'Approve Expenses' },
  { key: 'view_reports', label: 'View Reports' },
  { key: 'manage_settings', label: 'Manage Settings' },
] as const;

// Hook to fetch employees who can approve expenses
export function useExpenseApprovers() {
  return useQuery({
    queryKey: ['expense-approvers'],
    queryFn: async () => {
      // Get all employees and super_admins
      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select('user_id, role, permissions')
        .in('role', ['employee', 'super_admin']);

      if (error) throw error;

      // Filter to only those with approve_expenses permission or super_admin
      const approverIds = userRoles
        .filter(r => 
          r.role === 'super_admin' || 
          (r.permissions && (r.permissions as Record<string, boolean>)['approve_expenses'])
        )
        .map(r => r.user_id);

      if (approverIds.length === 0) return [];

      // Get profiles for approvers
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', approverIds);

      return profiles || [];
    },
  });
}

export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select('user_id, role, employee_role, permissions, created_at')
        .in('role', ['employee', 'super_admin']);

      if (error) throw error;

      const userIds = userRoles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return userRoles.map(role => ({
        ...role,
        profile: profileMap.get(role.user_id) || null,
      })) as Employee[];
    },
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      email: string;
      password: string;
      fullName: string;
      phone?: string;
      employeeRole: string;
      isSuperAdmin: boolean;
      permissions: Record<string, boolean>;
    }) => {
      // Store current admin session before creating new user
      const { data: currentSession } = await supabase.auth.getSession();
      const adminSession = currentSession.session;

      // Create user via auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: data.fullName },
        },
      });

      if (authError) {
        // Restore admin session if signup failed
        if (adminSession) {
          await supabase.auth.setSession(adminSession);
        }
        throw authError;
      }
      if (!authData.user) {
        if (adminSession) {
          await supabase.auth.setSession(adminSession);
        }
        throw new Error('Failed to create user');
      }

      // Restore admin session and wait for it to be ready
      if (adminSession) {
        await supabase.auth.setSession(adminSession);
        // Small delay to ensure session is propagated
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: data.fullName,
          phone: data.phone || null,
        })
        .eq('id', authData.user.id);

      if (profileError) throw profileError;

      // Update user_roles - change from customer to employee/super_admin
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({
          role: data.isSuperAdmin ? 'super_admin' : 'employee',
          employee_role: data.employeeRole,
          permissions: data.permissions,
        })
        .eq('user_id', authData.user.id);

      if (roleError) throw roleError;

      return authData.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create employee');
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      userId: string;
      employeeRole: string;
      isSuperAdmin: boolean;
      permissions: Record<string, boolean>;
    }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({
          role: data.isSuperAdmin ? 'super_admin' : 'employee',
          employee_role: data.employeeRole,
          permissions: data.permissions,
        })
        .eq('user_id', data.userId)
        .in('role', ['employee', 'super_admin']);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update employee');
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      // Demote to customer role
      const { error } = await supabase
        .from('user_roles')
        .update({
          role: 'customer',
          employee_role: null,
          permissions: null,
        })
        .eq('user_id', userId)
        .in('role', ['employee', 'super_admin']);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee removed successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove employee');
    },
  });
}
