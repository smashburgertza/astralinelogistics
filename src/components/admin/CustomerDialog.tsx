import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Plus } from 'lucide-react';
import { useCreateCustomer, useUpdateCustomer, useCreateCustomerWithAuth, Customer } from '@/hooks/useCustomers';

const customerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email').max(255).optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  company_name: z.string().max(200).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
  createLogin: z.boolean(),
  password: z.string().optional(),
}).refine((data) => {
  if (data.createLogin) {
    return data.email && data.email.length > 0 && data.password && data.password.length >= 6;
  }
  return true;
}, {
  message: 'Email and password (min 6 chars) required for login credentials',
  path: ['password'],
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerDialogProps {
  customer?: Customer;
  trigger?: React.ReactNode;
}

export function CustomerDialog({ customer, trigger }: CustomerDialogProps) {
  const [open, setOpen] = useState(false);
  const createCustomer = useCreateCustomer();
  const createCustomerWithAuth = useCreateCustomerWithAuth();
  const updateCustomer = useUpdateCustomer();
  const isEditing = !!customer;

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      company_name: '',
      address: '',
      notes: '',
      createLogin: false,
      password: '',
    },
  });

  const createLogin = form.watch('createLogin');

  useEffect(() => {
    if (customer && open) {
      form.reset({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        company_name: customer.company_name || '',
        address: customer.address || '',
        notes: customer.notes || '',
        createLogin: false,
        password: '',
      });
    } else if (!customer && open) {
      form.reset({
        name: '',
        email: '',
        phone: '',
        company_name: '',
        address: '',
        notes: '',
        createLogin: false,
        password: '',
      });
    }
  }, [customer, open, form]);

  const onSubmit = async (data: CustomerFormData) => {
    if (isEditing) {
      await updateCustomer.mutateAsync({
        id: customer.id,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        company_name: data.company_name || null,
        address: data.address || null,
        notes: data.notes || null,
      });
    } else if (data.createLogin && data.email && data.password) {
      await createCustomerWithAuth.mutateAsync({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone || null,
        company_name: data.company_name || null,
        address: data.address || null,
        notes: data.notes || null,
      });
    } else {
      await createCustomer.mutateAsync({
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        company_name: data.company_name || null,
        address: data.address || null,
        notes: data.notes || null,
      });
    }

    form.reset();
    setOpen(false);
  };

  const isPending = createCustomer.isPending || updateCustomer.isPending || createCustomerWithAuth.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Customer name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email {createLogin && '*'}</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 234 567 890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="company_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Company Ltd." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Full address..." rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes..." rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing && (
              <>
                <FormField
                  control={form.control}
                  name="createLogin"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Create Login Credentials</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Allow customer to access the portal
                        </p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {createLogin && (
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password *</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Min 6 characters" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Customer'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
