import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Edit, 
  ChevronRight, 
  ChevronDown, 
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  Download
} from 'lucide-react';
import { useChartOfAccounts, ACCOUNT_TYPES, ChartAccount, useTrialBalance } from '@/hooks/useAccounting';
import { CreateAccountDialog } from './CreateAccountDialog';
import { EditAccountDialog } from './EditAccountDialog';
import { SimpleTransactionDialog } from './SimpleTransactionDialog';
import { format } from 'date-fns';

export function ChartOfAccountsTab() {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<ChartAccount | null>(null);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

  const { data: accounts = [], isLoading } = useChartOfAccounts({ 
    type: typeFilter !== 'all' ? typeFilter : undefined 
  });
  
  const { data: trialBalance = [] } = useTrialBalance(format(new Date(), 'yyyy-MM-dd'));

  // Create a map of account balances
  const balanceMap = useMemo(() => {
    const map = new Map<string, number>();
    trialBalance.forEach((tb: any) => {
      map.set(tb.id, tb.balance || 0);
    });
    return map;
  }, [trialBalance]);

  const filteredAccounts = accounts.filter(account => 
    account.account_name.toLowerCase().includes(search.toLowerCase()) ||
    account.account_code.toLowerCase().includes(search.toLowerCase())
  );

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedAccounts(newExpanded);
  };

  const expandAll = () => {
    setExpandedAccounts(new Set(accounts.map(a => a.id)));
  };

  const collapseAll = () => {
    setExpandedAccounts(new Set());
  };

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'asset': return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      case 'liability': return 'bg-red-100 text-red-800 hover:bg-red-100';
      case 'equity': return 'bg-purple-100 text-purple-800 hover:bg-purple-100';
      case 'revenue': return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'expense': return 'bg-orange-100 text-orange-800 hover:bg-orange-100';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number, currency: string = 'TZS') => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  // Calculate totals by type
  const typeTotals = useMemo(() => {
    const totals: Record<string, number> = {
      asset: 0,
      liability: 0,
      equity: 0,
      revenue: 0,
      expense: 0,
    };
    
    accounts.forEach(account => {
      const balance = balanceMap.get(account.id) || 0;
      if (totals[account.account_type] !== undefined) {
        totals[account.account_type] += balance;
      }
    });
    
    return totals;
  }, [accounts, balanceMap]);

  // Group accounts by parent
  const rootAccounts = filteredAccounts.filter(a => !a.parent_id);
  const getChildren = (parentId: string) => 
    filteredAccounts.filter(a => a.parent_id === parentId);

  const handleQuickTransaction = (account: ChartAccount) => {
    setSelectedAccount(account);
    setShowTransactionDialog(true);
  };

  const exportToCSV = () => {
    const headers = ['Code', 'Name', 'Type', 'Subtype', 'Normal Balance', 'Balance', 'Status'];
    const rows = accounts.map(account => {
      const balance = balanceMap.get(account.id) || 0;
      return [
        account.account_code,
        `"${account.account_name}"`,
        account.account_type,
        account.account_subtype || '',
        account.normal_balance,
        balance,
        account.is_active ? 'Active' : 'Inactive'
      ].join(',');
    });
    
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chart-of-accounts-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderAccountRow = (account: typeof accounts[0], level: number = 0) => {
    const children = getChildren(account.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedAccounts.has(account.id);
    const balance = balanceMap.get(account.id) || 0;
    const isPositive = (account.normal_balance === 'debit' && balance >= 0) || 
                       (account.normal_balance === 'credit' && balance >= 0);

    return (
      <>
        <TableRow key={account.id} className={`${level > 0 ? 'bg-muted/30' : ''} group`}>
          <TableCell>
            <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 24}px` }}>
              {hasChildren ? (
                <button onClick={() => toggleExpand(account.id)} className="p-1 hover:bg-muted rounded">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              ) : (
                <span className="w-6" />
              )}
              <span className="font-mono text-sm">{account.account_code}</span>
            </div>
          </TableCell>
          <TableCell className="font-medium">{account.account_name}</TableCell>
          <TableCell>
            <Badge className={getAccountTypeColor(account.account_type)}>
              {account.account_type}
            </Badge>
          </TableCell>
          <TableCell className="text-right">
            <div className="flex items-center justify-end gap-1">
              {balance !== 0 && (
                isPositive ? 
                  <TrendingUp className="h-3 w-3 text-green-600" /> : 
                  <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span className={balance === 0 ? 'text-muted-foreground' : ''}>
                {formatCurrency(balance, account.currency)}
              </span>
            </div>
          </TableCell>
          <TableCell>
            <Badge variant={account.is_active ? 'default' : 'secondary'}>
              {account.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </TableCell>
          <TableCell>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleQuickTransaction(account)}
                title="Quick transaction"
              >
                <ArrowRightLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  setSelectedAccount(account);
                  setShowEditDialog(true);
                }}
                title="Edit account"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        {hasChildren && isExpanded && children.map(child => renderAccountRow(child, level + 1))}
      </>
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        {[
          { type: 'asset', label: 'Assets', color: 'blue' },
          { type: 'liability', label: 'Liabilities', color: 'red' },
          { type: 'equity', label: 'Equity', color: 'purple' },
          { type: 'revenue', label: 'Revenue', color: 'green' },
          { type: 'expense', label: 'Expenses', color: 'orange' },
        ].map(({ type, label, color }) => (
          <Card key={type} className={`border-l-4 border-l-${color}-500`}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
              <p className="text-xl font-bold">{formatCurrency(typeTotals[type] || 0)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Chart of Accounts</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={expandAll}>
                Expand All
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                Collapse All
              </Button>
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search accounts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {ACCOUNT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead className="w-28">Type</TableHead>
                  <TableHead className="text-right w-36">Balance</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading accounts...
                    </TableCell>
                  </TableRow>
                ) : rootAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No accounts found
                    </TableCell>
                  </TableRow>
                ) : (
                  rootAccounts.map(account => renderAccountRow(account))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        <CreateAccountDialog 
          open={showCreateDialog} 
          onOpenChange={setShowCreateDialog}
          accounts={accounts}
        />

        <EditAccountDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          account={selectedAccount}
          accounts={accounts}
        />

        <SimpleTransactionDialog
          open={showTransactionDialog}
          onOpenChange={setShowTransactionDialog}
          preselectedAccountId={selectedAccount?.id}
        />
      </Card>
    </div>
  );
}
