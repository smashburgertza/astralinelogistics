import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Search, X, CalendarIcon } from 'lucide-react';
import { EXPENSE_STATUSES } from '@/hooks/useExpenses';
import { useExpenseCategories } from '@/hooks/useExpenseCategories';
import { useActiveRegions } from '@/hooks/useRegions';
import { cn } from '@/lib/utils';

interface ExpenseFiltersProps {
  search: string;
  category: string;
  region: string;
  status?: string;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onStatusChange?: (value: string) => void;
  onDateFromChange?: (date: Date | null) => void;
  onDateToChange?: (date: Date | null) => void;
  onClear: () => void;
}

export function ExpenseFilters({
  search,
  category,
  region,
  status,
  dateFrom,
  dateTo,
  onSearchChange,
  onCategoryChange,
  onRegionChange,
  onStatusChange,
  onDateFromChange,
  onDateToChange,
  onClear,
}: ExpenseFiltersProps) {
  const { data: regions } = useActiveRegions();
  const { data: categories = [] } = useExpenseCategories();
  const hasFilters = search || category !== 'all' || region !== 'all' || (status && status !== 'all') || dateFrom || dateTo;

  return (
    <div className="flex flex-col gap-4">
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
            {categories.map((cat) => (
              cat.children && cat.children.length > 0 ? (
                <div key={cat.id}>
                  <SelectItem value={cat.slug} className="font-semibold">
                    {cat.name}
                  </SelectItem>
                  {cat.children.map((sub) => (
                    <SelectItem key={sub.id} value={sub.slug} className="pl-6">
                      ↳ {sub.name}
                    </SelectItem>
                  ))}
                </div>
              ) : (
                <SelectItem key={cat.id} value={cat.slug}>
                  {cat.name}
                </SelectItem>
              )
            ))}
          </SelectContent>
        </Select>

        <Select value={region} onValueChange={onRegionChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Regions</SelectItem>
            {regions?.map((r) => (
              <SelectItem key={r.id} value={r.code}>
                {r.flag_emoji} {r.name}
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
      </div>

      {/* Date Range Filters */}
      {onDateFromChange && onDateToChange && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">Date range:</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "justify-start text-left font-normal",
                  !dateFrom && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, "MMM d, yyyy") : "From date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFrom || undefined}
                onSelect={(date) => onDateFromChange(date || null)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <span className="text-muted-foreground">—</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "justify-start text-left font-normal",
                  !dateTo && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, "MMM d, yyyy") : "To date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateTo || undefined}
                onSelect={(date) => onDateToChange(date || null)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {(dateFrom || dateTo) && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                onDateFromChange(null);
                onDateToChange(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {hasFilters && (
        <div className="flex">
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="h-4 w-4 mr-1" />
            Clear all filters
          </Button>
        </div>
      )}
    </div>
  );
}