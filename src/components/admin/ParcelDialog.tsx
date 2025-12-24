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
import { Parcel, useCreateParcel, useUpdateParcel } from '@/hooks/useParcels';

const parcelSchema = z.object({
  barcode: z.string().min(1, 'Barcode is required').max(100),
  weight_kg: z.coerce.number().min(0.01, 'Weight must be greater than 0'),
  description: z.string().max(500).optional(),
  dimensions: z.string().max(100).optional(),
});

type ParcelFormValues = z.infer<typeof parcelSchema>;

interface ParcelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipmentId: string;
  parcel?: Parcel | null;
}

export function ParcelDialog({ open, onOpenChange, shipmentId, parcel }: ParcelDialogProps) {
  const createParcel = useCreateParcel();
  const updateParcel = useUpdateParcel();
  const isEditing = !!parcel;

  const form = useForm<ParcelFormValues>({
    resolver: zodResolver(parcelSchema),
    defaultValues: {
      barcode: '',
      weight_kg: 0,
      description: '',
      dimensions: '',
    },
  });

  useEffect(() => {
    if (parcel) {
      form.reset({
        barcode: parcel.barcode,
        weight_kg: Number(parcel.weight_kg),
        description: parcel.description || '',
        dimensions: parcel.dimensions || '',
      });
    } else {
      form.reset({
        barcode: '',
        weight_kg: 0,
        description: '',
        dimensions: '',
      });
    }
  }, [parcel, form]);

  const onSubmit = async (values: ParcelFormValues) => {
    try {
      if (isEditing && parcel) {
        await updateParcel.mutateAsync({
          id: parcel.id,
          barcode: values.barcode,
          weight_kg: values.weight_kg,
          description: values.description || null,
          dimensions: values.dimensions || null,
        });
      } else {
        await createParcel.mutateAsync({
          shipment_id: shipmentId,
          barcode: values.barcode,
          weight_kg: values.weight_kg,
          description: values.description || null,
          dimensions: values.dimensions || null,
        });
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error is handled by mutation
    }
  };

  const isPending = createParcel.isPending || updateParcel.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Parcel' : 'Add Parcel'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="barcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Barcode *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter barcode" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="weight_kg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weight (kg) *</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dimensions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dimensions</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 30x20x15 cm" {...field} />
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Parcel contents or notes" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : isEditing ? 'Update' : 'Add Parcel'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
