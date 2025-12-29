import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useUpdateAccount, useDeleteAccount, ACCOUNT_TYPES, ChartAccount } from '@/hooks/useAccounting';
import { Trash2 } from 'lucide-react';

interface EditAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: ChartAccount | null;
  accounts: ChartAccount[];
}

export function EditAccountDialog({ open, onOpenChange, account, accounts }: EditAccountDialogProps) {
  const [accountCode, setAccountCode] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<string>('');
  const [accountSubtype, setAccountSubtype] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('TZS');
  const [isActive, setIsActive] = useState(true);

  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();

  useEffect(() => {
    if (account) {
      setAccountCode(account.account_code);
      setAccountName(account.account_name);
      setAccountType(account.account_type);
      setAccountSubtype(account.account_subtype || '');
      setParentId(account.parent_id || '');
      setDescription(account.description || '');
      setCurrency(account.currency);
      setIsActive(account.is_active);
    }
  }, [account]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    
    const selectedType = ACCOUNT_TYPES.find(t => t.value === accountType);
    
    updateAccount.mutate({
      id: account.id,
      account_code: accountCode,
      account_name: accountName,
      account_type: accountType as any,
      account_subtype: accountSubtype || null,
      parent_id: parentId && parentId !== 'none' ? parentId : null,
      description: description || null,
      is_active: isActive,
      normal_balance: selectedType?.normalBalance as 'debit' | 'credit' || 'debit',
      currency,
    }, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  const handleDelete = () => {
    if (!account) return;
    deleteAccount.mutate(account.id, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  // Filter out the current account from parent options
  const parentOptions = accounts.filter(a => a.id !== account?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="account_code">Account Code *</Label>
              <Input
                id="account_code"
                value={accountCode}
                onChange={(e) => setAccountCode(e.target.value)}
                placeholder="e.g., 1150"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_name">Account Name *</Label>
              <Input
                id="account_name"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g., Cash on Hand"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="account_type">Account Type *</Label>
              <Select value={accountType} onValueChange={setAccountType} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_subtype">Subtype</Label>
              <Input
                id="account_subtype"
                value={accountSubtype}
                onChange={(e) => setAccountSubtype(e.target.value)}
                placeholder="e.g., cash, receivable"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="parent_id">Parent Account</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="None (root level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (root level)</SelectItem>
                  {parentOptions.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.account_code} - {acc.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TZS">TZS</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="is_active">Active Account</Label>
          </div>

          <div className="flex justify-between pt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the account "{account?.account_name}". 
                    This action cannot be undone. Make sure no transactions reference this account.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateAccount.isPending}>
                {updateAccount.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
