import { useState } from 'react';
import { Container, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useContainerPricing } from '@/hooks/useContainerPricing';
import { useRegions } from '@/hooks/useRegions';
import { Skeleton } from '@/components/ui/skeleton';

const CURRENCIES = ['USD', 'GBP', 'EUR', 'TZS'];

export function ContainerPricingManagement() {
  const { containerPricing, isLoading, updatePricing } = useContainerPricing();
  const { data: regions = [] } = useRegions();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ price: string; currency: string }>({ price: '', currency: '' });

  const handleEdit = (id: string, price: number, currency: string) => {
    setEditingId(id);
    setEditValues({ price: price.toString(), currency });
  };

  const handleSave = (id: string) => {
    updatePricing.mutate({
      id,
      price: parseFloat(editValues.price),
      currency: editValues.currency,
    });
    setEditingId(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues({ price: '', currency: '' });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const grouped20ft = containerPricing.filter(p => p.container_size === '20ft');
  const grouped40ft = containerPricing.filter(p => p.container_size === '40ft');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Container className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Container Shipping Pricing</h3>
      </div>
      
      <p className="text-sm text-muted-foreground">
        Configure pricing for full container shipments (FCL) from each origin region.
      </p>

      <div className="space-y-6">
        {/* 20ft Container */}
        <div>
          <h4 className="font-medium mb-3">20ft Container</h4>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Region</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped20ft.map((pricing) => {
                  const regionInfo = regions.find(r => r.code === pricing.region);
                  return (
                  <TableRow key={pricing.id}>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <span>{regionInfo?.flag_emoji}</span>
                        {regionInfo?.name}
                      </span>
                    </TableCell>
                    <TableCell>
                      {editingId === pricing.id ? (
                        <Input
                          type="number"
                          value={editValues.price}
                          onChange={(e) => setEditValues(prev => ({ ...prev, price: e.target.value }))}
                          className="w-32"
                        />
                      ) : (
                        pricing.price.toLocaleString()
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === pricing.id ? (
                        <Select
                          value={editValues.currency}
                          onValueChange={(v) => setEditValues(prev => ({ ...prev, currency: v }))}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCIES.map(c => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        pricing.currency
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === pricing.id ? (
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => handleSave(pricing.id)} disabled={updatePricing.isPending}>
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancel}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleEdit(pricing.id, pricing.price, pricing.currency)}>
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* 40ft Container */}
        <div>
          <h4 className="font-medium mb-3">40ft Container</h4>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Region</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped40ft.map((pricing) => {
                  const regionInfo = regions.find(r => r.code === pricing.region);
                  return (
                  <TableRow key={pricing.id}>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <span>{regionInfo?.flag_emoji}</span>
                        {regionInfo?.name}
                      </span>
                    </TableCell>
                    <TableCell>
                      {editingId === pricing.id ? (
                        <Input
                          type="number"
                          value={editValues.price}
                          onChange={(e) => setEditValues(prev => ({ ...prev, price: e.target.value }))}
                          className="w-32"
                        />
                      ) : (
                        pricing.price.toLocaleString()
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === pricing.id ? (
                        <Select
                          value={editValues.currency}
                          onValueChange={(v) => setEditValues(prev => ({ ...prev, currency: v }))}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCIES.map(c => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        pricing.currency
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === pricing.id ? (
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => handleSave(pricing.id)} disabled={updatePricing.isPending}>
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancel}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleEdit(pricing.id, pricing.price, pricing.currency)}>
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
