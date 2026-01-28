import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Edit2, Trash2, Tag, GripVertical } from 'lucide-react';
import {
  useServiceTypes,
  useCreateServiceType,
  useUpdateServiceType,
  useDeleteServiceType,
  generateSlug,
  SERVICE_TYPE_COLORS,
  ProductServiceType,
} from '@/hooks/useServiceTypes';

export function ServiceTypesManager() {
  const { data: serviceTypes, isLoading } = useServiceTypes();
  const createType = useCreateServiceType();
  const updateType = useUpdateServiceType();
  const deleteType = useDeleteServiceType();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<ProductServiceType | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<ProductServiceType | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    color_class: 'bg-gray-100 text-gray-800',
    is_active: true,
    sort_order: 0,
  });

  const handleOpenDialog = (type?: ProductServiceType) => {
    if (type) {
      setEditingType(type);
      setFormData({
        name: type.name,
        slug: type.slug,
        description: type.description || '',
        color_class: type.color_class,
        is_active: type.is_active,
        sort_order: type.sort_order,
      });
    } else {
      setEditingType(null);
      const nextOrder = serviceTypes?.length ? Math.max(...serviceTypes.map(t => t.sort_order)) + 1 : 1;
      setFormData({
        name: '',
        slug: '',
        description: '',
        color_class: 'bg-gray-100 text-gray-800',
        is_active: true,
        sort_order: nextOrder,
      });
    }
    setDialogOpen(true);
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      // Only auto-generate slug if creating new or slug hasn't been manually edited
      slug: !editingType ? generateSlug(name) : formData.slug,
    });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.slug.trim()) return;

    if (editingType) {
      await updateType.mutateAsync({ id: editingType.id, ...formData });
    } else {
      await createType.mutateAsync(formData);
    }

    setDialogOpen(false);
  };

  const handleDelete = (type: ProductServiceType) => {
    setTypeToDelete(type);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (typeToDelete) {
      await deleteType.mutateAsync(typeToDelete.id);
      setDeleteConfirmOpen(false);
      setTypeToDelete(null);
    }
  };

  const handleToggleActive = async (type: ProductServiceType) => {
    await updateType.mutateAsync({ id: type.id, is_active: !type.is_active });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Service Types</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Service Types
            </CardTitle>
            <CardDescription>
              Manage service types for products and services categorization
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Type
          </Button>
        </CardHeader>
        <CardContent>
          {!serviceTypes || serviceTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No service types found</p>
              <p className="text-sm">Create your first service type to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serviceTypes.map((type) => (
                  <TableRow key={type.id} className={!type.is_active ? 'opacity-50' : ''}>
                    <TableCell className="text-muted-foreground">
                      {type.sort_order}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{type.name}</p>
                        {type.description && (
                          <p className="text-xs text-muted-foreground">{type.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {type.slug}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={type.color_class}>
                        {type.name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={type.is_active}
                        onCheckedChange={() => handleToggleActive(type)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(type)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(type)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingType ? 'Edit Service Type' : 'Add Service Type'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Air Cargo"
              />
            </div>

            <div className="space-y-2">
              <Label>Slug *</Label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="e.g., air_cargo"
              />
              <p className="text-xs text-muted-foreground">
                Used internally for identification. Use lowercase with underscores.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <Select
                value={formData.color_class}
                onValueChange={(value) => setFormData({ ...formData, color_class: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPE_COLORS.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${color.preview}`} />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-2">
                <Badge variant="secondary" className={formData.color_class}>
                  {formData.name || 'Preview'}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.name.trim() || !formData.slug.trim()}
              >
                {editingType ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{typeToDelete?.name}"?
              <span className="block mt-2">
                Existing products/services using this type will not be affected but will show an unknown type.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
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
