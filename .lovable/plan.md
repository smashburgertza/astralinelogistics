
# Add Bulk Delete Functionality System-Wide

## Overview

Add bulk selection and deletion capabilities to **all major data tables** across the admin interface, following the existing pattern established in `ShipmentTable.tsx` and `BulkActionsBar.tsx`.

---

## Tables Requiring Bulk Delete

| Module | Table Component | Status | Priority |
|--------|----------------|--------|----------|
| Shipments | `ShipmentTable.tsx` | Has bulk selection, needs delete | High |
| Orders (Shop For Me) | `OrderRequestTable.tsx` | Needs full implementation | High |
| Customers | `CustomerTable.tsx` | Needs full implementation | High |
| Invoices | `InvoiceTable.tsx` | Needs full implementation | High |
| Expenses | `ExpenseTable.tsx` | Has selection props, needs delete action | Medium |
| Employees | `EmployeeTable.tsx` | Needs full implementation | Medium |
| Agents | `AgentTable.tsx` | Needs full implementation | Medium |
| Products/Services | `ProductsServicesTab.tsx` | Needs full implementation | Medium |
| Service Types | `ServiceTypesManager.tsx` | Needs full implementation | Low |

---

## Implementation Architecture

### 1. Create Reusable Bulk Actions Bar Component

Create a generic, reusable bulk actions bar that can be configured per module:

**File:** `src/components/admin/shared/GenericBulkActionsBar.tsx`

```text
+---------------------------------------------------------------------+
| [checkbox] 5 items selected [x]              [Custom Actions] [Delete] |
+---------------------------------------------------------------------+
```

Props:
- `selectedCount`: Number of selected items
- `onClearSelection`: Callback to clear selection
- `onDelete`: Callback for bulk delete (with confirmation)
- `itemLabel`: Singular label (e.g., "customer", "invoice")
- `customActions`: Optional additional action buttons
- `isDeleting`: Loading state for delete operation

### 2. Hook Mutations for Each Module

Add bulk delete mutations to each relevant hook:

| Hook File | New Mutation |
|-----------|--------------|
| `useShipments.ts` | `useBulkDeleteShipments` |
| `useOrderRequests.ts` | `useBulkDeleteOrders` |
| `useCustomers.ts` | `useBulkDeleteCustomers` |
| `useInvoices.ts` | `useBulkDeleteInvoices` |
| `useExpenses.ts` | `useBulkDeleteExpenses` |
| `useEmployees.ts` | `useBulkDeleteEmployees` |
| `useAgents.ts` | `useBulkDeleteAgents` |
| `useProductsServices.ts` | `useBulkDeleteProductServices` |
| `useServiceTypes.ts` | `useBulkDeleteServiceTypes` |

---

## Detailed Changes Per Module

### Module 1: Shipments (Enhance Existing)

**Current State:** Has checkbox selection, bulk status update, and print labels.  
**Enhancement:** Add bulk delete option.

**Files:**
- `src/hooks/useShipments.ts` - Add `useBulkDeleteShipments`
- `src/components/admin/BulkActionsBar.tsx` - Add delete button with confirmation

```typescript
// New mutation in useShipments.ts
export function useBulkDeleteShipments() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ids: string[]) => {
      // Delete related parcels first
      await supabase.from('parcels').delete().in('shipment_id', ids);
      // Delete shipments
      const { error } = await supabase.from('shipments').delete().in('id', ids);
      if (error) throw error;
      return { count: ids.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast.success(`${data.count} shipment(s) deleted`);
    },
  });
}
```

### Module 2: Shop For Me Orders

**Files:**
- `src/hooks/useOrderRequests.ts` - Add `useBulkDeleteOrders`
- `src/components/admin/OrderRequestTable.tsx` - Add checkbox column and selection props
- `src/components/admin/OrderBulkActionsBar.tsx` - New component
- `src/pages/admin/OrderRequests.tsx` - Add selection state

**Cascade delete:** `order_items` -> `order_requests`

### Module 3: Customers

**Files:**
- `src/hooks/useCustomers.ts` - Add `useBulkDeleteCustomers`
- `src/components/admin/CustomerTable.tsx` - Add checkbox column
- `src/pages/admin/Customers.tsx` - Add selection state and bulk bar

**Warning:** Will cascade to shipments, invoices - show confirmation with impact count.

### Module 4: Invoices

**Files:**
- `src/hooks/useInvoices.ts` - Add `useBulkDeleteInvoices`
- `src/components/admin/InvoiceTable.tsx` - Add checkbox column
- `src/components/admin/billing/InvoicesTabContent.tsx` - Add bulk actions bar

**Cascade delete:** `invoice_items`, `invoice_payments` -> `invoices`

### Module 5: Expenses

**Current State:** Already has `showBulkActions` prop and selection logic for approval workflow.

**Enhancement:** Add bulk delete (separate from approval).

**Files:**
- `src/hooks/useExpenses.ts` - Add `useBulkDeleteExpenses`
- `src/components/admin/ExpenseTable.tsx` - Add delete to bulk actions
- `src/pages/admin/Expenses.tsx` - Wire up delete mutation

### Module 6: Employees

**Files:**
- `src/hooks/useEmployees.ts` - Add `useBulkDeleteEmployees`
- `src/components/admin/EmployeeTable.tsx` - Add checkbox column and bulk bar

**Note:** Removes employee role only, does not delete user account.

### Module 7: Agents

