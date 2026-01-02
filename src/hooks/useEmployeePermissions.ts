import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Define all modules and their available actions
export const PERMISSION_MODULES = {
  shipments: {
    label: 'Shipments',
    description: 'Manage shipments and parcels',
    actions: ['view', 'create', 'edit', 'delete', 'export'] as const,
    specialActions: {
      'manage': 'Manage batch assignments',
    }
  },
  customers: {
    label: 'Customers',
    description: 'Manage customer records',
    actions: ['view', 'create', 'edit', 'delete', 'export'] as const,
    specialActions: {}
  },
  invoices: {
    label: 'Invoices & Billing',
    description: 'Manage invoices and payments',
    actions: ['view', 'create', 'edit', 'delete', 'export'] as const,
    specialActions: {
      'approve': 'Record/verify payments',
    }
  },
  estimates: {
    label: 'Estimates',
    description: 'Manage shipping estimates',
    actions: ['view', 'create', 'edit', 'delete'] as const,
    specialActions: {
      'approve': 'Convert to invoice',
    }
  },
  expenses: {
    label: 'Expenses',
    description: 'Manage company expenses',
    actions: ['view', 'create', 'edit', 'delete', 'export'] as const,
    specialActions: {
      'approve': 'Approve/deny expenses',
    }
  },
  employees: {
    label: 'Employees',
    description: 'Manage employee records',
    actions: ['view', 'create', 'edit', 'delete'] as const,
    specialActions: {
      'manage': 'Manage permissions',
    }
  },
  agents: {
    label: 'Agents',
    description: 'Manage agent accounts',
    actions: ['view', 'create', 'edit', 'delete'] as const,
    specialActions: {
      'manage': 'Manage agent regions',
    }
  },
  accounting: {
    label: 'Accounting',
    description: 'Chart of accounts, journal entries, bank accounts',
    actions: ['view', 'create', 'edit', 'delete', 'export'] as const,
    specialActions: {
      'approve': 'Post journal entries',
      'manage': 'Close fiscal periods',
    }
  },
  payroll: {
    label: 'Payroll',
    description: 'Manage salaries and payroll runs',
    actions: ['view', 'create', 'edit', 'delete'] as const,
    specialActions: {
      'approve': 'Process payroll',
    }
  },
  commissions: {
    label: 'Commissions',
    description: 'Manage employee commissions',
    actions: ['view', 'create', 'edit', 'delete'] as const,
    specialActions: {
      'approve': 'Pay commissions',
    }
  },
  analytics: {
    label: 'Analytics & Reports',
    description: 'View business analytics and reports',
    actions: ['view', 'export'] as const,
    specialActions: {}
  },
  settings: {
    label: 'Settings',
    description: 'System configuration and pricing',
    actions: ['view', 'edit'] as const,
    specialActions: {
      'manage': 'Manage regions and pricing',
    }
  },
  approvals: {
    label: 'Approvals',
    description: 'Approval requests and workflows',
    actions: ['view'] as const,
    specialActions: {
      'approve': 'Review and approve requests',
    }
  },
  orders: {
    label: 'Shop For Me Orders',
    description: 'Manage shopping orders',
    actions: ['view', 'create', 'edit', 'delete'] as const,
    specialActions: {
      'approve': 'Process orders',
    }
  },
  notifications: {
    label: 'Notifications',
    description: 'System notifications management',
    actions: ['view', 'create'] as const,
    specialActions: {
      'manage': 'Send bulk notifications',
    }
  },
  audit_logs: {
    label: 'Audit Logs',
    description: 'View system audit trail',
    actions: ['view', 'export'] as const,
    specialActions: {}
  },
} as const;

export type ModuleKey = keyof typeof PERMISSION_MODULES;
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export' | 'manage';

export interface EmployeePermission {
  id: string;
  employee_id: string;
  module: string;
  action: PermissionAction;
  created_at: string;
  updated_at: string;
  granted_by: string | null;
}

export function useEmployeePermissions(employeeId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: permissions, isLoading } = useQuery({
    queryKey: ['employee-permissions', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      
      const { data, error } = await supabase
        .from('employee_permissions' as any)
        .select('*')
        .eq('employee_id', employeeId);

      if (error) throw error;
      return (data || []) as unknown as EmployeePermission[];
    },
    enabled: !!employeeId,
  });

  const updatePermissions = useMutation({
    mutationFn: async ({ 
      employeeId, 
      permissions: newPermissions 
    }: { 
      employeeId: string; 
      permissions: { module: string; action: PermissionAction }[] 
    }) => {
      // Get current user for granted_by field
      const { data: { user } } = await supabase.auth.getUser();
      
      // Delete all existing permissions for this employee
      const { error: deleteError } = await supabase
        .from('employee_permissions' as any)
        .delete()
        .eq('employee_id', employeeId);

      if (deleteError) throw deleteError;

      // Insert new permissions
      if (newPermissions.length > 0) {
        const { error: insertError } = await supabase
          .from('employee_permissions' as any)
          .insert(
            newPermissions.map(p => ({
              employee_id: employeeId,
              module: p.module,
              action: p.action,
              granted_by: user?.id,
            }))
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-permissions', employeeId] });
      toast({
        title: 'Permissions updated',
        description: 'Employee permissions have been saved successfully.',
      });
    },
    onError: (error) => {
      console.error('Failed to update permissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to update permissions. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const hasPermission = (module: string, action: PermissionAction): boolean => {
    if (!permissions) return false;
    return permissions.some(p => p.module === module && p.action === action);
  };

  const getModulePermissions = (module: string): PermissionAction[] => {
    if (!permissions) return [];
    return permissions
      .filter(p => p.module === module)
      .map(p => p.action as PermissionAction);
  };

  return {
    permissions,
    isLoading,
    updatePermissions,
    hasPermission,
    getModulePermissions,
  };
}

// Hook to check current user's permissions
export function useCurrentUserPermissions() {
  const { data: permissions, isLoading } = useQuery({
    queryKey: ['current-user-permissions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Check if super admin first
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const isSuperAdmin = roles?.some(r => r.role === 'super_admin');
      
      if (isSuperAdmin) {
        // Super admins have all permissions
        const allPermissions: { module: string; action: PermissionAction }[] = [];
        Object.keys(PERMISSION_MODULES).forEach(module => {
          const moduleConfig = PERMISSION_MODULES[module as ModuleKey];
          moduleConfig.actions.forEach(action => {
            allPermissions.push({ module, action: action as PermissionAction });
          });
          Object.keys(moduleConfig.specialActions).forEach(action => {
            allPermissions.push({ module, action: action as PermissionAction });
          });
        });
        return allPermissions;
      }

      const { data, error } = await supabase
        .from('employee_permissions' as any)
        .select('module, action')
        .eq('employee_id', user.id);

      if (error) throw error;
      return (data || []) as unknown as { module: string; action: PermissionAction }[];
    },
  });

  const can = (module: string, action: PermissionAction): boolean => {
    if (!permissions) return false;
    return permissions.some(p => p.module === module && p.action === action);
  };

  return {
    permissions,
    isLoading,
    can,
  };
}
