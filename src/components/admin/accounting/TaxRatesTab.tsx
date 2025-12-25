import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Percent, Edit } from 'lucide-react';
import { useTaxRates, useCreateTaxRate, useUpdateTaxRate, useChartOfAccounts } from '@/hooks/useAccounting';

export function TaxRatesTab() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { data: taxRates = [], isLoading } = useTaxRates();

  const getTaxTypeColor = (type: string) => {
    switch (type) {
      case 'vat': return 'bg-blue-100 text-blue-800';
      case 'withholding': return 'bg-purple-100 text-purple-800';
      case 'excise': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Tax Rates</CardTitle>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Tax Rate
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tax Code</TableHead>
                <TableHead>Tax Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : taxRates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Percent className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No tax rates configured
                  </TableCell>
                </TableRow>
              ) : (
                taxRates.map((tax) => (
                  <TableRow key={tax.id}>
                    <TableCell className="font-mono">{tax.tax_code}</TableCell>
                    <TableCell className="font-medium">{tax.tax_name}</TableCell>
                    <TableCell>
                      <Badge className={getTaxTypeColor(tax.tax_type)}>
                        {tax.tax_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{tax.rate}%</TableCell>
                    <TableCell>
                      <Badge variant={tax.is_active ? 'default' : 'secondary'}>
                        {tax.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <CreateTaxRateDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </Card>
  );
}

function CreateTaxRateDialog({ 
  open, 
  onOpenChange 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const [taxName, setTaxName] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [rate, setRate] = useState(0);
  const [taxType, setTaxType] = useState<'vat' | 'withholding' | 'excise' | 'other'>('vat');
  const [accountId, setAccountId] = useState('');
  const [isActive, setIsActive] = useState(true);

  const { data: accounts = [] } = useChartOfAccounts({ type: 'liability' });
  const createTaxRate = useCreateTaxRate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTaxRate.mutate({
      tax_name: taxName,
      tax_code: taxCode,
      rate,
      tax_type: taxType,
      account_id: accountId || null,
      is_active: isActive,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setTaxName('');
        setTaxCode('');
        setRate(0);
        setTaxType('vat');
        setAccountId('');
        setIsActive(true);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Tax Rate</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tax_name">Tax Name *</Label>
              <Input
                id="tax_name"
                value={taxName}
                onChange={(e) => setTaxName(e.target.value)}
                placeholder="e.g., VAT"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_code">Tax Code *</Label>
              <Input
                id="tax_code"
                value={taxCode}
                onChange={(e) => setTaxCode(e.target.value)}
                placeholder="e.g., VAT18"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tax_type">Tax Type</Label>
              <Select value={taxType} onValueChange={(v: any) => setTaxType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vat">VAT</SelectItem>
                  <SelectItem value="withholding">Withholding</SelectItem>
                  <SelectItem value="excise">Excise</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate">Rate (%) *</Label>
              <Input
                id="rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_id">Tax Liability Account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.account_code} - {account.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTaxRate.isPending}>
              {createTaxRate.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
