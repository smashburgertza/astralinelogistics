import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Pencil,
  Trash2,
  FolderPlus,
  Tag,
} from 'lucide-react';
import {
  ExpenseCategory,
  useAllExpenseCategories,
  useDeleteExpenseCategory,
} from '@/hooks/useExpenseCategories';
import { ExpenseCategoryDialog } from './ExpenseCategoryDialog';

function CategoryItem({
  category,
  onEdit,
  onDelete,
  onAddSubcategory,
}: {
  category: ExpenseCategory;
  onEdit: (cat: ExpenseCategory) => void;
  onDelete: (cat: ExpenseCategory) => void;
  onAddSubcategory: (parentId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = category.children && category.children.length > 0;
  const isInactive = !category.is_active;

  return (
    <div className={isInactive ? 'opacity-50' : ''}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-muted/50 group">
          {hasChildren ? (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          ) : (
            <div className="w-6" />
          )}

          <Tag className="h-4 w-4 text-muted-foreground" />

          <span className="flex-1 font-medium">{category.name}</span>

          {hasChildren && (
            <Badge variant="secondary" className="text-xs">
              {category.children!.length} sub
            </Badge>
          )}

          {isInactive && (
            <Badge variant="outline" className="text-xs">
              Inactive
            </Badge>
          )}

          <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {category.slug}
          </code>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(category)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {!category.parent_id && (
                <DropdownMenuItem
                  onClick={() => onAddSubcategory(category.id)}
                >
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Add Subcategory
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => onDelete(category)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {hasChildren && (
          <CollapsibleContent>
            <div className="ml-8 pl-4 border-l">
              {category.children!.map((child) => (
                <CategoryItem
                  key={child.id}
                  category={child}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onAddSubcategory={onAddSubcategory}
                />
              ))}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}

export function ExpenseCategoriesManager() {
  const { data: categories, isLoading } = useAllExpenseCategories();
  const deleteCategory = useDeleteExpenseCategory();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<ExpenseCategory | null>(null);

  const handleAddCategory = () => {
    setEditingCategory(null);
    setDefaultParentId(null);
    setDialogOpen(true);
  };

  const handleAddSubcategory = (parentId: string) => {
    setEditingCategory(null);
    setDefaultParentId(parentId);
    setDialogOpen(true);
  };

  const handleEdit = (category: ExpenseCategory) => {
    setEditingCategory(category);
    setDefaultParentId(null);
    setDialogOpen(true);
  };

  const handleDelete = (category: ExpenseCategory) => {
    setCategoryToDelete(category);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (categoryToDelete) {
      deleteCategory.mutate(categoryToDelete.id, {
        onSuccess: () => {
          setDeleteConfirmOpen(false);
          setCategoryToDelete(null);
        },
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expense Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Expense Categories</CardTitle>
            <CardDescription>
              Manage categories and subcategories for expense tracking
            </CardDescription>
          </div>
          <Button onClick={handleAddCategory}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </CardHeader>
        <CardContent>
          {!categories || categories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No categories found</p>
              <p className="text-sm">Create your first expense category to get started</p>
            </div>
          ) : (
            <div className="space-y-1">
              {categories.map((category) => (
                <CategoryItem
                  key={category.id}
                  category={category}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onAddSubcategory={handleAddSubcategory}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ExpenseCategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editingCategory}
        defaultParentId={defaultParentId}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{categoryToDelete?.name}"?
              {categoryToDelete?.children && categoryToDelete.children.length > 0 && (
                <span className="block mt-2 text-amber-600">
                  This category has {categoryToDelete.children.length} subcategories
                  that will be converted to top-level categories.
                </span>
              )}
              <span className="block mt-2">
                Existing expenses using this category will not be affected.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
