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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Loader2, User, Mail, Phone, MapPin, Lock } from 'lucide-react';
import { useCreateAgent } from '@/hooks/useAgents';
import { useActiveRegions } from '@/hooks/useRegions';

const formSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().max(20).optional(),
  region: z.string().min(1, 'Please select a region'),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateAgentDialog() {
  const [open, setOpen] = useState(false);
  const createAgent = useCreateAgent();
  const { data: regions, isLoading: regionsLoading } = useActiveRegions();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      fullName: '',
      phone: '',
      region: undefined,
    },
  });

  const onSubmit = async (values: FormValues) => {
    // Find the region code from the region id
    const selectedRegion = regions?.find(r => r.id === values.region);
    await createAgent.mutateAsync({
      email: values.email,
      password: values.password,
      fullName: values.fullName,
      phone: values.phone,
      region: selectedRegion?.code as any, // The hook expects the region code
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-heading">Create New Agent</DialogTitle>
          <DialogDescription>
            Create a new agent account. They will be able to log in and manage shipments for their assigned region.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Full Name
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </FormLabel>
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
                  <FormLabel className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Password
                  </FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormDescription>
                    Minimum 8 characters. The agent will use this to log in.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone (Optional)
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="+1 234 567 8900" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Assigned Region
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a region" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {regionsLoading ? (
                        <div className="p-2 text-center text-muted-foreground">Loading...</div>
                      ) : (
                        regions?.map((region) => (
                          <SelectItem key={region.id} value={region.id}>
                            <span className="flex items-center gap-2">
                              <span>{region.flag_emoji}</span>
                              <span>{region.name}</span>
                            </span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The agent will only be able to manage shipments from this region.
                  </FormDescription>
                  <FormMessage />
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
