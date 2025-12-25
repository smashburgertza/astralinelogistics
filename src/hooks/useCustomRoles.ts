import { useSettings } from '@/hooks/useSettings';
import { EMPLOYEE_ROLES } from '@/hooks/useEmployees';

export interface CustomRole {
  id: string;
  name: string;
  label: string;
  description?: string;
  defaultPermissions: Record<string, boolean>;
}

const DEFAULT_ROLES: CustomRole[] = [
  { id: 'manager', name: 'manager', label: 'Manager', description: 'Full access to all features', defaultPermissions: {} },
  { id: 'operations', name: 'operations', label: 'Operations', description: 'Manage shipments and logistics', defaultPermissions: {} },
  { id: 'finance', name: 'finance', label: 'Finance', description: 'Handle invoices and expenses', defaultPermissions: {} },
  { id: 'customer_support', name: 'customer_support', label: 'Customer Support', description: 'Assist customers', defaultPermissions: {} },
];

export function useCustomRoles() {
  const { data: settings, isLoading } = useSettings('employee_roles');
  const settingsValue = settings?.value as { roles?: CustomRole[] } | undefined;
  const roles: CustomRole[] = settingsValue?.roles || DEFAULT_ROLES;
  
  // Convert to the format expected by forms (value/label pairs)
  const roleOptions = roles.map(role => ({
    value: role.name,
    label: role.label,
    defaultPermissions: role.defaultPermissions,
  }));

  // Function to get role label by value
  const getRoleLabel = (value: string): string => {
    const role = roles.find(r => r.name === value);
    if (role) return role.label;
    // Fallback to hardcoded roles for backwards compatibility
    const hardcoded = EMPLOYEE_ROLES.find(r => r.value === value);
    return hardcoded?.label || value;
  };

  // Function to get default permissions for a role
  const getRoleDefaultPermissions = (value: string): Record<string, boolean> => {
    const role = roles.find(r => r.name === value);
    return role?.defaultPermissions || {};
  };

  return { 
    roles, 
    roleOptions, 
    getRoleLabel, 
    getRoleDefaultPermissions,
    isLoading 
  };
}
