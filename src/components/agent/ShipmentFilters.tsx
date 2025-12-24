import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { SHIPMENT_STATUSES } from '@/lib/constants';

interface AgentShipmentFiltersProps {
  search: string;
  status: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onClear: () => void;
}

export function AgentShipmentFilters({
  search,
  status,
  onSearchChange,
  onStatusChange,
  onClear,
}: AgentShipmentFiltersProps) {
  const hasFilters = search || status !== 'all';

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
      
      {hasFilters && (
        <Button variant="ghost" onClick={onClear} className="shrink-0">
          <X className="h-4 w-4 mr-2" />
          Clear
        </Button>
      )}
    </div>
  );
}