**Files:**
- `src/hooks/useAgents.ts` - Add `useBulkDeleteAgents`
- `src/components/admin/AgentTable.tsx` - Add checkbox column
- `src/pages/admin/Agents.tsx` - Add bulk actions bar

**Note:** Removes agent role and region assignments.

### Module 8: Products/Services

**Files:**
- `src/hooks/useProductsServices.ts` - Add `useBulkDeleteProductServices`
- `src/components/admin/accounting/ProductsServicesTab.tsx` - Add checkbox column and bulk bar

### Module 9: Service Types

**Files:**
- `src/hooks/useServiceTypes.ts` - Add `useBulkDeleteServiceTypes`
- `src/components/admin/ServiceTypesManager.tsx` - Add checkbox column and bulk bar

**Warning:** Check usage in `products_services` before delete.

---

## Shared Components to Create

### 1. GenericBulkActionsBar

**File:** `src/components/admin/shared/GenericBulkActionsBar.tsx`

Reusable bar with:
- Selection count display
- Clear selection button
- Delete button with loading state
- Optional custom action slots

### 2. BulkDeleteConfirmDialog

**File:** `src/components/admin/shared/BulkDeleteConfirmDialog.tsx`

Confirmation dialog showing:
- Number of items to delete
- Optional warning about cascading data
- Cancel and Confirm buttons with loading state

---

## UI Pattern

All tables will follow this consistent pattern:

```text
Before selection:
+------------------------------------------------------------------+
| [Filters]                              [Search] [Add New Button] |
+------------------------------------------------------------------+
| Header Row                                                        |
|------------------------------------------------------------------|
| Row 1                                                             |
| Row 2                                                             |
+------------------------------------------------------------------+

After selection (2+ items):
+------------------------------------------------------------------+
| Selected: 3 items [x]                      [Delete Selected]      |  <- Bulk bar
+------------------------------------------------------------------+
| [ ] [Filters]                          [Search] [Add New Button] |
+------------------------------------------------------------------+
| [x] Header Row (with select all checkbox)                         |
|------------------------------------------------------------------|
| [x] Row 1                                                         |
| [ ] Row 2                                                         |
| [x] Row 3                                                         |
+------------------------------------------------------------------+
```

---

## File Summary

### New Files (3)

| File | Description |
|------|-------------|
| `src/components/admin/shared/GenericBulkActionsBar.tsx` | Reusable bulk actions bar |
| `src/components/admin/shared/BulkDeleteConfirmDialog.tsx` | Reusable delete confirmation |
| `src/components/admin/OrderBulkActionsBar.tsx` | Order-specific bulk bar |

### Modified Files (18)

| File | Changes |
|------|---------|
| `src/hooks/useShipments.ts` | Add `useBulkDeleteShipments` |
| `src/hooks/useOrderRequests.ts` | Add `useBulkDeleteOrders` |
| `src/hooks/useCustomers.ts` | Add `useBulkDeleteCustomers` |
| `src/hooks/useInvoices.ts` | Add `useBulkDeleteInvoices` |
| `src/hooks/useExpenses.ts` | Add `useBulkDeleteExpenses` |
| `src/hooks/useEmployees.ts` | Add `useBulkDeleteEmployees` |
| `src/hooks/useAgents.ts` | Add `useBulkDeleteAgents` |
| `src/hooks/useProductsServices.ts` | Add `useBulkDeleteProductServices` |
| `src/hooks/useServiceTypes.ts` | Add `useBulkDeleteServiceTypes` |
| `src/components/admin/BulkActionsBar.tsx` | Add delete button |
| `src/components/admin/OrderRequestTable.tsx` | Add checkbox column |
| `src/components/admin/CustomerTable.tsx` | Add checkbox column |
| `src/components/admin/InvoiceTable.tsx` | Add checkbox column |
| `src/components/admin/EmployeeTable.tsx` | Add checkbox column |
| `src/components/admin/AgentTable.tsx` | Add checkbox column |
| `src/components/admin/accounting/ProductsServicesTab.tsx` | Add checkbox column |
| `src/components/admin/ServiceTypesManager.tsx` | Add checkbox column |
| `src/pages/admin/OrderRequests.tsx` | Add selection state, bulk bar |

---

## Cascade Delete Rules

| Table | Cascade Deletes |
|-------|-----------------|
| `shipments` | `parcels`, `invoices` (unlink only) |
| `order_requests` | `order_items` |
| `customers` | Warning only - blocks if has related data |
| `invoices` | `invoice_items`, `invoice_payments` |
| `expenses` | None (standalone) |
| `employees` | `employee_roles` entry only |
| `agents` | `agent_regions` |
| `products_services` | None (may be referenced) |
| `service_types` | None (may be referenced) |

---

## Implementation Order

1. **Phase 1: Shared Components**
   - Create `GenericBulkActionsBar.tsx`
   - Create `BulkDeleteConfirmDialog.tsx`

2. **Phase 2: High Priority Tables**
   - Shipments (enhance existing)
   - Orders
   - Customers
   - Invoices

3. **Phase 3: Medium Priority Tables**
   - Expenses
   - Employees
   - Agents
   - Products/Services

4. **Phase 4: Low Priority**
   - Service Types

---

## Technical Notes

- All delete mutations will use `.in('id', ids)` for efficient batch operations
- Cascade deletes happen in transaction order (children first)
- RLS policies will enforce permission checks on delete
- Query invalidation ensures UI updates immediately after deletion
- Loading states prevent double-clicks during deletion

