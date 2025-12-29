import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, PermissionKey } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface PermissionGateProps {
  children: ReactNode;
  permission?: PermissionKey;
  fallback?: ReactNode;
  redirectTo?: string;
}

/**
 * PermissionGate - Protects routes/components based on user permissions
 * 
 * - If no permission is specified, allows access to all admin/employees
 * - Super admins automatically have all permissions
 * - If user lacks permission, redirects to specified route or shows fallback
 */
export function PermissionGate({ 
  children, 
  permission, 
  fallback,
  redirectTo = '/admin' 
}: PermissionGateProps) {
  const { loading, isAdmin, hasPermission } = useAuth();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If user is not an admin/employee at all, redirect to main admin
  if (!isAdmin()) {
    return <Navigate to={redirectTo} replace />;
  }

  // If no specific permission required, allow access
  if (!permission) {
    return <>{children}</>;
  }

  // Check if user has the required permission
  if (hasPermission(permission)) {
    return <>{children}</>;
  }

  // User lacks permission - show fallback or redirect
  if (fallback) {
    return <>{fallback}</>;
  }

  return <Navigate to={redirectTo} replace />;
}

/**
 * Hook to check permissions in components
 */
export function usePermissionCheck(permission: PermissionKey): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}
