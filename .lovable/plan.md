
# Expense Categories & Subcategories Management

## Overview

Add the ability to create and manage expense categories and subcategories from the Expenses page. This will replace the current hardcoded category list with a dynamic, database-driven system that supports hierarchical categorization.

## Current State

| Aspect | Current Implementation |
|--------|----------------------|
| Categories | Hardcoded array in `useExpenses.ts` (15 static categories) |
| Subcategories | Not supported |
| Storage | `expenses.category` stores a string value |
| Management | None - requires code changes to add categories |

## New Architecture

```text
expense_categories table
├── id (uuid)
├── name (string) - e.g., "Office Supplies"
├── slug (string) - e.g., "office_supplies" (for existing expense records)
├── parent_id (uuid, nullable) - NULL for top-level, FK for subcategories
├── description (string, optional)
├── is_active (boolean) - soft delete support
├── sort_order (integer) - for custom ordering
├── created_at (timestamp)

Example hierarchy:
├── Operational
│   ├── Shipping Cost
│   ├── Handling Fee
│   └── Customs & Duties
├── Office
│   ├── Office Supplies
│   ├── Rent
│   └── Utilities
└── Travel
    ├── Airfare
    └── Accommodation
```

## Implementation Steps

### Step 1: Database Migration

Create the `expense_categories` table with self-referencing foreign key for parent-child relationships.

**SQL Migration:**
```sql
CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster parent lookups
CREATE INDEX idx_expense_categories_parent ON expense_categories(parent_id);

-- RLS policies
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON expense_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admin write" ON expense_categories
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ));
```

**Seed existing categories:**
```sql
INSERT INTO expense_categories (name, slug, sort_order) VALUES
  ('Shipping Cost', 'shipping', 1),
  ('Handling Fee', 'handling', 2),
  ('Customs & Duties', 'customs', 3),
  ('Insurance', 'insurance', 4),
  ('Packaging', 'packaging', 5),
  ('Storage', 'storage', 6),
  ('Fuel Surcharge', 'fuel', 7),
  ('Utilities', 'utilities', 8),
  ('Rent', 'rent', 9),
  ('Salaries & Wages', 'salaries', 10),
  ('Office Supplies', 'office_supplies', 11),
  ('Marketing', 'marketing', 12),
  ('Professional Services', 'professional_services', 13),
  ('Maintenance', 'maintenance', 14),
  ('Travel', 'travel', 15),
  ('Other', 'other', 16);
```

### Step 2: Create useExpenseCategories Hook

**New file:** `src/hooks/useExpenseCategories.ts`

```typescript
// Exports:
// - useExpenseCategories() - fetch all categories with hierarchy
// - useCreateExpenseCategory() - create new category
// - useUpdateExpenseCategory() - update existing
// - useDeleteExpenseCategory() - soft delete (set is_active = false)
```

**Key features:**
- Returns categories organized as tree structure
- Provides flat list for select dropdowns
- Includes helper to format "Parent > Subcategory" labels

### Step 3: Create Category Management Dialog

**New file:** `src/components/admin/ExpenseCategoryDialog.tsx`

A dialog for creating/editing categories with:
- Name input (required)
- Slug input (auto-generated from name, editable)
- Parent category selector (optional - for subcategories)
- Description textarea (optional)
- Sort order input

### Step 4: Create Categories Management Component

**New file:** `src/components/admin/ExpenseCategoriesManager.tsx`

A component displaying:
- Collapsible tree view of categories
- Add Category button
- Edit/Delete actions per category
- Drag-to-reorder (optional, using existing dnd-kit)
- Show subcategory count
- Visual hierarchy with indentation

### Step 5: Add Categories Tab to Expenses Page

**Modify:** `src/pages/admin/Expenses.tsx`

Add a third tab: "Categories"

