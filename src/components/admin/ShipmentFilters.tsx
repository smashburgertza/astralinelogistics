import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { REGIONS, SHIPMENT_STATUSES } from '@/lib/constants';

interface ShipmentFiltersProps {
  search: string;
  status: string;
  region: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onClear: () => void;
}

export function ShipmentFilters({
  search,
  status,
  region,
  onSearchChange,
  onStatusChange,
  onRegionChange,
  onClear,
}: ShipmentFiltersProps) {
  const hasFilters = search || status !== 'all' || region !== 'all';

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by tracking number or description..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 bg-background"
        />
      </div>
      
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full sm:w-[180px] bg-background">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {Object.entries(SHIPMENT_STATUSES).map(([key, { label }]) => (
            <SelectItem key={key} value={key}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select value={region} onValueChange={onRegionChange}>
        <SelectTrigger className="w-full sm:w-[180px] bg-background">
          <SelectValue placeholder="Region" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Regions</SelectItem>
          {Object.entries(REGIONS).map(([key, { label, flag }]) => (
            <SelectItem key={key} value={key}>
              {flag} {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {hasFilters && (
        <Button variant="ghost" onClick={onClear} className="shrink-0">
          <X className="h-4 w-4 mr-2" />
          Clear
        </Button>
      )}
    </div>
  );
}
