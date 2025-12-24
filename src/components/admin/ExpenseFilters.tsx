import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { EXPENSE_CATEGORIES, EXPENSE_STATUSES } from '@/hooks/useExpenses';
import { REGIONS } from '@/lib/constants';

interface ExpenseFiltersProps {
  search: string;
  category: string;
  region: string;
  status?: string;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onStatusChange?: (value: string) => void;
  onClear: () => void;
}

export function ExpenseFilters({
  search,
  category,
  region,
  status,
  onSearchChange,
  onCategoryChange,
  onRegionChange,
  onStatusChange,
  onClear,
}: ExpenseFiltersProps) {
  const hasFilters = search || category !== 'all' || region !== 'all' || (status && status !== 'all');

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-wrap">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by description..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <Select value={category} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {EXPENSE_CATEGORIES.map((cat) => (
            <SelectItem key={cat.value} value={cat.value}>
              {cat.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={region} onValueChange={onRegionChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Region" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Regions</SelectItem>
          {Object.entries(REGIONS).map(([key, value]) => (
            <SelectItem key={key} value={key}>
              {value.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {onStatusChange && (
        <Select value={status || 'all'} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {EXPENSE_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
