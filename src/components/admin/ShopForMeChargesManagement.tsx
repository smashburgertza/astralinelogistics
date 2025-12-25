import { useState } from 'react';
import { Plus, Pencil, Trash2, GripVertical, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAllShopForMeCharges,
  useCreateShopForMeCharge,
  useUpdateShopForMeCharge,
  useDeleteShopForMeCharge,
  type ShopForMeCharge,
} from '@/hooks/useShopForMeCharges';

export function ShopForMeChargesManagement() {
  const { data: charges, isLoading } = useAllShopForMeCharges();
  const createCharge = useCreateShopForMeCharge();
  const updateCharge = useUpdateShopForMeCharge();
  const deleteCharge = useDeleteShopForMeCharge();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCharge, setEditingCharge] = useState<ShopForMeCharge | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    charge_name: '',
    charge_key: '',
    charge_type: 'percentage' as 'percentage' | 'fixed',
    charge_value: 0,
    applies_to: 'product_cost' as 'product_cost' | 'subtotal' | 'cumulative',
    display_order: 0,
    is_active: true,
    description: '',
  });

  const resetForm = () => {
    setFormData({
      charge_name: '',
      charge_key: '',
      charge_type: 'percentage',
      charge_value: 0,
      applies_to: 'product_cost',
      display_order: charges?.length ? Math.max(...charges.map(c => c.display_order)) + 1 : 0,
      is_active: true,
      description: '',
    });
    setEditingCharge(null);
  };

  const handleOpenDialog = (charge?: ShopForMeCharge) => {
    if (charge) {
      setEditingCharge(charge);
      setFormData({
        charge_name: charge.charge_name,
        charge_key: charge.charge_key,
        charge_type: charge.charge_type,
        charge_value: charge.charge_value,
        applies_to: charge.applies_to,
        display_order: charge.display_order,
        is_active: charge.is_active,
        description: charge.description || '',
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.charge_name || !formData.charge_key) {
      return;
    }

    if (editingCharge) {
      await updateCharge.mutateAsync({
        id: editingCharge.id,
        ...formData,
      });
    } else {
      await createCharge.mutateAsync(formData);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteCharge.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleToggleActive = async (charge: ShopForMeCharge) => {
    await updateCharge.mutateAsync({
      id: charge.id,
      is_active: !charge.is_active,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Shop For Me Charges</CardTitle>
              <CardDescription>
                Configure the charges and fees applied to Shop For Me orders
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Charge
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!charges?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No charges configured yet</p>
              <p className="text-sm mt-1">Add your first charge to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {charges.map(charge => (
                <div
                  key={charge.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border ${
                    charge.is_active ? 'bg-card' : 'bg-muted/50 opacity-60'
                  }`}
                >
                  <GripVertical className="h-5 w-5 text-muted-foreground/50 cursor-grab" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{charge.charge_name}</p>
                      <Badge variant="outline" className="text-xs">
                        {charge.charge_key}
                      </Badge>
                      {!charge.is_active && (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {charge.charge_type === 'percentage' 
                        ? `${charge.charge_value}% of ${charge.applies_to.replace('_', ' ')}`
                        : `Fixed: $${charge.charge_value.toFixed(2)}`
                      }
                    </p>
                    {charge.description && (
                      <p className="text-xs text-muted-foreground mt-1">{charge.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={charge.is_active}
                      onCheckedChange={() => handleToggleActive(charge)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(charge)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(charge.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">Calculation Order</h4>
            <p className="text-sm text-muted-foreground">
              Charges are applied in the order shown above. The "applies_to" setting determines the base amount:
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
              <li><strong>Product Cost</strong>: Percentage of the product price only</li>
              <li><strong>Subtotal</strong>: Percentage of product cost + previous charges</li>
              <li><strong>Cumulative</strong>: Percentage of product cost + shipping + previous charges</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCharge ? 'Edit Charge' : 'Add New Charge'}</DialogTitle>
            <DialogDescription>
              Configure the charge details. Changes will be reflected immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="charge_name">Charge Name</Label>
                <Input
                  id="charge_name"
                  placeholder="e.g., Duty & Clearing"
                  value={formData.charge_name}
                  onChange={e => setFormData(prev => ({ ...prev, charge_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="charge_key">Charge Key</Label>
                <Input
                  id="charge_key"
                  placeholder="e.g., duty_clearing"
                  value={formData.charge_key}
                  onChange={e => setFormData(prev => ({ 
                    ...prev, 
                    charge_key: e.target.value.toLowerCase().replace(/\s+/g, '_') 
                  }))}
                  disabled={!!editingCharge}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="charge_type">Charge Type</Label>
                <Select
                  value={formData.charge_type}
                  onValueChange={(value: 'percentage' | 'fixed') => 
                    setFormData(prev => ({ ...prev, charge_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="charge_value">
                  {formData.charge_type === 'percentage' ? 'Percentage' : 'Amount'}
                </Label>
                <Input
                  id="charge_value"
                  type="number"
                  step={formData.charge_type === 'percentage' ? '0.1' : '0.01'}
                  min="0"
                  value={formData.charge_value}
                  onChange={e => setFormData(prev => ({ 
                    ...prev, 
                    charge_value: parseFloat(e.target.value) || 0 
                  }))}
                />
              </div>
            </div>

            {formData.charge_type === 'percentage' && (
              <div className="space-y-2">
                <Label htmlFor="applies_to">Applies To</Label>
                <Select
                  value={formData.applies_to}
                  onValueChange={(value: 'product_cost' | 'subtotal' | 'cumulative') => 
                    setFormData(prev => ({ ...prev, applies_to: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product_cost">Product Cost Only</SelectItem>
                    <SelectItem value="subtotal">Subtotal (Product + Previous Charges)</SelectItem>
                    <SelectItem value="cumulative">Cumulative (Product + Shipping + Charges)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                type="number"
                min="0"
                value={formData.display_order}
                onChange={e => setFormData(prev => ({ 
                  ...prev, 
                  display_order: parseInt(e.target.value) || 0 
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this charge..."
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={checked => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label>Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={createCharge.isPending || updateCharge.isPending}
            >
              {(createCharge.isPending || updateCharge.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingCharge ? 'Save Changes' : 'Add Charge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Charge?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this charge. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
