import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCreateAccount, useBankAccounts, useCreateBankAccount, ACCOUNT_TYPES, ChartAccount } from '@/hooks/useAccounting';
import { 
  Building2, 
  CreditCard, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  Receipt,
  Banknote,
  Users,
  Package,
  Truck,
  Zap,
  Home,
  Shield,
  FileText,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Account code prefixes by type
const ACCOUNT_CODE_PREFIXES: Record<string, string> = {
  asset: '1',
  liability: '2',
  equity: '3',
  revenue: '4',
  expense: '5',
};

// Account templates for quick creation
const ACCOUNT_TEMPLATES = [
  {
    id: 'bank_account',
    name: 'Bank Account',
    description: 'Create a new bank/cash account for managing funds',
    icon: Building2,
    color: 'text-blue-600 bg-blue-100',
    accountType: 'asset',
    subtype: 'cash',
    createsBankAccount: true,
  },
  {
    id: 'expense_category',
    name: 'Expense Category',
    description: 'Track business expenses like utilities, rent, etc.',
    icon: TrendingDown,
    color: 'text-red-600 bg-red-100',
    accountType: 'expense',
    subtype: '',
    subtypeOptions: [
      { value: 'operating', label: 'Operating Expense' },
      { value: 'admin', label: 'Administrative' },
      { value: 'cost_of_goods', label: 'Cost of Goods Sold' },
      { value: 'other', label: 'Other Expense' },
    ],
  },
  {
    id: 'revenue_stream',
    name: 'Revenue Stream',
    description: 'Income sources like sales, services, fees',
    icon: TrendingUp,
    color: 'text-green-600 bg-green-100',
    accountType: 'revenue',
    subtype: '',
    subtypeOptions: [
      { value: 'shipping', label: 'Shipping Revenue' },
      { value: 'service', label: 'Service Revenue' },
      { value: 'fee', label: 'Fees & Charges' },
      { value: 'other', label: 'Other Income' },
    ],
  },
  {
    id: 'receivable',
    name: 'Accounts Receivable',
    description: 'Track money owed to you by customers',
    icon: Receipt,
    color: 'text-amber-600 bg-amber-100',
    accountType: 'asset',
    subtype: 'receivable',
  },
  {
    id: 'payable',
    name: 'Accounts Payable',
    description: 'Track money you owe to suppliers/vendors',
    icon: CreditCard,
    color: 'text-purple-600 bg-purple-100',
    accountType: 'liability',
    subtype: 'payable',
  },
  {
    id: 'custom',
    name: 'Custom Account',
    description: 'Full control over all account settings',
    icon: FileText,
    color: 'text-gray-600 bg-gray-100',
    accountType: '',
    subtype: '',
  },
];

// Expense presets for quick selection
const EXPENSE_PRESETS = [
  { name: 'Shipping & Freight', icon: Truck, subtype: 'operating' },
  { name: 'Utilities', icon: Zap, subtype: 'operating' },
  { name: 'Rent & Lease', icon: Home, subtype: 'operating' },
  { name: 'Salaries & Wages', icon: Users, subtype: 'operating' },
  { name: 'Office Supplies', icon: Package, subtype: 'admin' },
  { name: 'Insurance', icon: Shield, subtype: 'operating' },
  { name: 'Bank Charges', icon: Building2, subtype: 'operating' },
];

interface CreateAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: ChartAccount[];
}

