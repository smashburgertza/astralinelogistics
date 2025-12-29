import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Plus, Loader2, User, Mail, Phone, MapPin, Lock, Package, Building2, UserCircle } from 'lucide-react';
import { useCreateAgent } from '@/hooks/useAgents';
import { useActiveRegions } from '@/hooks/useRegions';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  // Company Information
  companyName: z.string().min(2, 'Company name must be at least 2 characters').max(100),
  companyAddress: z.string().max(255).optional(),
  // Contact Person
  contactPersonName: z.string().min(2, 'Contact person name is required').max(100),
  contactPersonEmail: z.string().email('Please enter a valid email'),
  contactPersonPhone: z.string().max(20).optional(),
  // Login Credentials
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  // Regions & Settings
  regions: z.array(z.string()).min(1, 'Please select at least one region'),
  canHaveConsolidatedCargo: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateAgentDialog() {
  const [open, setOpen] = useState(false);
  const createAgent = useCreateAgent();
  const { data: regions, isLoading: regionsLoading } = useActiveRegions();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: '',
      companyAddress: '',
      contactPersonName: '',
      contactPersonEmail: '',
      contactPersonPhone: '',
      email: '',
      password: '',
      regions: [],
      canHaveConsolidatedCargo: false,
    },
  });

  const onSubmit = async (values: FormValues) => {
    await createAgent.mutateAsync({
      email: values.email,
      password: values.password,
      companyName: values.companyName,
      companyAddress: values.companyAddress,
      contactPersonName: values.contactPersonName,
      contactPersonEmail: values.contactPersonEmail,
      contactPersonPhone: values.contactPersonPhone,
      regions: values.regions,
      canHaveConsolidatedCargo: values.canHaveConsolidatedCargo,
    });
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Agent
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Create New Agent</DialogTitle>
          <DialogDescription>
            Create a new agent account. They will be able to log in and manage shipments for their assigned regions.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            {/* Company Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Building2 className="w-4 h-4" />
                Company Information
              </div>
              
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="ABC Logistics Ltd." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Address (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Business Street, City, Country" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Contact Person Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <UserCircle className="w-4 h-4" />
                Contact Person
              </div>
              
              <FormField
                control={form.control}
                name="contactPersonName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contactPersonEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="contact@company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPersonPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 234 567 8900" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Login Credentials Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Lock className="w-4 h-4" />
                Login Credentials
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Login Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="agent@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Minimum 8 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            <FormField
              control={form.control}
              name="regions"
              render={() => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Assigned Regions
                  </FormLabel>
                  <FormDescription>
                    Select one or more regions the agent can manage.
                  </FormDescription>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {regionsLoading ? (
                      <div className="col-span-2 p-4 text-center text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      </div>
                    ) : (
                      regions?.map((region) => (
                        <FormField
                          key={region.id}
                          control={form.control}
                          name="regions"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-3 space-y-0 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(region.code)}
                                  onCheckedChange={(checked) => {
                                    const newValue = checked
                                      ? [...field.value, region.code]
                                      : field.value.filter((v) => v !== region.code);
                                    field.onChange(newValue);
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer flex items-center gap-2">
                                <span>{region.flag_emoji}</span>
                                <span>{region.name}</span>
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Consolidated Cargo Permission */}
            <FormField
              control={form.control}
              name="canHaveConsolidatedCargo"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Agent's Cargo (Consolidated)
                    </FormLabel>
                    <FormDescription>
                      Allow this agent to log consolidated cargo that is not tracked individually.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createAgent.isPending}>
                {createAgent.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Agent'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
