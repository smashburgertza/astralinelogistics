import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shipment } from '@/hooks/useShipments';
import { useUpdateAgentShipment } from '@/hooks/useAgentShipments';
import { useCustomersList } from '@/hooks/useCustomers';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  customer_id: z.string().min(1, 'Customer is required'),
  total_weight_kg: z.coerce
    .number()
    .min(0.1, 'Weight must be at least 0.1 kg')
    .max(10000, 'Weight cannot exceed 10,000 kg'),
  description: z.string().optional(),
  warehouse_location: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditShipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipment: Shipment | null;
}

export function EditShipmentDialog({
  open,
  onOpenChange,
  shipment,
}: EditShipmentDialogProps) {
  const { data: customers, isLoading: customersLoading } = useCustomersList();
  const updateShipment = useUpdateAgentShipment();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_id: '',
      total_weight_kg: 0,
      description: '',
      warehouse_location: '',
    },
  });

  useEffect(() => {
    if (shipment && open) {
      form.reset({
        customer_id: shipment.customer_id || '',
        total_weight_kg: Number(shipment.total_weight_kg),
        description: shipment.description || '',
        warehouse_location: shipment.warehouse_location || '',
      });
    }
  }, [shipment, open, form]);

  const onSubmit = (data: FormValues) => {
    if (!shipment) return;

    updateShipment.mutate(
      {
        id: shipment.id,
        customer_id: data.customer_id,
        total_weight_kg: data.total_weight_kg,
        description: data.description || null,
        warehouse_location: data.warehouse_location || null,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  // Only allow editing shipments that are still in 'collected' status
  const canEdit = shipment?.status === 'collected';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Shipment</DialogTitle>
        </DialogHeader>

        {!canEdit ? (
          <div className="py-6 text-center">
            <p className="text-muted-foreground">
              Shipments can only be edited while in "Collected" status.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Current status: <span className="font-medium capitalize">{shipment?.status?.replace('_', ' ')}</span>
            </p>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={customersLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers?.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                            {customer.company_name && ` (${customer.company_name})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="total_weight_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (kg)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        placeholder="Enter weight in kg"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter shipment description..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="warehouse_location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warehouse Location (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Shelf A-12"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateShipment.isPending}>
                  {updateShipment.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
