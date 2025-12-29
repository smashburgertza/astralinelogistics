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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Building2, User, UserPlus } from 'lucide-react';
import { useCreateCustomer, useUpdateCustomer, useCreateCustomerWithAuth, Customer } from '@/hooks/useCustomers';

const inchargeSchema = z.object({
  name: z.string().max(100).optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  email: z.string().email('Invalid email').max(255).optional().or(z.literal('')),
});

const customerSchema = z.object({
  customer_type: z.enum(['individual', 'corporate']),
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email').max(255).optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  company_name: z.string().max(200).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
  // Corporate fields
  tin: z.string().max(50).optional().or(z.literal('')),
  vrn: z.string().max(50).optional().or(z.literal('')),
  incharge_1_name: z.string().max(100).optional().or(z.literal('')),
  incharge_1_phone: z.string().max(50).optional().or(z.literal('')),
  incharge_1_email: z.string().email('Invalid email').max(255).optional().or(z.literal('')),
  incharge_2_name: z.string().max(100).optional().or(z.literal('')),
  incharge_2_phone: z.string().max(50).optional().or(z.literal('')),
  incharge_2_email: z.string().email('Invalid email').max(255).optional().or(z.literal('')),
  incharge_3_name: z.string().max(100).optional().or(z.literal('')),
  incharge_3_phone: z.string().max(50).optional().or(z.literal('')),
  incharge_3_email: z.string().email('Invalid email').max(255).optional().or(z.literal('')),
  // Login credentials
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
}).refine((data) => {
  if (data.customer_type === 'corporate') {
    return data.company_name && data.company_name.length > 0;
  }
  return true;
}, {
  message: 'Company name is required for corporate customers',
  path: ['company_name'],
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerDialogProps {
  customer?: Customer;
  trigger?: React.ReactNode;
}

export function CustomerDialog({ customer, trigger }: CustomerDialogProps) {
  const [open, setOpen] = useState(false);
  const [showIncharge2, setShowIncharge2] = useState(false);
  const [showIncharge3, setShowIncharge3] = useState(false);
  const createCustomer = useCreateCustomer();
  const createCustomerWithAuth = useCreateCustomerWithAuth();
  const updateCustomer = useUpdateCustomer();
  const isEditing = !!customer;

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      customer_type: 'individual',
      name: '',
      email: '',
      phone: '',
      company_name: '',
      address: '',
      notes: '',
      tin: '',
      vrn: '',
      incharge_1_name: '',
      incharge_1_phone: '',
      incharge_1_email: '',
      incharge_2_name: '',
      incharge_2_phone: '',
      incharge_2_email: '',
      incharge_3_name: '',
      incharge_3_phone: '',
      incharge_3_email: '',
      createLogin: false,
      password: '',
    },
  });

  const customerType = form.watch('customer_type');
  const createLogin = form.watch('createLogin');

  useEffect(() => {
    if (customer && open) {
      const type = (customer as any).customer_type || 'individual';
      form.reset({
        customer_type: type,
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        company_name: customer.company_name || '',
        address: customer.address || '',
        notes: customer.notes || '',
        tin: (customer as any).tin || '',
        vrn: (customer as any).vrn || '',
        incharge_1_name: (customer as any).incharge_1_name || '',
        incharge_1_phone: (customer as any).incharge_1_phone || '',
        incharge_1_email: (customer as any).incharge_1_email || '',
        incharge_2_name: (customer as any).incharge_2_name || '',
        incharge_2_phone: (customer as any).incharge_2_phone || '',
        incharge_2_email: (customer as any).incharge_2_email || '',
        incharge_3_name: (customer as any).incharge_3_name || '',
        incharge_3_phone: (customer as any).incharge_3_phone || '',
        incharge_3_email: (customer as any).incharge_3_email || '',
        createLogin: false,
        password: '',
      });
      // Show additional incharge fields if they have data
      setShowIncharge2(!!(customer as any).incharge_2_name || !!(customer as any).incharge_2_phone);
      setShowIncharge3(!!(customer as any).incharge_3_name || !!(customer as any).incharge_3_phone);
    } else if (!customer && open) {
      form.reset({
        customer_type: 'individual',
        name: '',
        email: '',
        phone: '',
        company_name: '',
        address: '',
        notes: '',
        tin: '',
        vrn: '',
        incharge_1_name: '',
        incharge_1_phone: '',
        incharge_1_email: '',
        incharge_2_name: '',
        incharge_2_phone: '',
        incharge_2_email: '',
        incharge_3_name: '',
        incharge_3_phone: '',
        incharge_3_email: '',
        createLogin: false,
        password: '',
      });
      setShowIncharge2(false);
      setShowIncharge3(false);
    }
  }, [customer, open, form]);

  const onSubmit = async (data: CustomerFormData) => {
    const customerData: any = {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      company_name: data.company_name || null,
      address: data.address || null,
      notes: data.notes || null,
      customer_type: data.customer_type,
    };

    // Add corporate fields if corporate type
    if (data.customer_type === 'corporate') {
      customerData.tin = data.tin || null;
      customerData.vrn = data.vrn || null;
      customerData.incharge_1_name = data.incharge_1_name || null;
      customerData.incharge_1_phone = data.incharge_1_phone || null;
      customerData.incharge_1_email = data.incharge_1_email || null;
      customerData.incharge_2_name = data.incharge_2_name || null;
      customerData.incharge_2_phone = data.incharge_2_phone || null;
      customerData.incharge_2_email = data.incharge_2_email || null;
      customerData.incharge_3_name = data.incharge_3_name || null;
      customerData.incharge_3_phone = data.incharge_3_phone || null;
      customerData.incharge_3_email = data.incharge_3_email || null;
    }

    if (isEditing) {
      await updateCustomer.mutateAsync({
        id: customer.id,
        ...customerData,
      });
    } else if (data.createLogin && data.email && data.password) {
      await createCustomerWithAuth.mutateAsync({
        ...customerData,
        email: data.email,
        password: data.password,
      });
    } else {
      await createCustomer.mutateAsync(customerData);
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Customer Type Selection */}
            <FormField
              control={form.control}
              name="customer_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Type</FormLabel>
                  <FormControl>
                    <Tabs value={field.value} onValueChange={field.onChange} className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="individual" className="gap-2">
                          <User className="h-4 w-4" />
                          Individual
                        </TabsTrigger>
                        <TabsTrigger value="corporate" className="gap-2">
                          <Building2 className="h-4 w-4" />
                          Corporate
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Basic Info */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{customerType === 'corporate' ? 'Contact Person Name *' : 'Name *'}</FormLabel>
                  <FormControl>
                    <Input placeholder={customerType === 'corporate' ? 'Primary contact name' : 'Customer name'} {...field} />
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
                      <Input placeholder="+255 xxx xxx xxx" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Corporate Fields */}
            {customerType === 'corporate' && (
              <>
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Company Details
                  </h3>
                  
                  <FormField
                    control={form.control}
                    name="company_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Company Ltd." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <FormField
                      control={form.control}
                      name="tin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>TIN (Tax ID Number)</FormLabel>
                          <FormControl>
                            <Input placeholder="Tax Identification Number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vrn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>VRN (VAT Registration)</FormLabel>
                          <FormControl>
                            <Input placeholder="VAT Registration Number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Incharge Persons */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Incharge Persons
                  </h3>
                  
                  {/* Incharge 1 */}
                  <div className="p-3 bg-muted/50 rounded-lg space-y-3">
                    <p className="text-xs font-medium text-muted-foreground">Incharge Person 1</p>
                    <div className="grid grid-cols-3 gap-3">
                      <FormField
                        control={form.control}
                        name="incharge_1_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="incharge_1_phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="Phone" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="incharge_1_email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Incharge 2 */}
                  {showIncharge2 ? (
                    <div className="p-3 bg-muted/50 rounded-lg space-y-3 mt-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">Incharge Person 2</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-muted-foreground"
                          onClick={() => {
                            setShowIncharge2(false);
                            form.setValue('incharge_2_name', '');
                            form.setValue('incharge_2_phone', '');
                            form.setValue('incharge_2_email', '');
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <FormField
                          control={form.control}
                          name="incharge_2_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="incharge_2_phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Phone</FormLabel>
                              <FormControl>
                                <Input placeholder="Phone" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="incharge_2_email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="Email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2 gap-1"
                      onClick={() => setShowIncharge2(true)}
                    >
                      <Plus className="h-3 w-3" />
                      Add Incharge Person 2
                    </Button>
                  )}

                  {/* Incharge 3 */}
                  {showIncharge2 && (
                    <>
                      {showIncharge3 ? (
                        <div className="p-3 bg-muted/50 rounded-lg space-y-3 mt-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-muted-foreground">Incharge Person 3</p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs text-muted-foreground"
                              onClick={() => {
                                setShowIncharge3(false);
                                form.setValue('incharge_3_name', '');
                                form.setValue('incharge_3_phone', '');
                                form.setValue('incharge_3_email', '');
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <FormField
                              control={form.control}
                              name="incharge_3_name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Name" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="incharge_3_phone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Phone</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Phone" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="incharge_3_email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Email</FormLabel>
                                  <FormControl>
                                    <Input type="email" placeholder="Email" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2 gap-1"
                          onClick={() => setShowIncharge3(true)}
                        >
                          <Plus className="h-3 w-3" />
                          Add Incharge Person 3
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </>
            )}

            {/* Individual fields - company name optional */}
            {customerType === 'individual' && (
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Company Ltd." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
                          Allow customer to access the portal using email or Customer ID
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