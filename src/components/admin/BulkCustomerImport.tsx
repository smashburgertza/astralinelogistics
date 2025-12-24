import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBulkCreateCustomers } from '@/hooks/useCustomers';

interface ParsedCustomer {
  name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  address?: string;
  notes?: string;
  isValid: boolean;
  error?: string;
}

export function BulkCustomerImport() {
  const [open, setOpen] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedCustomer[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkCreate = useBulkCreateCustomers();

  const parseCSV = (text: string): ParsedCustomer[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV must have a header row and at least one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const nameIndex = headers.findIndex(h => h === 'name');
    
    if (nameIndex === -1) {
      throw new Error('CSV must have a "name" column');
    }

    const emailIndex = headers.findIndex(h => h === 'email');
    const phoneIndex = headers.findIndex(h => h === 'phone');
    const companyIndex = headers.findIndex(h => ['company', 'company_name', 'companyname'].includes(h));
    const addressIndex = headers.findIndex(h => h === 'address');
    const notesIndex = headers.findIndex(h => h === 'notes');

    return lines.slice(1).map(line => {
      const values = parseCSVLine(line);
      const name = values[nameIndex]?.trim() || '';
      const email = emailIndex >= 0 ? values[emailIndex]?.trim() : undefined;
      
      const isValid = name.length > 0;
      const error = !isValid ? 'Name is required' : undefined;

      return {
        name,
        email: email || undefined,
        phone: phoneIndex >= 0 ? values[phoneIndex]?.trim() || undefined : undefined,
        company_name: companyIndex >= 0 ? values[companyIndex]?.trim() || undefined : undefined,
        address: addressIndex >= 0 ? values[addressIndex]?.trim() || undefined : undefined,
        notes: notesIndex >= 0 ? values[notesIndex]?.trim() || undefined : undefined,
        isValid,
        error,
      };
    });
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.replace(/^["']|["']$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.replace(/^["']|["']$/g, ''));
    return result;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError(null);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);
        setParsedData(parsed);
      } catch (error: any) {
        setParseError(error.message);
        setParsedData([]);
      }
    };

    reader.readAsText(file);
  };

  const handleImport = async () => {
    const validCustomers = parsedData
      .filter(c => c.isValid)
      .map(({ name, email, phone, company_name, address, notes }) => ({
        name,
        email: email || null,
        phone: phone || null,
        company_name: company_name || null,
        address: address || null,
        notes: notes || null,
      }));

    if (validCustomers.length === 0) {
      setParseError('No valid customers to import');
      return;
    }

    await bulkCreate.mutateAsync(validCustomers);
    setOpen(false);
    setParsedData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validCount = parsedData.filter(c => c.isValid).length;
  const invalidCount = parsedData.filter(c => !c.isValid).length;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        setParsedData([]);
        setParseError(null);
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Bulk Import Customers</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              Upload a CSV file with columns: <strong>name</strong> (required), email, phone, company_name, address, notes
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-upload"
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              Select CSV File
            </Button>
          </div>

          {parseError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}

          {parsedData.length > 0 && (
            <>
              <div className="flex items-center gap-4">
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {validCount} valid
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <X className="h-3 w-3" />
                    {invalidCount} invalid
                  </Badge>
                )}
              </div>

              <ScrollArea className="h-[300px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Status</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Company</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((customer, index) => (
                      <TableRow key={index} className={!customer.isValid ? 'bg-destructive/10' : ''}>
                        <TableCell>
                          {customer.isValid ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <X className="h-4 w-4 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {customer.name || <span className="text-destructive italic">Missing</span>}
                        </TableCell>
                        <TableCell>{customer.email || '-'}</TableCell>
                        <TableCell>{customer.phone || '-'}</TableCell>
                        <TableCell>{customer.company_name || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => {
                  setParsedData([]);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}>
                  Clear
                </Button>
                <Button 
                  onClick={handleImport} 
                  disabled={validCount === 0 || bulkCreate.isPending}
                >
                  {bulkCreate.isPending ? 'Importing...' : `Import ${validCount} Customers`}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