export function CreateAccountDialog({ open, onOpenChange, accounts }: CreateAccountDialogProps) {
  const [step, setStep] = useState<'select' | 'details'>('select');
  const [selectedTemplate, setSelectedTemplate] = useState<typeof ACCOUNT_TEMPLATES[0] | null>(null);
  
  // Account fields
  const [accountCode, setAccountCode] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<string>('');
  const [accountSubtype, setAccountSubtype] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('TZS');
  const [isActive, setIsActive] = useState(true);
  
  // Bank account specific fields
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');

  const createAccount = useCreateAccount();
  const createBankAccount = useCreateBankAccount();

  // Generate next account code based on type
  const generateNextCode = useMemo(() => {
    if (!accountType) return '';
    
    const prefix = ACCOUNT_CODE_PREFIXES[accountType] || '9';
    const typeAccounts = accounts.filter(a => 
      a.account_code.startsWith(prefix) && a.account_type === accountType
    );
    
    if (typeAccounts.length === 0) {
      return `${prefix}000`;
    }
    
    const codes = typeAccounts.map(a => {
      const numPart = a.account_code.slice(prefix.length);
      return parseInt(numPart, 10) || 0;
    });
    const maxCode = Math.max(...codes);
    const nextNum = maxCode + 1;
    
    return `${prefix}${nextNum.toString().padStart(3, '0')}`;
  }, [accountType, accounts]);

  // Auto-update code when type changes
  useEffect(() => {
    if (accountType && generateNextCode) {
      setAccountCode(generateNextCode);
    }
  }, [accountType, generateNextCode]);

  // When template is selected, pre-fill values
  useEffect(() => {
    if (selectedTemplate) {
      setAccountType(selectedTemplate.accountType);
      setAccountSubtype(selectedTemplate.subtype);
    }
  }, [selectedTemplate]);

  const handleTemplateSelect = (template: typeof ACCOUNT_TEMPLATES[0]) => {
    setSelectedTemplate(template);
    setStep('details');
  };

  const handleExpensePresetSelect = (preset: typeof EXPENSE_PRESETS[0]) => {
    setAccountName(preset.name);
    setAccountSubtype(preset.subtype);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedType = ACCOUNT_TYPES.find(t => t.value === accountType);
    
    // Create the chart account first
    createAccount.mutate({
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
      onSuccess: (newAccount) => {
        // If it's a bank account template, also create the bank account record
        if (selectedTemplate?.createsBankAccount && newAccount) {
          createBankAccount.mutate({
            account_name: accountName,
            bank_name: bankName || 'Cash',
            account_number: bankAccountNumber || null,
            currency,
            opening_balance: parseFloat(openingBalance) || 0,
            chart_account_id: newAccount.id,
            is_active: true,
          }, {
            onSuccess: () => {
              onOpenChange(false);
              resetForm();
            },
          });
        } else {
          onOpenChange(false);
          resetForm();
        }
      },
    });
  };

  const resetForm = () => {
    setStep('select');
    setSelectedTemplate(null);
    setAccountCode('');
    setAccountName('');
    setAccountType('');
    setAccountSubtype('');
    setParentId('');
    setDescription('');
    setCurrency('TZS');
    setIsActive(true);
    setBankName('');
    setBankAccountNumber('');
    setOpeningBalance('0');
  };

  const handleBack = () => {
    setStep('select');
    setSelectedTemplate(null);
    setAccountName('');
    setAccountSubtype('');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === 'select' ? 'Create New Account' : (
              <div className="flex items-center gap-2">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={handleBack}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                {selectedTemplate?.name}
              </div>
            )}
          </DialogTitle>
          {step === 'select' && (
            <DialogDescription>
              What type of account would you like to create?
            </DialogDescription>
          )}
        </DialogHeader>

        {step === 'select' ? (
          <div className="grid grid-cols-2 gap-3">
            {ACCOUNT_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleTemplateSelect(template)}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-lg border text-left transition-all",
                  "hover:border-primary hover:bg-primary/5 hover:shadow-sm",
                  "focus:outline-none focus:ring-2 focus:ring-primary/20"
                )}
              >
                <div className={cn("p-2 rounded-lg shrink-0", template.color)}>
                  <template.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{template.name}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {template.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Quick presets for expenses */}
            {selectedTemplate?.id === 'expense_category' && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Quick Select</Label>
                <div className="flex flex-wrap gap-2">
                  {EXPENSE_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleExpensePresetSelect(preset)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-all",
                        accountName === preset.name 
                          ? "border-primary bg-primary/10 text-primary" 
                          : "hover:border-primary/50"
                      )}
                    >
                      <preset.icon className="h-3 w-3" />
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="account_name">Account Name *</Label>
                <Input
                  id="account_name"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder={
                    selectedTemplate?.id === 'bank_account' ? 'e.g., CRDB TZS Account' :
                    selectedTemplate?.id === 'expense_category' ? 'e.g., Office Supplies' :
                    selectedTemplate?.id === 'revenue_stream' ? 'e.g., Shipping Revenue' :
                    'Account name'
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_code">Account Code</Label>
                <Input
                  id="account_code"
                  value={accountCode}
                  onChange={(e) => setAccountCode(e.target.value)}
                  placeholder="Auto-generated"
                  className="bg-muted"
                />
              </div>
            </div>

            {/* Bank-specific fields */}
            {selectedTemplate?.createsBankAccount && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="col-span-2">
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-3">Bank Details</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_name">Bank Name *</Label>
                  <Input
                    id="bank_name"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g., CRDB, NMB, Cash"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_account_number">Account Number</Label>
                  <Input
                    id="bank_account_number"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opening_balance">Opening Balance</Label>
                  <Input
                    id="opening_balance"
                    type="number"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency *</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TZS">TZS - Tanzanian Shilling</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Subtype selection for templates with options */}
            {selectedTemplate?.subtypeOptions && (
              <div className="space-y-2">
                <Label>Category Type</Label>
                <Select value={accountSubtype} onValueChange={setAccountSubtype}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category type" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedTemplate.subtypeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Currency for non-bank accounts */}
            {!selectedTemplate?.createsBankAccount && (
              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label htmlFor="parent_id">Parent Account</Label>
                  <Select value={parentId} onValueChange={setParentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="None (root level)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (root level)</SelectItem>
                      {accounts
                        .filter(a => a.account_type === accountType)
                        .map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.account_code} - {account.account_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Full custom mode */}
            {selectedTemplate?.id === 'custom' && (
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
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description for this account"
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

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createAccount.isPending || createBankAccount.isPending}>
                {createAccount.isPending || createBankAccount.isPending ? 'Creating...' : 'Create Account'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
