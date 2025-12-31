import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Building, Scale, Edit } from 'lucide-react';
import { useBankAccounts, useCreateBankAccount, useChartOfAccounts, useCreateAccount, BankAccount } from '@/hooks/useAccounting';
import { BankReconciliationTab } from './BankReconciliationTab';
import { EditBankAccountDialog } from './EditBankAccountDialog';
import { useExchangeRatesMap } from '@/hooks/useExchangeRates';

export function BankAccountsTab() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [activeTab, setActiveTab] = useState('accounts');
  const { data: bankAccounts = [], isLoading } = useBankAccounts();
  const { data: accounts = [] } = useChartOfAccounts({ type: 'asset' });
  const { getRate } = useExchangeRatesMap();

  const convertToTZS = (amount: number, currency: string) => {
    const rate = getRate(currency);
    return amount * rate;
  };

  const totalBalanceTZS = bankAccounts.reduce((sum, account) => {
    return sum + convertToTZS(account.current_balance, account.currency);
  }, 0);

  const formatCurrency = (amount: number, currency: string = 'TZS') => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="accounts" className="flex items-center gap-2">
          <Building className="h-4 w-4" />
          Bank Accounts
        </TabsTrigger>
        <TabsTrigger value="reconciliation" className="flex items-center gap-2">
          <Scale className="h-4 w-4" />
          Reconciliation
        </TabsTrigger>
      </TabsList>

      <TabsContent value="accounts" className="mt-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Bank Accounts</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Total Balance (TZS): <span className="font-semibold text-foreground">{formatCurrency(totalBalanceTZS)}</span>
                </p>
              </div>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Bank Account
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Account Number</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead className="text-right">Current Balance</TableHead>
                    <TableHead className="text-right">Balance (TZS)</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">Loading...</TableCell>
                    </TableRow>
                  ) : bankAccounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        <Building className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        No bank accounts configured
                      </TableCell>
                    </TableRow>
                  ) : (
                    bankAccounts.map((account) => {
                      const balanceInTZS = convertToTZS(account.current_balance, account.currency);
                      return (
                        <TableRow key={account.id}>
                          <TableCell className="font-medium">{account.account_name}</TableCell>
                          <TableCell>{account.bank_name}</TableCell>
                          <TableCell className="font-mono">{account.account_number || '-'}</TableCell>
                          <TableCell>{account.currency}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(account.current_balance, account.currency)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-muted-foreground">
                            {account.currency !== 'TZS' ? formatCurrency(balanceInTZS) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={account.is_active ? 'default' : 'secondary'}>
                              {account.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                setSelectedAccount(account);
                                setShowEditDialog(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>

          <CreateBankAccountDialog 
            open={showCreateDialog} 
            onOpenChange={setShowCreateDialog}
            chartAccounts={accounts}
          />

          <EditBankAccountDialog
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            bankAccount={selectedAccount}
            chartAccounts={accounts}
          />
        </Card>
      </TabsContent>

      <TabsContent value="reconciliation" className="mt-4">
        <BankReconciliationTab />
      </TabsContent>
    </Tabs>
  );
}

function CreateBankAccountDialog({ 
  open, 
  onOpenChange, 
  chartAccounts 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  chartAccounts: any[];
}) {
  const [accountName, setAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [currency, setCurrency] = useState('TZS');
  const [chartAccountId, setChartAccountId] = useState('');
  const [openingBalance, setOpeningBalance] = useState(0);
  const [showCreateChartAccount, setShowCreateChartAccount] = useState(false);
  const [newAccountCode, setNewAccountCode] = useState('');
  const [newAccountName, setNewAccountName] = useState('');

  const createBankAccount = useCreateBankAccount();
  const { mutateAsync: createChartAccount } = useCreateAccount();

  // Filter to show only Cash and Bank type accounts
  const cashBankAccounts = chartAccounts.filter(
    a => a.account_subtype === 'cash_and_bank' || 
         a.account_name.toLowerCase().includes('bank') || 
         a.account_name.toLowerCase().includes('cash')
  );

  // Find the "Bank Accounts" parent account (1100)
  const bankAccountsParent = chartAccounts.find(
    a => a.account_code === '1100' || 
         (a.account_name === 'Bank Accounts' && a.account_type === 'asset')
  );

  const handleCreateChartAccount = async () => {
    if (!newAccountCode || !newAccountName) return;
    
    try {
      const result = await createChartAccount({
        account_code: newAccountCode,
        account_name: newAccountName,
        account_type: 'asset',
        account_subtype: 'cash_and_bank',
        normal_balance: 'debit',
        currency: currency,
        description: `Bank account: ${bankName || newAccountName}`,
        is_active: true,
        parent_id: bankAccountsParent?.id || null, // Link under Bank Accounts parent
      });
      
      if (result?.id) {
        setChartAccountId(result.id);
        setShowCreateChartAccount(false);
        setNewAccountCode('');
        setNewAccountName('');
      }
    } catch (error) {
      console.error('Failed to create chart account:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!chartAccountId) {
      return; // Don't submit without a chart account
    }
    
    createBankAccount.mutate({
      account_name: accountName,
      bank_name: bankName,
      account_number: accountNumber || null,
      currency,
      chart_account_id: chartAccountId,
      opening_balance: openingBalance,
      is_active: true,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setAccountName('');
        setBankName('');
        setAccountNumber('');
        setCurrency('TZS');
        setChartAccountId('');
        setOpeningBalance(0);
      },
    });
  };

  // Suggest account code based on existing accounts
  const suggestAccountCode = () => {
    const existingCodes = chartAccounts
      .filter(a => a.account_code.startsWith('110'))
      .map(a => parseInt(a.account_code))
      .filter(n => !isNaN(n));
    
    const maxCode = existingCodes.length > 0 ? Math.max(...existingCodes) : 1100;
    return String(maxCode + 1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Bank Account</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account_name">Account Name *</Label>
            <Input
              id="account_name"
              value={accountName}
              onChange={(e) => {
                setAccountName(e.target.value);
                // Auto-suggest for new chart account
                if (!newAccountName) {
                  setNewAccountName(e.target.value);
                }
              }}
              placeholder="e.g., Main Operating Account"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bank_name">Bank Name *</Label>
              <Input
                id="bank_name"
                value={bankName}
                onChange={(e) => {
                  setBankName(e.target.value);
                  // Auto-update chart account name when bank name changes
                  if (showCreateChartAccount || !chartAccountId) {
                    const suggestedName = `${e.target.value}${currency !== 'TZS' ? ` ${currency}` : ''}`;
                    setNewAccountName(suggestedName);
                  }
                }}
                placeholder="e.g., CRDB Bank"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_number">Account Number</Label>
              <Input
                id="account_number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="e.g., 123456789"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={(val) => {
                setCurrency(val);
                // Update chart account name when currency changes
                if ((showCreateChartAccount || !chartAccountId) && bankName) {
                  const suggestedName = `${bankName}${val !== 'TZS' ? ` ${val}` : ''}`;
                  setNewAccountName(suggestedName);
                }
              }}>
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
            <div className="space-y-2">
              <Label htmlFor="opening_balance">Opening Balance</Label>
              <Input
                id="opening_balance"
                type="number"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="chart_account">Link to Chart of Accounts *</Label>
            <Select value={chartAccountId} onValueChange={(val) => {
              if (val === '__create_new__') {
                setShowCreateChartAccount(true);
                setNewAccountCode(suggestAccountCode());
                // Auto-generate name from bank name + currency
                const suggestedName = bankName ? `${bankName}${currency !== 'TZS' ? ` ${currency}` : ''}` : accountName;
                setNewAccountName(suggestedName);
              } else {
                setChartAccountId(val);
              }
            }}>
              <SelectTrigger className={!chartAccountId ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select or create account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__create_new__" className="text-primary font-medium">
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Create New Account
                  </span>
                </SelectItem>
                {cashBankAccounts.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      Existing Cash & Bank Accounts
                    </div>
                    {cashBankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.account_code} - {account.account_name}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
            {!chartAccountId && (
              <p className="text-xs text-destructive">
                A Chart of Accounts entry is required for proper double-entry bookkeeping
              </p>
            )}
          </div>

          {/* Quick Create Chart Account Section */}
          {showCreateChartAccount && (
            <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Create New Chart Account</Label>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowCreateChartAccount(false)}
                >
                  Cancel
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Account Code</Label>
                  <Input
                    value={newAccountCode}
                    onChange={(e) => setNewAccountCode(e.target.value)}
                    placeholder="e.g., 1101"
                    className="text-sm"
                  />
                </div>
              <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Account Name (auto-generated)</Label>
                  <Input
                    value={newAccountName}
                    readOnly
                    className="text-sm bg-muted"
                  />
                </div>
              </div>
              <Button 
                type="button" 
                size="sm" 
                onClick={handleCreateChartAccount}
                disabled={!newAccountCode || !newAccountName}
              >
                Create & Link Account
              </Button>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createBankAccount.isPending || !chartAccountId}>
              {createBankAccount.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}