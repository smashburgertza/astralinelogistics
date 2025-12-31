import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Check, X, AlertCircle } from 'lucide-react';
import { format, parse } from 'date-fns';
import { useCreateBankTransaction } from '@/hooks/useBankReconciliation';
import { toast } from 'sonner';

interface ParsedTransaction {
  date: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  balance?: number;
  isValid: boolean;
  error?: string;
}

interface ImportBankStatementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankAccountId: string;
}

export function ImportBankStatementDialog({ 
  open, 
  onOpenChange, 
  bankAccountId 
}: ImportBankStatementDialogProps) {
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createTransaction = useCreateBankTransaction();

  const parseCSV = (content: string): ParsedTransaction[] => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    // Try to detect header
    const header = lines[0].toLowerCase();
    const hasHeader = header.includes('date') || header.includes('description') || header.includes('amount');
    const startIndex = hasHeader ? 1 : 0;

    const transactions: ParsedTransaction[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      // Split by comma, handling quoted values
      const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/"/g, '').trim()) || [];
      
      if (values.length < 3) {
        transactions.push({
          date: '',
          description: line,
          reference: '',
          debit: 0,
          credit: 0,
          isValid: false,
          error: 'Invalid format',
        });
        continue;
      }

      // Try to parse date (common formats)
      let parsedDate = '';
      const dateStr = values[0];
      const dateFormats = ['yyyy-MM-dd', 'dd/MM/yyyy', 'MM/dd/yyyy', 'dd-MM-yyyy'];
      
      for (const fmt of dateFormats) {
        try {
          const date = parse(dateStr, fmt, new Date());
          if (!isNaN(date.getTime())) {
            parsedDate = format(date, 'yyyy-MM-dd');
            break;
          }
        } catch {}
      }

      const description = values[1] || '';
      const reference = values.length > 4 ? values[2] : '';
      
      // Parse amounts - try different column positions
      let debit = 0;
      let credit = 0;
      
      if (values.length >= 4) {
        // Format: Date, Description, Debit, Credit
        debit = Math.abs(parseFloat(values[2]?.replace(/[^0-9.-]/g, '')) || 0);
        credit = Math.abs(parseFloat(values[3]?.replace(/[^0-9.-]/g, '')) || 0);
      } else {
        // Format: Date, Description, Amount (positive = credit, negative = debit)
        const amount = parseFloat(values[2]?.replace(/[^0-9.-]/g, '')) || 0;
        if (amount < 0) {
          debit = Math.abs(amount);
        } else {
          credit = amount;
        }
      }

      transactions.push({
        date: parsedDate,
        description,
        reference,
        debit,
        credit,
        isValid: !!parsedDate && (debit > 0 || credit > 0),
        error: !parsedDate ? 'Invalid date' : (debit === 0 && credit === 0) ? 'No amount' : undefined,
      });
    }

    return transactions;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseCSV(content);
      setParsedTransactions(parsed);
    };
    
    reader.readAsText(file);
  };

  const handleImport = async () => {
    const validTransactions = parsedTransactions.filter(t => t.isValid);
    if (validTransactions.length === 0) {
      toast.error('No valid transactions to import');
      return;
    }

    setIsImporting(true);
    let imported = 0;
    let errors = 0;

    for (const tx of validTransactions) {
      try {
        await createTransaction.mutateAsync({
          bank_account_id: bankAccountId,
          transaction_date: tx.date,
          description: tx.description,
          reference: tx.reference || null,
          debit_amount: tx.debit,
          credit_amount: tx.credit,
          balance: tx.balance || null,
          is_reconciled: false,
          journal_entry_id: null,
        });
        imported++;
      } catch {
        errors++;
      }
    }

    setIsImporting(false);
    
    if (imported > 0) {
      toast.success(`Imported ${imported} transaction${imported > 1 ? 's' : ''}`);
    }
    if (errors > 0) {
      toast.error(`${errors} transaction${errors > 1 ? 's' : ''} failed to import`);
    }
    
    onOpenChange(false);
    setParsedTransactions([]);
    setFileName('');
  };

  const validCount = parsedTransactions.filter(t => t.isValid).length;
  const invalidCount = parsedTransactions.filter(t => !t.isValid).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Bank Statement
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file with your bank transactions. The file should have columns for Date, Description, and Amount (or Debit/Credit).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>Select CSV File</Label>
            <div className="flex gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1"
              >
                <FileText className="h-4 w-4 mr-2" />
                {fileName || 'Choose file...'}
              </Button>
            </div>
          </div>

          {/* Preview */}
          {parsedTransactions.length > 0 && (
            <>
              <div className="flex items-center gap-4 text-sm">
                <Badge variant="default" className="gap-1">
                  <Check className="h-3 w-3" />
                  {validCount} valid
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <X className="h-3 w-3" />
                    {invalidCount} invalid
                  </Badge>
                )}
              </div>

              <div className="border rounded-md overflow-auto flex-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="w-28">Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-24">Reference</TableHead>
                      <TableHead className="text-right w-28">Debit</TableHead>
                      <TableHead className="text-right w-28">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedTransactions.slice(0, 50).map((tx, index) => (
                      <TableRow key={index} className={!tx.isValid ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                        <TableCell>
                          {tx.isValid ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {tx.date || <span className="text-red-600">Invalid</span>}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{tx.description}</TableCell>
                        <TableCell className="font-mono text-sm">{tx.reference || '-'}</TableCell>
                        <TableCell className="text-right text-red-600">
                          {tx.debit > 0 ? tx.debit.toLocaleString() : '-'}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {tx.credit > 0 ? tx.credit.toLocaleString() : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedTransactions.length > 50 && (
                  <p className="text-sm text-muted-foreground p-2 text-center">
                    Showing first 50 of {parsedTransactions.length} transactions
                  </p>
                )}
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={validCount === 0 || isImporting}
            >
              {isImporting ? 'Importing...' : `Import ${validCount} Transaction${validCount !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