```typescript
<Tabs defaultValue="queue">
  <TabsList>
    <TabsTrigger value="queue">Approval Queue</TabsTrigger>
    <TabsTrigger value="all">All Expenses</TabsTrigger>
    <TabsTrigger value="categories">Categories</TabsTrigger>  {/* NEW */}
  </TabsList>
  
  <TabsContent value="categories">
    <ExpenseCategoriesManager />
  </TabsContent>
</Tabs>
```

### Step 6: Update Expense Dialog

**Modify:** `src/components/admin/ExpenseDialog.tsx`

Replace hardcoded `EXPENSE_CATEGORIES` with dynamic data:

```typescript
const { data: categories } = useExpenseCategories();

// Group categories for hierarchical display
<SelectContent>
  {categories?.map((cat) => (
    cat.children?.length > 0 ? (
      <SelectGroup key={cat.id}>
        <SelectLabel>{cat.name}</SelectLabel>
        {cat.children.map((sub) => (
          <SelectItem key={sub.id} value={sub.slug}>
            {sub.name}
          </SelectItem>
        ))}
      </SelectGroup>
    ) : (
      <SelectItem key={cat.id} value={cat.slug}>
        {cat.name}
      </SelectItem>
    )
  ))}
</SelectContent>
```

### Step 7: Update Expense Filters

**Modify:** `src/components/admin/ExpenseFilters.tsx`

Replace hardcoded categories with dynamic fetching, showing hierarchical options.

### Step 8: Keep Backward Compatibility

The `expenses.category` field stores **slug values** (e.g., 'shipping', 'customs'). 

- New categories will have auto-generated slugs
- Existing expenses will continue to work as-is
- The category selector uses slug as the value

---

## Files Summary

| Action | File | Description |
|--------|------|-------------|
| **Create** | Database migration | `expense_categories` table + seed data |
| **Create** | `src/hooks/useExpenseCategories.ts` | CRUD hooks for categories |
| **Create** | `src/components/admin/ExpenseCategoryDialog.tsx` | Create/edit category form |
| **Create** | `src/components/admin/ExpenseCategoriesManager.tsx` | Category list with tree view |
| **Modify** | `src/pages/admin/Expenses.tsx` | Add "Categories" tab |
| **Modify** | `src/components/admin/ExpenseDialog.tsx` | Use dynamic categories |
| **Modify** | `src/components/admin/ExpenseFilters.tsx` | Use dynamic categories |
| **Modify** | `src/hooks/useExpenses.ts` | Remove hardcoded EXPENSE_CATEGORIES |

---

## UI Preview

### Categories Tab
```text
┌─────────────────────────────────────────────────────┐
│ [+ Add Category]                                     │
├─────────────────────────────────────────────────────┤
│ ▼ Operational                           [Edit] [⋯]  │
│   ├── Shipping Cost                     [Edit] [⋯]  │
│   ├── Handling Fee                      [Edit] [⋯]  │
│   └── Customs & Duties                  [Edit] [⋯]  │
│ ▼ Office                                [Edit] [⋯]  │
│   ├── Office Supplies                   [Edit] [⋯]  │
│   ├── Rent                              [Edit] [⋯]  │
│   └── Utilities                         [Edit] [⋯]  │
│ ▶ Travel (3 subcategories)              [Edit] [⋯]  │
│   Other                                 [Edit] [⋯]  │
└─────────────────────────────────────────────────────┘
```

### Category Dialog
```text
┌──────────────────────────────────────┐
│ Add Category                     [X] │
├──────────────────────────────────────┤
│ Name *                               │
│ [________________________]           │
│                                      │
│ Parent Category (optional)           │
│ [Select parent... ▼]                 │
│                                      │
│ Description                          │
│ [________________________]           │
│                                      │
│           [Cancel] [Save Category]   │
└──────────────────────────────────────┘
```

---

## Technical Notes

1. **Slug Generation**: Auto-generate slug from name using `name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')`

2. **Category Deletion**: Use soft delete (`is_active = false`) to preserve historical expense records that reference the category

3. **Subcategory Depth**: Limited to 1 level deep (parent → child only) for simplicity

4. **Migration Safety**: Existing expense records continue to work because we're using slug values that match the current hardcoded values
