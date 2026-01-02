import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCreateJournalEntry, useChartOfAccounts } from '@/hooks/useAccounting';
import { useExchangeRates } from '@/hooks/useExchangeRates';

interface JournalLineInput {
  account_id: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  currency: string;
  exchange_rate: number;
}

interface CreateJournalEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateJournalEntryDialog({ open, onOpenChange }: CreateJournalEntryDialogProps) {
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [referenceType, setReferenceType] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<JournalLineInput[]>([
    { account_id: '', description: '', debit_amount: 0, credit_amount: 0, currency: 'TZS', exchange_rate: 1 },
    { account_id: '', description: '', debit_amount: 0, credit_amount: 0, currency: 'TZS', exchange_rate: 1 },
  ]);

  const { data: accounts = [] } = useChartOfAccounts({ active: true });
  const { data: exchangeRates = [] } = useExchangeRates();
  const createEntry = useCreateJournalEntry();

  const addLine = () => {
    setLines([...lines, { account_id: '', description: '', debit_amount: 0, credit_amount: 0, currency: 'TZS', exchange_rate: 1 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const updateLine = (index: number, field: keyof JournalLineInput, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    
    // Update exchange rate when currency changes
    if (field === 'currency') {
      const rate = exchangeRates.find(r => r.currency_code === value);
      newLines[index].exchange_rate = rate?.rate_to_tzs || 1;
    }
    
    setLines(newLines);
  };

  const totalDebits = lines.reduce((sum, l) => sum + (Number(l.debit_amount) * l.exchange_rate || 0), 0);
  const totalCredits = lines.reduce((sum, l) => sum + (Number(l.credit_amount) * l.exchange_rate || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isBalanced) {
      return;
    }

    const validLines = lines.filter(l => l.account_id && (l.debit_amount > 0 || l.credit_amount > 0));
    
    createEntry.mutate({
      entry: {
        entry_date: entryDate,
        description,
        reference_type: referenceType || null,
        reference_id: null,
        status: 'draft',
        posted_at: null,
        posted_by: null,
        created_by: null,
        notes: notes || null,
        is_expense: false,
      },
      lines: validLines.map(l => ({
        account_id: l.account_id,
        description: l.description || null,
        debit_amount: Number(l.debit_amount) || 0,
        credit_amount: Number(l.credit_amount) || 0,
        currency: l.currency,
        exchange_rate: l.exchange_rate,
        amount_in_tzs: (Number(l.debit_amount) || Number(l.credit_amount)) * l.exchange_rate,
      })),
    }, {
      onSuccess: () => {
        onOpenChange(false);
        resetForm();
      },
    });
  };

  const resetForm = () => {
    setEntryDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setReferenceType('');
    setNotes('');
    setLines([
      { account_id: '', description: '', debit_amount: 0, credit_amount: 0, currency: 'TZS', exchange_rate: 1 },
      { account_id: '', description: '', debit_amount: 0, credit_amount: 0, currency: 'TZS', exchange_rate: 1 },
    ]);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Journal Entry</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entry_date">Entry Date *</Label>
              <Input
                id="entry_date"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference_type">Reference Type</Label>
              <Select value={referenceType} onValueChange={setReferenceType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                  <SelectItem value="opening_balance">Opening Balance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Entry description"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Journal Lines</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-4 w-4 mr-1" />
                Add Line
              </Button>
            </div>
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-64">Account</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-24">Currency</TableHead>
                    <TableHead className="w-32 text-right">Debit</TableHead>
                    <TableHead className="w-32 text-right">Credit</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select 
                          value={line.account_id} 
                          onValueChange={(v) => updateLine(index, 'account_id', v)}
                        >
                          <SelectTrigger className="h-8">
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
                      </TableCell>
                      <TableCell>
                        <Input
                          value={line.description}
                          onChange={(e) => updateLine(index, 'description', e.target.value)}
                          placeholder="Line description"
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={line.currency} 
                          onValueChange={(v) => updateLine(index, 'currency', v)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TZS">TZS</SelectItem>
                            {exchangeRates.map((rate) => (
                              <SelectItem key={rate.currency_code} value={rate.currency_code}>
                                {rate.currency_code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.debit_amount || ''}
                          onChange={(e) => updateLine(index, 'debit_amount', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="h-8 text-right"
                          disabled={line.credit_amount > 0}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.credit_amount || ''}
                          onChange={(e) => updateLine(index, 'credit_amount', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="h-8 text-right"
                          disabled={line.debit_amount > 0}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(index)}
                          disabled={lines.length <= 2}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-medium">
                    <TableCell colSpan={3} className="text-right">Totals (in TZS):</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalDebits)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalCredits)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {!isBalanced && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Entry is not balanced. Debits ({formatCurrency(totalDebits)}) must equal Credits ({formatCurrency(totalCredits)}).
                Difference: {formatCurrency(Math.abs(totalDebits - totalCredits))}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createEntry.isPending || !isBalanced}>
              {createEntry.isPending ? 'Creating...' : 'Create Entry'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
