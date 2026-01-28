import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Loader2 } from 'lucide-react';
import {
  ExpenseCategory,
  useCreateExpenseCategory,
  useUpdateExpenseCategory,
  useExpenseCategories,
  generateSlug,
} from '@/hooks/useExpenseCategories';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  slug: z.string().min(1, 'Slug is required').max(50, 'Slug is too long')
    .regex(/^[a-z0-9_]+$/, 'Slug can only contain lowercase letters, numbers, and underscores'),
  parent_id: z.string().optional(),
  description: z.string().max(500, 'Description is too long').optional(),
  sort_order: z.coerce.number().int().min(0).max(1000).default(0),
});

type FormValues = z.infer<typeof formSchema>;

interface ExpenseCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: ExpenseCategory | null;
  defaultParentId?: string | null;
}

export function ExpenseCategoryDialog({
  open,
  onOpenChange,
  category,
  defaultParentId,
}: ExpenseCategoryDialogProps) {
  const createCategory = useCreateExpenseCategory();
  const updateCategory = useUpdateExpenseCategory();
  const { data: categories = [] } = useExpenseCategories();
  const isEditing = !!category;

  const [autoSlug, setAutoSlug] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      slug: '',
      parent_id: '',
      description: '',
      sort_order: 0,
    },
  });

  useEffect(() => {
    if (open) {
      if (category) {
        form.reset({
          name: category.name,
          slug: category.slug,
          parent_id: category.parent_id || '',
          description: category.description || '',
          sort_order: category.sort_order,
        });
        setAutoSlug(false);
      } else {
        form.reset({
          name: '',
          slug: '',
          parent_id: defaultParentId || '',
          description: '',
          sort_order: 0,
        });
        setAutoSlug(true);
      }
    }
  }, [category, defaultParentId, open, form]);

  // Auto-generate slug from name when creating
  const watchName = form.watch('name');
  useEffect(() => {
    if (autoSlug && !isEditing) {
      form.setValue('slug', generateSlug(watchName));
    }
  }, [watchName, autoSlug, isEditing, form]);

  const onSubmit = async (data: FormValues) => {
    if (isEditing) {
      updateCategory.mutate(
        {
          id: category.id,
          name: data.name,
          slug: data.slug,
          parent_id: data.parent_id || null,
          description: data.description || null,
          sort_order: data.sort_order,
        },
        {
          onSuccess: () => onOpenChange(false),
        }
      );
    } else {
      createCategory.mutate(
        {
          name: data.name,
          slug: data.slug,
          parent_id: data.parent_id || null,
          description: data.description || null,
          sort_order: data.sort_order,
        },
        {
          onSuccess: () => onOpenChange(false),
        }
      );
    }
  };

  const isPending = createCategory.isPending || updateCategory.isPending;

  // Get only root categories (no parent) for parent selection
  const parentOptions = categories.filter(
    (c) => !c.parent_id && c.id !== category?.id
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Category' : 'Add Category'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the category details below.'
              : 'Create a new expense category. You can optionally make it a subcategory.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Office Supplies" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., office_supplies"
                      {...field}
                      onChange={(e) => {
                        setAutoSlug(false);
                        field.onChange(e);
                      }}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Used to identify the category in expense records
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="parent_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Category (optional)</FormLabel>
                  <Select
                    onValueChange={(value) =>
                      field.onChange(value === 'none' ? '' : value)
                    }
                    value={field.value || 'none'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select parent category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No parent (top-level)</SelectItem>
                      {parentOptions.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of this category..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sort_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sort Order</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={1000}
                      placeholder="0"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Lower numbers appear first
                  </p>
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
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? 'Save Changes' : 'Create Category'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
