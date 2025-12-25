import { useState } from 'react';
import { Plus, Pencil, Trash2, Copy } from 'lucide-react';
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

export interface PermissionTemplate {
  id: string;
  name: string;
  description?: string;
  permissions: Record<string, boolean>;
}

const DEFAULT_TEMPLATES: PermissionTemplate[] = [
  { 
    id: 'full_access', 
    name: 'Full Access', 
    description: 'All permissions enabled',
    permissions: PERMISSIONS.reduce((acc, p) => ({ ...acc, [p.key]: true }), {})
  },
  { 
    id: 'read_only', 
    name: 'View Only', 
    description: 'Can only view reports',
    permissions: { view_reports: true }
  },
  { 
    id: 'operations', 
    name: 'Operations Team', 
    description: 'Shipments and customer management',
    permissions: { manage_shipments: true, manage_customers: true, view_reports: true }
  },
  { 
    id: 'finance', 
    name: 'Finance Team', 
    description: 'Invoices and expenses management',
    permissions: { manage_invoices: true, manage_expenses: true, view_reports: true }
  },
];

export function usePermissionTemplates() {
  const { data: settings, isLoading } = useSettings('permission_templates');
  const settingsValue = settings?.value as { templates?: PermissionTemplate[] } | undefined;
  const templates: PermissionTemplate[] = settingsValue?.templates || DEFAULT_TEMPLATES;
  
  return { templates, isLoading };
}

export function PermissionTemplatesSection() {
  const { data: settings, isLoading } = useSettings('permission_templates');
  const updateSettings = useUpdateSettings();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PermissionTemplate | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: {} as Record<string, boolean>,
  });

  const settingsValue = settings?.value as { templates?: PermissionTemplate[] } | undefined;
  const templates: PermissionTemplate[] = settingsValue?.templates || DEFAULT_TEMPLATES;

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      description: '',
      permissions: {},
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (template: PermissionTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      permissions: template.permissions || {},
    });
    setIsDialogOpen(true);
  };

  const handleDuplicate = (template: PermissionTemplate) => {
    setEditingTemplate(null);
    setFormData({
      name: `${template.name} (Copy)`,
      description: template.description || '',
      permissions: { ...template.permissions },
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Template name is required');
      return;
    }

    let updatedTemplates: PermissionTemplate[];
    
    if (editingTemplate) {
      updatedTemplates = templates.map(t => 
        t.id === editingTemplate.id 
          ? { ...t, name: formData.name, description: formData.description, permissions: formData.permissions }
          : t
      );
    } else {
      const newTemplate: PermissionTemplate = {
        id: crypto.randomUUID(),
        name: formData.name,
        description: formData.description,
        permissions: formData.permissions,
      };
      updatedTemplates = [...templates, newTemplate];
    }

    try {
      if (settings) {
        await updateSettings.mutateAsync({
          key: 'permission_templates',
          value: { templates: updatedTemplates },
        });
      } else {
        const { supabase } = await import('@/integrations/supabase/client');
        await supabase.from('settings').insert([{
          key: 'permission_templates',
          category: 'employees',
          description: 'Permission templates for quick assignment',
          value: JSON.parse(JSON.stringify({ templates: updatedTemplates })),
        }]);
      }
      toast.success(editingTemplate ? 'Template updated' : 'Template created');
      setIsDialogOpen(false);
    } catch (error) {
      toast.error('Failed to save template');
    }
  };

  const handleDelete = async () => {
    if (!deleteTemplateId) return;
    
    const updatedTemplates = templates.filter(t => t.id !== deleteTemplateId);
    
    try {
      await updateSettings.mutateAsync({
        key: 'permission_templates',
        value: { templates: updatedTemplates },
      });
      toast.success('Template deleted');
      setDeleteTemplateId(null);
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  const togglePermission = (key: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key],
      },
    }));
  };

  const selectAllPermissions = () => {
    setFormData(prev => ({
      ...prev,
      permissions: PERMISSIONS.reduce((acc, p) => ({ ...acc, [p.key]: true }), {}),
    }));
  };

  const clearAllPermissions = () => {
    setFormData(prev => ({
      ...prev,
      permissions: {},
    }));
  };

  const getEnabledCount = (permissions: Record<string, boolean>) => {
    return Object.values(permissions).filter(Boolean).length;
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
            <CardTitle>Permission Templates</CardTitle>
            <CardDescription>Pre-configured permission sets for quick assignment</CardDescription>
          </div>
          <Button onClick={handleOpenCreate} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Template
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="relative group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <h4 className="font-semibold">{template.name}</h4>
                      {template.description && (
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      )}
                      <Badge variant="secondary" className="mt-2">
                        {getEnabledCount(template.permissions)} / {PERMISSIONS.length} permissions
                      </Badge>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDuplicate(template)}
                        title="Duplicate"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenEdit(template)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTemplateId(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {Object.entries(template.permissions)
                      .filter(([, v]) => v)
                      .slice(0, 3)
                      .map(([key]) => (
                        <Badge key={key} variant="outline" className="text-xs">
                          {PERMISSIONS.find(p => p.key === key)?.label || key}
                        </Badge>
                      ))}
                    {getEnabledCount(template.permissions) > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{getEnabledCount(template.permissions) - 3} more
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Permission Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Operations Manager"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">Description</Label>
              <Input
                id="template-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this template"
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Permissions</Label>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAllPermissions}>
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearAllPermissions}>
                    Clear All
                  </Button>
                </div>
              </div>
              <div className="grid gap-2 rounded-lg border p-3 max-h-[200px] overflow-y-auto">
                {PERMISSIONS.map((permission) => (
                  <div key={permission.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tpl-perm-${permission.key}`}
                      checked={formData.permissions[permission.key] || false}
                      onCheckedChange={() => togglePermission(permission.key)}
                    />
                    <Label htmlFor={`tpl-perm-${permission.key}`} className="font-normal cursor-pointer">
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
              {updateSettings.isPending ? 'Saving...' : (editingTemplate ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTemplateId} onOpenChange={() => setDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this permission template. This action cannot be undone.
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
