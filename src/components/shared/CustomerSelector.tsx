import { useState, useEffect, useMemo } from 'react';
import { Check, ChevronsUpDown, Plus, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Tables } from '@/integrations/supabase/types';

interface CustomerSelectorProps {
  customers: Tables<'customers'>[] | undefined;
  selectedCustomerId: string;
  customerName: string;
  onCustomerChange: (customerId: string, customerName: string) => void;
  disabled?: boolean;
}

export function CustomerSelector({
  customers,
  selectedCustomerId,
  customerName,
  onCustomerChange,
  disabled = false,
}: CustomerSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    if (!search) return customers.slice(0, 50);
    
    const searchLower = search.toLowerCase();
    return customers
      .filter(c => 
        c.name.toLowerCase().includes(searchLower) ||
        c.company_name?.toLowerCase().includes(searchLower) ||
        c.customer_code?.toLowerCase().includes(searchLower) ||
        c.phone?.includes(search)
      )
      .slice(0, 50);
  }, [customers, search]);

  // Get display name for selected customer
  const displayName = useMemo(() => {
    if (selectedCustomerId && customers) {
      const customer = customers.find(c => c.id === selectedCustomerId);
      if (customer) return customer.company_name || customer.name;
    }
    return customerName || 'Select customer...';
  }, [selectedCustomerId, customerName, customers]);

  const handleSelectCustomer = (customerId: string) => {
    const customer = customers?.find(c => c.id === customerId);
    if (customer) {
      onCustomerChange(customerId, customer.company_name || customer.name);
    }
    setOpen(false);
    setSearch('');
  };

  const handleNewCustomer = () => {
    if (newCustomerName.trim()) {
      onCustomerChange('', newCustomerName.trim());
      setNewCustomerName('');
      setShowNewCustomer(false);
      setOpen(false);
    }
  };

  if (showNewCustomer) {
    return (
      <div className="flex gap-2">
        <Input
          placeholder="Enter customer name"
          value={newCustomerName}
          onChange={(e) => setNewCustomerName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleNewCustomer()}
          autoFocus
        />
        <Button type="button" size="sm" onClick={handleNewCustomer} disabled={!newCustomerName.trim()}>
          <Check className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setShowNewCustomer(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="flex-1 justify-between"
            disabled={disabled}
          >
            <span className="truncate">{displayName}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Search customers..." 
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                <div className="p-2 text-center text-sm text-muted-foreground">
                  No customers found.
                </div>
              </CommandEmpty>
              <CommandGroup>
                {filteredCustomers.map((customer) => (
                  <CommandItem
                    key={customer.id}
                    value={customer.id}
                    onSelect={() => handleSelectCustomer(customer.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedCustomerId === customer.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{customer.company_name || customer.name}</span>
                      {customer.customer_code && (
                        <span className="text-xs text-muted-foreground">{customer.customer_code}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Button
        type="button"
        size="icon"
        variant="outline"
        onClick={() => setShowNewCustomer(true)}
        title="Add new customer"
        disabled={disabled}
      >
        <UserPlus className="h-4 w-4" />
      </Button>
    </div>
  );
}
