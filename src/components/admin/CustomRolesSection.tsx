import { useState } from 'react';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';
import { PERMISSIONS } from '@/hooks/useEmployees';
import { toast } from 'sonner';

interface CustomRole {
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

export function CustomRolesSection() {
  const { data: settings, isLoading } = useSettings('employee_roles');
  const updateSettings = useUpdateSettings();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    description: '',
    defaultPermissions: {} as Record<string, boolean>,
  });

  const settingsValue = settings?.value as { roles?: CustomRole[] } | undefined;
  const roles: CustomRole[] = settingsValue?.roles || DEFAULT_ROLES;

  const handleOpenCreate = () => {
    setEditingRole(null);
    setFormData({
      name: '',
      label: '',
      description: '',
      defaultPermissions: {},
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (role: CustomRole) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      label: role.label,
      description: role.description || '',
      defaultPermissions: role.defaultPermissions || {},
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.label.trim()) {
      toast.error('Name and label are required');
      return;
    }

    const roleName = formData.name.toLowerCase().replace(/\s+/g, '_');
    
    let updatedRoles: CustomRole[];
    
    if (editingRole) {
      updatedRoles = roles.map(r => 
        r.id === editingRole.id 
          ? { ...r, name: roleName, label: formData.label, description: formData.description, defaultPermissions: formData.defaultPermissions }
          : r
      );
    } else {
      const newRole: CustomRole = {
        id: crypto.randomUUID(),
        name: roleName,
        label: formData.label,
        description: formData.description,
        defaultPermissions: formData.defaultPermissions,
      };
      updatedRoles = [...roles, newRole];
    }

    try {
      if (settings) {
        await updateSettings.mutateAsync({
          key: 'employee_roles',
          value: { roles: updatedRoles },
        });
      } else {
        // Settings don't exist yet, need to create them
        const { supabase } = await import('@/integrations/supabase/client');
        await supabase.from('settings').insert([{
          key: 'employee_roles',
          category: 'employees',
          description: 'Custom employee roles configuration',
          value: JSON.parse(JSON.stringify({ roles: updatedRoles })),
        }]);
      }
      toast.success(editingRole ? 'Role updated' : 'Role created');
      setIsDialogOpen(false);
    } catch (error) {
      toast.error('Failed to save role');
    }
  };

  const handleDelete = async () => {
    if (!deleteRoleId) return;
    
    const updatedRoles = roles.filter(r => r.id !== deleteRoleId);
    
    try {
      await updateSettings.mutateAsync({
        key: 'employee_roles',
        value: { roles: updatedRoles },
      });
      toast.success('Role deleted');
      setDeleteRoleId(null);
    } catch (error) {
      toast.error('Failed to delete role');
    }
  };

  const togglePermission = (key: string) => {
    setFormData(prev => ({
      ...prev,
      defaultPermissions: {
        ...prev.defaultPermissions,
        [key]: !prev.defaultPermissions[key],
      },
    }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Custom Roles</CardTitle>
            <CardDescription>Define roles and their default permissions for employees</CardDescription>
          </div>
          <Button onClick={handleOpenCreate} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Role
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => (
              <Card key={role.id} className="relative group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="font-semibold">{role.label}</h4>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {role.name}
                      </Badge>
                      {role.description && (
                        <p className="text-sm text-muted-foreground mt-2">{role.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenEdit(role)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteRoleId(role.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {Object.keys(role.defaultPermissions || {}).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {Object.entries(role.defaultPermissions)
                        .filter(([, v]) => v)
                        .map(([key]) => (
                          <Badge key={key} variant="outline" className="text-xs">
                            {PERMISSIONS.find(p => p.key === key)?.label || key}
                          </Badge>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role-label">Display Name</Label>
              <Input
                id="role-label"
                value={formData.label}
                onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                placeholder="e.g., Sales Manager"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-name">Identifier</Label>
              <Input
                id="role-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., sales_manager"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">Used internally, lowercase with underscores</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-description">Description</Label>
              <Input
                id="role-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this role"
              />
            </div>
            <div className="space-y-3">
              <Label>Default Permissions</Label>
              <p className="text-xs text-muted-foreground">These permissions will be pre-selected when assigning this role</p>
              <div className="grid gap-2">
                {PERMISSIONS.map((permission) => (
                  <div key={permission.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`perm-${permission.key}`}
                      checked={formData.defaultPermissions[permission.key] || false}
                      onCheckedChange={() => togglePermission(permission.key)}
                    />
                    <Label htmlFor={`perm-${permission.key}`} className="font-normal cursor-pointer">
                      {permission.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateSettings.isPending}>
              {updateSettings.isPending ? 'Saving...' : (editingRole ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteRoleId} onOpenChange={() => setDeleteRoleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the role from the system. Employees currently assigned this role will keep their permissions but the role label will no longer be available for new assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
