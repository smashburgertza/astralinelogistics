import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  customer_code?: string | null;
}

interface CustomerSelectorProps {
  value: string;
  customerName: string;
  onChange: (id: string, name: string) => void;
  customers: Customer[] | undefined;
  isLoading: boolean;
  placeholder?: string;
}

export function CustomerSelector({ 
  value, 
  customerName,
  onChange, 
  customers, 
  isLoading,
  placeholder = "Search customer..."
}: CustomerSelectorProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    if (!inputValue) return customers.slice(0, 20);
    const searchLower = inputValue.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchLower) ||
      c.phone?.toLowerCase().includes(searchLower) ||
      c.customer_code?.toLowerCase().includes(searchLower)
    ).slice(0, 20);
  }, [customers, inputValue]);

  const selectedCustomer = customers?.find(c => c.id === value);
  const displayValue = selectedCustomer?.name || customerName || '';

  const handleInputBlur = () => {
    if (inputValue.trim() && inputValue !== displayValue) {
      onChange('', inputValue.trim());
    }
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      onChange('', inputValue.trim());
      setOpen(false);
      setInputValue('');
    }
  };

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen && inputValue.trim()) {
        onChange('', inputValue.trim());
        setInputValue('');
      }
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full h-10 justify-between font-normal text-left",
            !displayValue && "text-muted-foreground"
          )}
        >
          <span className="truncate">
            {displayValue || placeholder}
          </span>
          <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={placeholder}
            value={inputValue}
            onValueChange={setInputValue}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
          />
          <CommandList>
            {isLoading ? (
              <div className="p-4 text-center">
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground text-center">
                {inputValue ? `Press Enter to use "${inputValue}"` : 'No customers found. Type a name.'}
              </div>
            ) : (
              <CommandGroup>
                {filteredCustomers.map((customer) => (
                  <CommandItem
                    key={customer.id}
                    value={customer.id}
                    onSelect={() => {
                      onChange(customer.id, customer.name);
                      setOpen(false);
                      setInputValue('');
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === customer.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{customer.name}</span>
                        {customer.customer_code && (
                          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {customer.customer_code}
                          </span>
                        )}
                      </div>
                      {customer.phone && (
                        <span className="text-xs text-muted-foreground">{customer.phone}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
