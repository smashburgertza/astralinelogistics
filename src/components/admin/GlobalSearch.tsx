import { useState, useEffect, useRef } from 'react';
import { Search, Package, Users, FileText, ReceiptText, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  type: 'shipment' | 'customer' | 'invoice' | 'estimate';
  title: string;
  subtitle: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

const typeConfig = {
  shipment: { icon: Package, label: 'Shipment', route: '/admin/shipments', color: 'text-blue-500' },
  customer: { icon: Users, label: 'Customer', route: '/admin/customers', color: 'text-purple-500' },
  invoice: { icon: FileText, label: 'Invoice', route: '/admin/invoices', color: 'text-green-500' },
  estimate: { icon: ReceiptText, label: 'Estimate', route: '/admin/estimates', color: 'text-orange-500' },
};

export function GlobalSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search when query changes
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    const search = async () => {
      setIsLoading(true);
      const searchResults: SearchResult[] = [];

      try {
        // Search shipments
        const { data: shipments } = await supabase
          .from('shipments')
          .select('id, tracking_number, status, origin_region, customers(name)')
          .or(`tracking_number.ilike.%${debouncedQuery}%,description.ilike.%${debouncedQuery}%`)
          .limit(5);

        if (shipments) {
          shipments.forEach((s: any) => {
            searchResults.push({
              id: s.id,
              type: 'shipment',
              title: s.tracking_number,
              subtitle: s.customers?.name || 'No customer',
              badge: s.status,
              badgeVariant: s.status === 'delivered' ? 'default' : 'secondary',
            });
          });
        }

        // Search customers
        const { data: customers } = await supabase
          .from('customers')
          .select('id, name, email, phone')
          .or(`name.ilike.%${debouncedQuery}%,email.ilike.%${debouncedQuery}%,phone.ilike.%${debouncedQuery}%`)
          .limit(5);

        if (customers) {
          customers.forEach((c) => {
            searchResults.push({
              id: c.id,
              type: 'customer',
              title: c.name,
              subtitle: c.email || c.phone || 'No contact info',
            });
          });
        }

        // Search invoices
        const { data: invoices } = await supabase
          .from('invoices')
          .select('id, invoice_number, status, amount, currency, customers(name)')
          .or(`invoice_number.ilike.%${debouncedQuery}%`)
          .limit(5);

        if (invoices) {
          invoices.forEach((i: any) => {
            searchResults.push({
              id: i.id,
              type: 'invoice',
              title: i.invoice_number,
              subtitle: `${i.customers?.name || 'Unknown'} - ${i.currency} ${i.amount?.toLocaleString()}`,
              badge: i.status,
              badgeVariant: i.status === 'paid' ? 'default' : i.status === 'overdue' ? 'destructive' : 'secondary',
            });
          });
        }

        // Search estimates
        const { data: estimates } = await supabase
          .from('estimates')
          .select('id, estimate_number, status, total, currency, customers(name)')
          .or(`estimate_number.ilike.%${debouncedQuery}%`)
          .limit(5);

        if (estimates) {
          estimates.forEach((e: any) => {
            searchResults.push({
              id: e.id,
              type: 'estimate',
              title: e.estimate_number,
              subtitle: `${e.customers?.name || 'Unknown'} - ${e.currency} ${e.total?.toLocaleString()}`,
              badge: e.status,
              badgeVariant: e.status === 'approved' ? 'default' : 'secondary',
            });
          });
        }

        setResults(searchResults);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    search();
  }, [debouncedQuery]);

  const handleSelect = (result: SearchResult) => {
    const config = typeConfig[result.type];
    navigate(config.route);
    setOpen(false);
    setQuery('');
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="hidden md:flex relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search shipments, customers... (⌘K)"
            className="pl-10 bg-muted/50 border-0 focus-visible:ring-1 cursor-pointer"
            onClick={() => setOpen(true)}
            readOnly
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="w-4 h-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search across all records..."
              className="flex h-11 w-full bg-transparent py-3 px-2 text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setQuery('')}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
          <CommandList className="max-h-80">
            {isLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}
            
            {!isLoading && query.length >= 2 && results.length === 0 && (
              <CommandEmpty>No results found for "{query}"</CommandEmpty>
            )}

            {!isLoading && query.length < 2 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search
              </div>
            )}

            {!isLoading && Object.entries(groupedResults).map(([type, items], index) => {
              const config = typeConfig[type as keyof typeof typeConfig];
              const Icon = config.icon;
              
              return (
                <div key={type}>
                  {index > 0 && <CommandSeparator />}
                  <CommandGroup heading={config.label + 's'}>
                    {items.map((result) => (
                      <CommandItem
                        key={result.id}
                        onSelect={() => handleSelect(result)}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                      >
                        <Icon className={cn("w-4 h-4 shrink-0", config.color)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{result.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                        </div>
                        {result.badge && (
                          <Badge variant={result.badgeVariant} className="shrink-0 text-xs">
                            {result.badge}
                          </Badge>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </div>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}