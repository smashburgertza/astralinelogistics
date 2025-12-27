import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Route, 
  Loader2,
  MapPin
} from 'lucide-react';
import { 
  useTransitRoutes, 
  useCreateTransitRoute, 
  useUpdateTransitRoute, 
  useDeleteTransitRoute,
  TRANSIT_POINT_OPTIONS,
  TRANSIT_POINT_LABELS,
  TransitPointType,
  TransitRoute
} from '@/hooks/useTransitRoutes';
import { useActiveRegions } from '@/hooks/useRegions';
import { CURRENCY_SYMBOLS } from '@/lib/constants';

export function TransitRoutesManagement() {
  const { data: routes, isLoading } = useTransitRoutes();
  const { data: regions } = useActiveRegions();
  const createRoute = useCreateTransitRoute();
  const updateRoute = useUpdateTransitRoute();
  const deleteRoute = useDeleteTransitRoute();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<TransitRoute | null>(null);
  const [formData, setFormData] = useState({
    region_id: '',
    transit_point: 'direct' as TransitPointType,
    additional_cost: 0,
    currency: 'USD',
    estimated_days: 0,
    notes: '',
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      region_id: '',
      transit_point: 'direct',
      additional_cost: 0,
      currency: 'USD',
      estimated_days: 0,
      notes: '',
      is_active: true,
    });
    setEditingRoute(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const handleOpenEdit = (route: TransitRoute) => {
    setFormData({
      region_id: route.region_id,
      transit_point: route.transit_point,
      additional_cost: route.additional_cost,
      currency: route.currency,
      estimated_days: route.estimated_days,
      notes: route.notes || '',
      is_active: route.is_active,
    });
    setEditingRoute(route);
  };

  const handleSubmit = async () => {
    if (editingRoute) {
      await updateRoute.mutateAsync({
        id: editingRoute.id,
        is_active: formData.is_active,
        additional_cost: formData.additional_cost,
        currency: formData.currency,
        estimated_days: formData.estimated_days,
        notes: formData.notes || undefined,
      });
      setEditingRoute(null);
    } else {
      await createRoute.mutateAsync({
        region_id: formData.region_id,
        transit_point: formData.transit_point,
        is_active: formData.is_active,
        additional_cost: formData.additional_cost,
        currency: formData.currency,
        estimated_days: formData.estimated_days,
        notes: formData.notes || undefined,
      });
      setIsAddDialogOpen(false);
    }
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this transit route?')) {
      await deleteRoute.mutateAsync(id);
    }
  };

  // Group routes by region
  const routesByRegion = routes?.reduce((acc, route) => {
    const regionName = route.region?.name || 'Unknown';
    if (!acc[regionName]) {
      acc[regionName] = [];
    }
    acc[regionName].push(route);
    return acc;
  }, {} as Record<string, TransitRoute[]>) || {};

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Route className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Transit Routes</CardTitle>
              <CardDescription>Configure routing options for each region (e.g., Via Nairobi, Via Zanzibar)</CardDescription>
            </div>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenAdd} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Route
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Transit Route</DialogTitle>
                <DialogDescription>
                  Configure a new transit routing option for a region
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Region</Label>
                  <Select
                    value={formData.region_id}
                    onValueChange={(value) => setFormData({ ...formData, region_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      {regions?.map((region) => (
                        <SelectItem key={region.id} value={region.id}>
                          {region.flag_emoji} {region.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Transit Point</Label>
                  <Select
                    value={formData.transit_point}
                    onValueChange={(value) => setFormData({ ...formData, transit_point: value as TransitPointType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSIT_POINT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Additional Cost</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.additional_cost}
                      onChange={(e) => setFormData({ ...formData, additional_cost: parseFloat(e.target.value) || 0 })}
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
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="TZS">TZS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Estimated Additional Days</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.estimated_days}
                    onChange={(e) => setFormData({ ...formData, estimated_days: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Optional notes about this route..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Active</Label>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={!formData.region_id || createRoute.isPending}
                >
                  {createRoute.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Add Route
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : routes?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No transit routes configured yet.</p>
            <p className="text-sm">Add routes to enable routing options for agents.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Region</TableHead>
                <TableHead>Transit Point</TableHead>
                <TableHead>Additional Cost</TableHead>
                <TableHead>Est. Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes?.map((route) => (
                <TableRow key={route.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{route.region?.flag_emoji}</span>
                      <span className="font-medium">{route.region?.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {TRANSIT_POINT_LABELS[route.transit_point]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {route.additional_cost > 0 ? (
                      <span className="font-medium">
                        +{CURRENCY_SYMBOLS[route.currency] || route.currency}{route.additional_cost}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {route.estimated_days > 0 ? (
                      <span>+{route.estimated_days} days</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={route.is_active ? 'default' : 'secondary'}>
                      {route.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Dialog open={editingRoute?.id === route.id} onOpenChange={(open) => !open && setEditingRoute(null)}>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(route)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Transit Route</DialogTitle>
                            <DialogDescription>
                              Update the transit route settings
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Region</Label>
                              <Input value={route.region?.name || ''} disabled />
                            </div>

                            <div className="space-y-2">
                              <Label>Transit Point</Label>
                              <Input value={TRANSIT_POINT_LABELS[route.transit_point]} disabled />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Additional Cost</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={formData.additional_cost}
                                  onChange={(e) => setFormData({ ...formData, additional_cost: parseFloat(e.target.value) || 0 })}
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
                                    <SelectItem value="USD">USD</SelectItem>
                                    <SelectItem value="EUR">EUR</SelectItem>
                                    <SelectItem value="GBP">GBP</SelectItem>
                                    <SelectItem value="TZS">TZS</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Estimated Additional Days</Label>
                              <Input
                                type="number"
                                min="0"
                                value={formData.estimated_days}
                                onChange={(e) => setFormData({ ...formData, estimated_days: parseInt(e.target.value) || 0 })}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Notes</Label>
                              <Textarea
                                placeholder="Optional notes about this route..."
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                              />
                            </div>

                            <div className="flex items-center justify-between">
                              <Label>Active</Label>
                              <Switch
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingRoute(null)}>
                              Cancel
                            </Button>
                            <Button 
                              onClick={handleSubmit} 
                              disabled={updateRoute.isPending}
                            >
                              {updateRoute.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                              Save Changes
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(route.id)}
                        disabled={deleteRoute.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
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
