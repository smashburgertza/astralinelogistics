import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, ChevronRight, ChevronDown } from 'lucide-react';
import { useChartOfAccounts, ACCOUNT_TYPES } from '@/hooks/useAccounting';
import { CreateAccountDialog } from './CreateAccountDialog';

export function ChartOfAccountsTab() {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

  const { data: accounts = [], isLoading } = useChartOfAccounts({ 
    type: typeFilter !== 'all' ? typeFilter : undefined 
  });

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

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'asset': return 'bg-blue-100 text-blue-800';
      case 'liability': return 'bg-red-100 text-red-800';
      case 'equity': return 'bg-purple-100 text-purple-800';
      case 'revenue': return 'bg-green-100 text-green-800';
      case 'expense': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Group accounts by parent
  const rootAccounts = filteredAccounts.filter(a => !a.parent_id);
  const getChildren = (parentId: string) => 
    filteredAccounts.filter(a => a.parent_id === parentId);

  const renderAccountRow = (account: typeof accounts[0], level: number = 0) => {
    const children = getChildren(account.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedAccounts.has(account.id);

    return (
      <>
        <TableRow key={account.id} className={level > 0 ? 'bg-muted/30' : ''}>
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
          <TableCell>{account.account_subtype || '-'}</TableCell>
          <TableCell>
            <Badge variant="outline">
              {account.normal_balance}
            </Badge>
          </TableCell>
          <TableCell>
            <Badge variant={account.is_active ? 'default' : 'secondary'}>
              {account.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </TableCell>
          <TableCell>
            <Button variant="ghost" size="icon">
              <Edit className="h-4 w-4" />
            </Button>
          </TableCell>
        </TableRow>
        {hasChildren && isExpanded && children.map(child => renderAccountRow(child, level + 1))}
      </>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Chart of Accounts</CardTitle>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
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
                <TableHead className="w-32">Subtype</TableHead>
                <TableHead className="w-28">Normal Balance</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading accounts...
                  </TableCell>
                </TableRow>
              ) : rootAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
    </Card>
  );
}
