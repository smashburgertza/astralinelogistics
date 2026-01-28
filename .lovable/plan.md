
# Improve Service Types Management

## Issues Identified

| Issue | Location | Root Cause |
|-------|----------|------------|
| Delete not working | `ServiceTypesManager.tsx` line 357-360 | `AlertDialogAction onClick` may not properly handle async operations; dialog closes immediately |
| Missing loading state | Delete confirmation | No visual feedback during delete operation |
| Cache may be stale | After delete | Query invalidation may need explicit refetching |

## What We'll Fix

### 1. Better Delete Error Handling

The current delete flow:
```typescript
// Current (problematic)
<AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>

// confirmDelete is async but onClick doesn't wait
const confirmDelete = async () => {
  if (typeToDelete) {
    await deleteType.mutateAsync(typeToDelete.id);  // May fail silently
    setDeleteConfirmOpen(false);
    setTypeToDelete(null);
  }
};
```

**Fix**: Add try/catch, loading state, and prevent dialog auto-close:
```typescript
const confirmDelete = async () => {
  if (!typeToDelete) return;
  
  try {
    await deleteType.mutateAsync(typeToDelete.id);
    // Only close on success
    setDeleteConfirmOpen(false);
    setTypeToDelete(null);
  } catch (error) {
    // Error toast is already shown by the mutation
    // Keep dialog open so user sees something went wrong
  }
};
```

### 2. Add Loading States to All Actions

| Action | Current State | Enhancement |
|--------|---------------|-------------|
| Create | No loading indicator | Add `isPending` check to disable button |
| Update | No loading indicator | Add `isPending` check to disable button |
| Delete | No loading indicator | Add `isPending` check, show spinner |
| Toggle Active | No loading indicator | Disable switch during update |

### 3. Force Query Refetch After Mutations

Ensure fresh data after any mutation:
```typescript
// In useDeleteServiceType
onSuccess: () => {
  // Force immediate refetch, not just invalidation
  queryClient.invalidateQueries({ queryKey: ['service-types'] });
  queryClient.refetchQueries({ queryKey: ['service-types'] });
  toast.success('Service type deleted');
},
```

### 4. Add Usage Check Before Delete

Before deleting, check if any products/services use this type:
```typescript
const handleDelete = async (type: ProductServiceType) => {
  // Check if type is in use
  const { count } = await supabase
    .from('products_services')
    .select('*', { count: 'exact', head: true })
    .eq('service_type', type.slug);
  
  if (count && count > 0) {
    setUsageCount(count);  // Show warning
  }
  setTypeToDelete(type);
  setDeleteConfirmOpen(true);
};
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useServiceTypes.ts` | Add `refetchQueries`, improve error messages |
| `src/components/admin/ServiceTypesManager.tsx` | Add loading states, usage check, fix async delete handling |

## UI Improvements

### Delete Confirmation Dialog (After)
```
┌────────────────────────────────────────────────────┐
│ Delete Service Type                            [X] │
├────────────────────────────────────────────────────┤
│ Are you sure you want to delete "Transit"?         │
│                                                    │
│ ⚠️ 3 products/services are using this type.        │
│ They will show as "Unknown Type" after deletion.  │
│                                                    │
│                     [Cancel]  [🔄 Deleting...]    │
│                              or                    │
│                     [Cancel]  [Delete]             │
└────────────────────────────────────────────────────┘
```

### Table Row Actions (After)
```
┌────┬────────────┬──────────┬─────────┬────────┬──────────────┐
│ #  │ Name       │ Slug     │ Preview │ Active │ Actions      │
├────┼────────────┼──────────┼─────────┼────────┼──────────────┤
│ 6  │ Transit    │ transit  │ [Badge] │ [⌛]   │ [✏️] [🗑️]   │
└────┴────────────┴──────────┴─────────┴────────┴──────────────┘
                               ↑ Spinner while toggling
```

## Implementation Summary

1. **Hook changes** (`useServiceTypes.ts`):
   - Add `refetchQueries` after mutations for guaranteed fresh data
   - Return mutation status (`isPending`) for loading states

2. **Component changes** (`ServiceTypesManager.tsx`):
   - Add try/catch around delete confirmation
   - Add loading state to delete button (spinner + disabled)
   - Add loading state to create/update button
   - Disable toggle switch during update
   - Add usage count warning before delete
   - Prevent dialog close during pending operations
