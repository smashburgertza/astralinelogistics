import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Upload, 
  Check, 
  X, 
  Link2, 
  Unlink, 
  Calculator,
  Building,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { useBankAccounts, BankAccount } from '@/hooks/useAccounting';
import { 
  useBankTransactions, 
  useUnreconciledJournalEntries,
  useCreateBankTransaction,
  useReconcileTransaction,
  useUnreconcileTransaction,
  useMarkReconciled,
  useReconciliationSummary,
  BankTransaction
} from '@/hooks/useBankReconciliation';

export function BankReconciliationTab() {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showMatchDialog, setShowMatchDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null);
  const [filterReconciled, setFilterReconciled] = useState<string>('all');

  const { data: bankAccounts = [] } = useBankAccounts();
  const selectedAccount = bankAccounts.find(a => a.id === selectedAccountId);

  const { data: transactions = [], isLoading: loadingTransactions } = useBankTransactions(
    selectedAccountId,
    { reconciled: filterReconciled === 'all' ? undefined : filterReconciled === 'reconciled' }
  );

  const { data: summary } = useReconciliationSummary(selectedAccountId);

  const formatCurrency = (amount: number, currency: string = 'TZS') => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleMatch = (transaction: BankTransaction) => {
    setSelectedTransaction(transaction);
    setShowMatchDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Account Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Bank Reconciliation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1 max-w-md">
              <Label>Select Bank Account</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a bank account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_name} - {account.bank_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedAccountId && (
              <Button onClick={() => setShowAddTransaction(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedAccountId && (
        <>
          {/* Reconciliation Summary */}
          {summary && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {formatCurrency(summary.bankBalance, selectedAccount?.currency)}
                  </div>
                  <p className="text-xs text-muted-foreground">Bank Statement Balance</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {formatCurrency(summary.bookBalance, selectedAccount?.currency)}
                  </div>
                  <p className="text-xs text-muted-foreground">Book Balance</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className={`text-2xl font-bold ${summary.difference !== 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {formatCurrency(summary.difference, selectedAccount?.currency)}
                  </div>
                  <p className="text-xs text-muted-foreground">Difference</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    <div>
                      <div className="text-2xl font-bold text-green-600">{summary.matchedCount}</div>
                      <p className="text-xs text-muted-foreground">Reconciled</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-amber-600">{summary.unmatchedCount}</div>
                      <p className="text-xs text-muted-foreground">Pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Bank Transactions</CardTitle>
                <Select value={filterReconciled} onValueChange={setFilterReconciled}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Transactions</SelectItem>
                    <SelectItem value="unreconciled">Unreconciled</SelectItem>
                    <SelectItem value="reconciled">Reconciled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <TransactionsTable 
                transactions={transactions}
                isLoading={loadingTransactions}
                currency={selectedAccount?.currency || 'TZS'}
                onMatch={handleMatch}
                bankAccountId={selectedAccountId}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* Add Transaction Dialog */}
      <AddTransactionDialog
        open={showAddTransaction}
        onOpenChange={setShowAddTransaction}
        bankAccountId={selectedAccountId}
      />

      {/* Match Dialog */}
      {selectedTransaction && selectedAccount && (
        <MatchTransactionDialog
          open={showMatchDialog}
          onOpenChange={setShowMatchDialog}
          transaction={selectedTransaction}
          bankAccount={selectedAccount}
        />
      )}
    </div>
  );
}

function TransactionsTable({ 
  transactions, 
  isLoading, 
  currency,
  onMatch,
  bankAccountId
}: { 
  transactions: BankTransaction[];
  isLoading: boolean;
  currency: string;
  onMatch: (tx: BankTransaction) => void;
  bankAccountId: string;
}) {
  const unreconcile = useUnreconcileTransaction();
  const markReconciled = useMarkReconciled();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading transactions...</div>;
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        No transactions found
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-28">Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead className="text-right">Debit</TableHead>
            <TableHead className="text-right">Credit</TableHead>
            <TableHead className="w-28">Status</TableHead>
            <TableHead className="w-32">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow key={tx.id}>
              <TableCell className="font-mono text-sm">
                {format(new Date(tx.transaction_date), 'MMM dd, yyyy')}
              </TableCell>
              <TableCell>{tx.description || '-'}</TableCell>
              <TableCell className="font-mono text-sm">{tx.reference || '-'}</TableCell>
              <TableCell className="text-right text-red-600">
                {tx.debit_amount ? formatCurrency(tx.debit_amount) : '-'}
              </TableCell>
              <TableCell className="text-right text-green-600">
                {tx.credit_amount ? formatCurrency(tx.credit_amount) : '-'}
              </TableCell>
              <TableCell>
                <Badge variant={tx.is_reconciled ? 'default' : 'secondary'}>
                  {tx.is_reconciled ? 'Reconciled' : 'Pending'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {!tx.is_reconciled ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onMatch(tx)}
                        title="Match with journal entry"
                      >
                        <Link2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markReconciled.mutate({ 
                          transactionId: tx.id, 
                          bankAccountId 
                        })}
                        title="Mark as reconciled"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => unreconcile.mutate({ 
                        transactionId: tx.id, 
                        bankAccountId 
                      })}
                      title="Unreconcile"
                    >
                      <Unlink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function AddTransactionDialog({
  open,
  onOpenChange,
  bankAccountId
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankAccountId: string;
}) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [type, setType] = useState<'debit' | 'credit'>('debit');
  const [amount, setAmount] = useState(0);

  const createTransaction = useCreateBankTransaction();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTransaction.mutate({
      bank_account_id: bankAccountId,
      transaction_date: date,
      description,
      reference: reference || null,
      debit_amount: type === 'debit' ? amount : 0,
      credit_amount: type === 'credit' ? amount : 0,
      balance: null,
      is_reconciled: false,
      journal_entry_id: null,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setDescription('');
        setReference('');
        setAmount(0);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Bank Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v: 'debit' | 'credit') => setType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debit">Payment (Debit)</SelectItem>
                  <SelectItem value="credit">Deposit (Credit)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Transaction description"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Reference</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Check #, Transfer ID, etc."
              />
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                min={0}
                step="0.01"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTransaction.isPending}>
              {createTransaction.isPending ? 'Adding...' : 'Add Transaction'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MatchTransactionDialog({
  open,
  onOpenChange,
  transaction,
  bankAccount
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: BankTransaction;
  bankAccount: BankAccount;
}) {
  const { data: journalLines = [], isLoading } = useUnreconciledJournalEntries(
    bankAccount.id,
    bankAccount.chart_account_id
  );
  const reconcile = useReconcileTransaction();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: bankAccount.currency || 'TZS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleMatch = (journalEntryId: string) => {
    reconcile.mutate({
      transactionId: transaction.id,
      journalEntryId,
      bankAccountId: bankAccount.id,
    }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const transactionAmount = transaction.debit_amount || transaction.credit_amount || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Match Bank Transaction</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Transaction being matched */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{transaction.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}
                    {transaction.reference && ` • Ref: ${transaction.reference}`}
                  </p>
                </div>
                <div className={`text-lg font-bold ${transaction.credit_amount ? 'text-green-600' : 'text-red-600'}`}>
                  {transaction.credit_amount 
                    ? `+${formatCurrency(transaction.credit_amount)}`
                    : `-${formatCurrency(transaction.debit_amount || 0)}`
                  }
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Matching journal entries */}
          <div className="space-y-2">
            <Label>Select Matching Journal Entry</Label>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-4">Loading journal entries...</p>
            ) : journalLines.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No unreconciled journal entries found for this account
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {journalLines.map((line: any) => {
                  const lineAmount = line.debit_amount || line.credit_amount || 0;
                  const isMatch = Math.abs(lineAmount - transactionAmount) < 0.01;
                  
                  return (
                    <Card 
                      key={line.id} 
                      className={`cursor-pointer hover:border-primary transition-colors ${isMatch ? 'border-green-500 bg-green-50' : ''}`}
                      onClick={() => handleMatch(line.journal_entry_id)}
                    >
                      <CardContent className="py-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{line.journal_entry?.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {line.journal_entry?.entry_number} • {format(new Date(line.journal_entry?.entry_date), 'MMM dd, yyyy')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${line.credit_amount ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(lineAmount)}
                            </span>
                            {isMatch && (
                              <Badge variant="default" className="bg-green-600">
                                <Check className="h-3 w-3 mr-1" />
                                Match
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
