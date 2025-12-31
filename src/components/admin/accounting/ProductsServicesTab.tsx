import { useState } from 'react';
import { Plus, Edit2, Trash2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useProductsServices,
  useCreateProductService,
  useUpdateProductService,
  useDeleteProductService,
  SERVICE_TYPES,
  UNIT_TYPES,
  ProductService,
} from '@/hooks/useProductsServices';
import { useChartOfAccounts } from '@/hooks/useAccounting';
import { CURRENCY_SYMBOLS } from '@/lib/constants';

export function ProductsServicesTab() {
  const { data: items, isLoading } = useProductsServices();
  const { data: accounts } = useChartOfAccounts({ active: true });
  const createItem = useCreateProductService();
  const updateItem = useUpdateProductService();
  const deleteItem = useDeleteProductService();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductService | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'service',
    service_type: 'air_cargo',
    unit_price: 0,
    currency: 'USD',
    unit: 'kg',
    account_id: '',
    is_active: true,
  });

  const revenueAccounts = accounts?.filter((a) => a.account_type === 'revenue') || [];

  const filteredItems = items?.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenDialog = (item?: ProductService) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        description: item.description || '',
        category: item.category,
        service_type: item.service_type || 'other',
        unit_price: item.unit_price,
        currency: item.currency,
        unit: item.unit || 'kg',
        account_id: item.account_id || '',
        is_active: item.is_active,
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        description: '',
        category: 'service',
        service_type: 'air_cargo',
        unit_price: 0,
        currency: 'USD',
        unit: 'kg',
        account_id: '',
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    const payload = {
      ...formData,
      account_id: formData.account_id || null,
    };

    if (editingItem) {
      await updateItem.mutateAsync({ id: editingItem.id, ...payload });
    } else {
      await createItem.mutateAsync(payload);
    }

    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      await deleteItem.mutateAsync(id);
    }
  };

  const handleToggleActive = async (item: ProductService) => {
    await updateItem.mutateAsync({ id: item.id, is_active: !item.is_active });
  };

  const getServiceTypeBadge = (type: string | null) => {
    const serviceType = SERVICE_TYPES[type as keyof typeof SERVICE_TYPES];
    if (!serviceType) return null;
    return (
      <Badge variant="secondary" className={serviceType.color}>
        {serviceType.label}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Products & Services
        </CardTitle>
        <div className="flex items-center gap-4">
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Service
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? 'Edit Product/Service' : 'Add Product/Service'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Air Cargo - Standard"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the service"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Service Type</Label>
                    <Select
                      value={formData.service_type}
                      onValueChange={(value) => setFormData({ ...formData, service_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(SERVICE_TYPES).map(([key, value]) => (
                          <SelectItem key={key} value={key}>
                            {value.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Select
                      value={formData.unit}
                      onValueChange={(value) => setFormData({ ...formData, unit: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_TYPES.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.unit === 'percent' ? (
                  <div className="space-y-2">
                    <Label>Percentage (%)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.unit_price}
                        onChange={(e) =>
                          setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })
                        }
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Unit Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.unit_price}
                        onChange={(e) =>
                          setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select
                        value={formData.currency}
                        onValueChange={(value) => setFormData({ ...formData, currency: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="AED">AED (د.إ)</SelectItem>
                          <SelectItem value="TZS">TZS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Revenue Account (Optional)</Label>
                  <Select
                    value={formData.account_id || 'none'}
                    onValueChange={(value) =>
                      setFormData({ ...formData, account_id: value === 'none' ? '' : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No account linked</SelectItem>
                      {revenueAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.account_code} - {account.account_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Active</Label>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={!formData.name.trim()}>
                    {editingItem ? 'Update' : 'Create'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : filteredItems?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No products or services found. Add your first one to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems?.map((item) => (
                <TableRow key={item.id} className={!item.is_active ? 'opacity-50' : ''}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getServiceTypeBadge(item.service_type)}</TableCell>
                  <TableCell className="font-medium">
                    {item.unit === 'percent' 
                      ? `${item.unit_price.toFixed(2)}%`
                      : `${CURRENCY_SYMBOLS[item.currency] || '$'}${item.unit_price.toFixed(2)}`
                    }
                  </TableCell>
                  <TableCell className="capitalize">{item.unit}</TableCell>
                  <TableCell>
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={() => handleToggleActive(item)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(item)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
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
  );
}
