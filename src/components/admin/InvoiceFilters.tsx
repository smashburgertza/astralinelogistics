import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X, Truck, Package } from 'lucide-react';
import { INVOICE_STATUSES } from '@/hooks/useInvoices';

interface InvoiceFiltersProps {
  search: string;
  status: string;
  invoiceType: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onClear: () => void;
}

export function InvoiceFilters({
  search,
  status,
  invoiceType,
  onSearchChange,
  onStatusChange,
  onTypeChange,
  onClear,
}: InvoiceFiltersProps) {
  const hasFilters = search || status !== 'all' || invoiceType !== 'all';

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by invoice number..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <Select value={invoiceType} onValueChange={onTypeChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="shipping">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4" /> Shipping Only
            </div>
          </SelectItem>
          <SelectItem value="purchase_shipping">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4" /> Purchase + Shipping
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full sm:w-[160px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {Object.entries(INVOICE_STATUSES).map(([key, { label }]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="icon" onClick={onClear}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
