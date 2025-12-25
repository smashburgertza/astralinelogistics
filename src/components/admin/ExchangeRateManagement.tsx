import { useState } from 'react';
import { format } from 'date-fns';
import { useExchangeRates, useUpdateExchangeRate, useCreateExchangeRate, useDeleteExchangeRate } from '@/hooks/useExchangeRates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Pencil, Plus, Trash2, Loader2, RefreshCw } from 'lucide-react';

export function ExchangeRateManagement() {
  const { data: rates, isLoading } = useExchangeRates();
  const updateRate = useUpdateExchangeRate();
  const createRate = useCreateExchangeRate();
  const deleteRate = useDeleteExchangeRate();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newCurrency, setNewCurrency] = useState({ code: '', name: '', rate: '' });

  const handleEdit = (id: string, currentRate: number) => {
    setEditingId(id);
    setEditValue(currentRate.toString());
  };

  const handleSave = (id: string) => {
    const newRate = parseFloat(editValue);
    if (isNaN(newRate) || newRate <= 0) return;
    
    updateRate.mutate(
      { id, rate_to_tzs: newRate },
      { onSuccess: () => setEditingId(null) }
    );
  };

  const handleAddCurrency = () => {
    if (!newCurrency.code || !newCurrency.name || !newCurrency.rate) return;
    const rate = parseFloat(newCurrency.rate);
    if (isNaN(rate) || rate <= 0) return;

    createRate.mutate(
      { currency_code: newCurrency.code.toUpperCase(), currency_name: newCurrency.name, rate_to_tzs: rate },
      {
        onSuccess: () => {
          setNewCurrency({ code: '', name: '', rate: '' });
          setAddDialogOpen(false);
        },
      }
    );
  };

  const handleDelete = (id: string, code: string) => {
    if (code === 'TZS') return; // Can't delete base currency
    if (confirm(`Delete ${code} exchange rate?`)) {
      deleteRate.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Exchange Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Exchange Rates
          </CardTitle>
          <CardDescription>
            Manage currency exchange rates to TZS (Tanzanian Shilling)
          </CardDescription>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Currency
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Currency</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Currency Code</Label>
                <Input
                  placeholder="e.g., KES"
                  value={newCurrency.code}
                  onChange={(e) => setNewCurrency({ ...newCurrency, code: e.target.value })}
                  maxLength={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Currency Name</Label>
                <Input
                  placeholder="e.g., Kenyan Shilling"
                  value={newCurrency.name}
                  onChange={(e) => setNewCurrency({ ...newCurrency, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Rate to TZS</Label>
                <Input
                  type="number"
                  placeholder="e.g., 20"
                  value={newCurrency.rate}
                  onChange={(e) => setNewCurrency({ ...newCurrency, rate: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  1 {newCurrency.code || 'XXX'} = {newCurrency.rate || '?'} TZS
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddCurrency} disabled={createRate.isPending}>
                  {createRate.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Currency
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Rate to TZS</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rates?.map((rate) => (
              <TableRow key={rate.id}>
                <TableCell className="font-mono font-medium">{rate.currency_code}</TableCell>
                <TableCell>{rate.currency_name}</TableCell>
                <TableCell>
                  {editingId === rate.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-32"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSave(rate.id)}
                        disabled={updateRate.isPending}
                      >
                        {updateRate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <span className="font-medium">
                      1 {rate.currency_code} = {Number(rate.rate_to_tzs).toLocaleString()} TZS
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {rate.updated_at ? format(new Date(rate.updated_at), 'MMM d, yyyy HH:mm') : '—'}
                </TableCell>
                <TableCell>
                  {rate.currency_code !== 'TZS' && editingId !== rate.id && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(rate.id, rate.rate_to_tzs)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(rate.id, rate.currency_code)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
