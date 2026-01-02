import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, ShieldCheck, ShieldX, Eye, Plus, Pencil, Trash2, Check, Download, Settings } from 'lucide-react';
import { useEmployeePermissions, PERMISSION_MODULES, ModuleKey, PermissionAction } from '@/hooks/useEmployeePermissions';
import { cn } from '@/lib/utils';

interface EmployeePermissionsManagerProps {
  employeeId: string;
  employeeName: string;
  isSuperAdmin?: boolean;
  readOnly?: boolean;
}

const ACTION_ICONS: Record<PermissionAction, React.ReactNode> = {
  view: <Eye className="w-3.5 h-3.5" />,
  create: <Plus className="w-3.5 h-3.5" />,
  edit: <Pencil className="w-3.5 h-3.5" />,
  delete: <Trash2 className="w-3.5 h-3.5" />,
  approve: <Check className="w-3.5 h-3.5" />,
  export: <Download className="w-3.5 h-3.5" />,
  manage: <Settings className="w-3.5 h-3.5" />,
};

const ACTION_LABELS: Record<PermissionAction, string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  approve: 'Approve',
  export: 'Export',
  manage: 'Manage',
};

export function EmployeePermissionsManager({ 
  employeeId, 
  employeeName,
  isSuperAdmin = false,
  readOnly = false,
}: EmployeePermissionsManagerProps) {
  const { permissions, isLoading, updatePermissions, hasPermission } = useEmployeePermissions(employeeId);
  const [localPermissions, setLocalPermissions] = useState<Map<string, Set<PermissionAction>>>(new Map());
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local permissions from fetched data
  useEffect(() => {
    if (permissions) {
      const permMap = new Map<string, Set<PermissionAction>>();
      permissions.forEach(p => {
        if (!permMap.has(p.module)) {
          permMap.set(p.module, new Set());
        }
        permMap.get(p.module)!.add(p.action as PermissionAction);
      });
      setLocalPermissions(permMap);
      setHasChanges(false);
    }
  }, [permissions]);

  const togglePermission = (module: string, action: PermissionAction) => {
    if (readOnly || isSuperAdmin) return;
    
    setLocalPermissions(prev => {
      const newMap = new Map(prev);
      if (!newMap.has(module)) {
        newMap.set(module, new Set());
      }
      const actions = new Set(newMap.get(module)!);
      if (actions.has(action)) {
        actions.delete(action);
      } else {
        actions.add(action);
      }
      newMap.set(module, actions);
      return newMap;
    });
    setHasChanges(true);
  };

  const toggleAllModulePermissions = (module: ModuleKey, enable: boolean) => {
    if (readOnly || isSuperAdmin) return;
    
    setLocalPermissions(prev => {
      const newMap = new Map(prev);
      const moduleConfig = PERMISSION_MODULES[module];
      
      if (enable) {
        const allActions = new Set<PermissionAction>([
          ...moduleConfig.actions as unknown as PermissionAction[],
          ...Object.keys(moduleConfig.specialActions) as PermissionAction[],
        ]);
        newMap.set(module, allActions);
      } else {
        newMap.set(module, new Set());
      }
      
      return newMap;
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    const permissionsArray: { module: string; action: PermissionAction }[] = [];
    localPermissions.forEach((actions, module) => {
      actions.forEach(action => {
        permissionsArray.push({ module, action });
      });
    });
    
    updatePermissions.mutate({ employeeId, permissions: permissionsArray });
    setHasChanges(false);
  };

  const getModulePermissionCount = (module: ModuleKey): { current: number; total: number } => {
    const moduleConfig = PERMISSION_MODULES[module];
    const total = moduleConfig.actions.length + Object.keys(moduleConfig.specialActions).length;
    const current = localPermissions.get(module)?.size || 0;
    return { current, total };
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (isSuperAdmin) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Super Administrator</CardTitle>
          </div>
          <CardDescription>
            {employeeName} has full access to all system features and cannot have permissions restricted.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Access Permissions</h3>
        </div>
        {hasChanges && !readOnly && (
          <Button 
            size="sm" 
            onClick={handleSave}
            disabled={updatePermissions.isPending}
          >
            {updatePermissions.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </div>

      <ScrollArea className="h-[500px] pr-4">
        <Accordion type="multiple" className="space-y-2">
          {(Object.keys(PERMISSION_MODULES) as ModuleKey[]).map(moduleKey => {
            const module = PERMISSION_MODULES[moduleKey];
            const { current, total } = getModulePermissionCount(moduleKey);
            const allEnabled = current === total;
            const someEnabled = current > 0 && current < total;

            return (
              <AccordionItem 
                key={moduleKey} 
                value={moduleKey}
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className={cn(
                          "w-2 h-2 rounded-full",
                          allEnabled ? "bg-green-500" : someEnabled ? "bg-amber-500" : "bg-muted-foreground/30"
                        )}
                      />
                      <div className="text-left">
                        <div className="font-medium">{module.label}</div>
                        <div className="text-xs text-muted-foreground">{module.description}</div>
                      </div>
                    </div>
                    <Badge variant={allEnabled ? "default" : someEnabled ? "secondary" : "outline"}>
                      {current}/{total}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-3">
                    {/* Quick toggle all */}
                    {!readOnly && (
                      <div className="flex gap-2 pb-2 border-b">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => toggleAllModulePermissions(moduleKey, true)}
                          disabled={allEnabled}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                          Grant All
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => toggleAllModulePermissions(moduleKey, false)}
                          disabled={current === 0}
                        >
                          <ShieldX className="w-3.5 h-3.5 mr-1" />
                          Revoke All
                        </Button>
                      </div>
                    )}

                    {/* Standard CRUD actions */}
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-2">Standard Actions</div>
                      <div className="flex flex-wrap gap-2">
                        {module.actions.map(action => {
                          const isEnabled = localPermissions.get(moduleKey)?.has(action as PermissionAction) || false;
                          return (
                            <label
                              key={action}
                              className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors",
                                isEnabled 
                                  ? "bg-primary/10 border-primary/30 text-primary" 
                                  : "bg-muted/50 border-border hover:bg-muted",
                                readOnly && "cursor-default"
                              )}
                            >
                              <Checkbox
                                checked={isEnabled}
                                onCheckedChange={() => togglePermission(moduleKey, action as PermissionAction)}
                                disabled={readOnly}
                                className="data-[state=checked]:bg-primary"
                              />
                              {ACTION_ICONS[action as PermissionAction]}
                              <span className="text-sm">{ACTION_LABELS[action as PermissionAction]}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Special actions */}
                    {Object.keys(module.specialActions).length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-2">Special Permissions</div>
                        <div className="space-y-2">
                          {Object.entries(module.specialActions).map(([action, description]) => {
                            const isEnabled = localPermissions.get(moduleKey)?.has(action as PermissionAction) || false;
                            return (
                              <label
                                key={action}
                                className={cn(
                                  "flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors",
                                  isEnabled 
                                    ? "bg-amber-500/10 border-amber-500/30" 
                                    : "bg-muted/50 border-border hover:bg-muted",
                                  readOnly && "cursor-default"
                                )}
                              >
                                <Checkbox
                                  checked={isEnabled}
                                  onCheckedChange={() => togglePermission(moduleKey, action as PermissionAction)}
                                  disabled={readOnly}
                                  className="data-[state=checked]:bg-amber-500"
                                />
                                {ACTION_ICONS[action as PermissionAction]}
                                <div>
                                  <span className="text-sm font-medium">{ACTION_LABELS[action as PermissionAction]}</span>
                                  <span className="text-xs text-muted-foreground ml-2">— {description}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </ScrollArea>
    </div>
  );
}
