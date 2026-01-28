import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ExpenseCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  children?: ExpenseCategory[];
}

export interface ExpenseCategoryInput {
  name: string;
  slug?: string;
  parent_id?: string | null;
  description?: string | null;
  sort_order?: number;
}

// Generate slug from name
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .substring(0, 50);
}

// Fetch all active categories with hierarchy
export function useExpenseCategories() {
  return useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // Organize into tree structure
      const categories = data as ExpenseCategory[];
      const rootCategories: ExpenseCategory[] = [];
      const childMap = new Map<string, ExpenseCategory[]>();

      categories.forEach((cat) => {
        if (cat.parent_id) {
          const children = childMap.get(cat.parent_id) || [];
          children.push(cat);
          childMap.set(cat.parent_id, children);
        } else {
          rootCategories.push(cat);
        }
      });

      // Attach children to parents
      rootCategories.forEach((cat) => {
        cat.children = childMap.get(cat.id) || [];
      });

      return rootCategories;
    },
  });
}

// Fetch all categories (including inactive) for management
export function useAllExpenseCategories() {
  return useQuery({
    queryKey: ['expense-categories', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // Organize into tree structure
      const categories = data as ExpenseCategory[];
      const rootCategories: ExpenseCategory[] = [];
      const childMap = new Map<string, ExpenseCategory[]>();

      categories.forEach((cat) => {
        if (cat.parent_id) {
          const children = childMap.get(cat.parent_id) || [];
          children.push(cat);
          childMap.set(cat.parent_id, children);
        } else {
          rootCategories.push(cat);
        }
      });

      // Attach children to parents
      rootCategories.forEach((cat) => {
        cat.children = childMap.get(cat.id) || [];
      });

      return rootCategories;
    },
  });
}

// Flat list for select dropdowns with hierarchical labels
export function useFlatExpenseCategories() {
  return useQuery({
    queryKey: ['expense-categories', 'flat'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      const categories = data as ExpenseCategory[];
      const parentMap = new Map<string, ExpenseCategory>();
      
      categories.forEach((cat) => {
        if (!cat.parent_id) {
          parentMap.set(cat.id, cat);
        }
      });

      // Create flat list with formatted labels
      return categories.map((cat) => {
        const parent = cat.parent_id ? parentMap.get(cat.parent_id) : null;
        return {
          ...cat,
          displayLabel: parent ? `${parent.name} > ${cat.name}` : cat.name,
          isChild: !!cat.parent_id,
        };
      });
    },
  });
}

// Create a new category
export function useCreateExpenseCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ExpenseCategoryInput) => {
      const slug = input.slug || generateSlug(input.name);
      
      const { data, error } = await supabase
        .from('expense_categories')
        .insert({
          name: input.name,
          slug,
          parent_id: input.parent_id || null,
          description: input.description || null,
          sort_order: input.sort_order || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast.success('Category created successfully');
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate key')) {
        toast.error('A category with this slug already exists');
      } else {
        toast.error('Failed to create category: ' + error.message);
      }
    },
  });
}

// Update an existing category
export function useUpdateExpenseCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ExpenseCategory> & { id: string }) => {
      const { data, error } = await supabase
        .from('expense_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast.success('Category updated successfully');
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate key')) {
        toast.error('A category with this slug already exists');
      } else {
        toast.error('Failed to update category: ' + error.message);
      }
    },
  });
}

// Soft delete a category (set is_active = false)
export function useDeleteExpenseCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First, unlink any children
      await supabase
        .from('expense_categories')
        .update({ parent_id: null })
        .eq('parent_id', id);

      // Soft delete
      const { error } = await supabase
        .from('expense_categories')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast.success('Category deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete category: ' + error.message);
    },
  });
}
