
# Add Agent Invoice Creation (From Agent)

## Overview

Add the ability to manually create invoices where **agents bill Astraline** for services, commissions, handling fees, or reimbursements. This creates records with `invoice_direction = 'from_agent'` in the "From Agents" tab.

## Current State

| Feature | Status |
|---------|--------|
| "To Agents" tab | Has "Invoice Agent Cargo" button - works with shipments |
| "From Agents" tab | **No creation button** - displays existing invoices only |
| Invoice types | System supports `from_agent` direction but no manual creation flow |

## What We'll Build

A new dialog called `CreateAgentInvoiceDialog` that allows admins to:
1. Select an agent from a dropdown
2. Add line items (services, commissions, reimbursements, etc.)
3. Set currency, due date, and notes
4. Create an invoice that appears in the "From Agents" tab

## Files to Create/Modify

| Action | File | Description |
|--------|------|-------------|
| **Create** | `src/components/admin/CreateAgentInvoiceDialog.tsx` | New dialog for creating "from_agent" invoices |
| **Modify** | `src/components/admin/B2BInvoices.tsx` | Add "Add Agent Invoice" button to "From Agents" tab |
| **Modify** | `src/lib/journalEntryUtils.ts` | Add journal entry function for agent expenses (if needed) |

## Implementation Steps

### Step 1: Create the Dialog Component

**New file: `src/components/admin/CreateAgentInvoiceDialog.tsx`**

The dialog will include:

1. **Agent Selector** - Dropdown populated from `useAgents()` hook
2. **Invoice Details**
   - Currency selector (USD, TZS, GBP, EUR, CNY, AED)
   - Due date picker
3. **Line Items** (dynamic list)
   - Description (text input)
   - Quantity (number)
   - Unit price (number)
   - Amount (calculated)
   - Optional: Product/service catalog integration
4. **Totals Display**
   - Subtotal
   - Total with TZS conversion preview
5. **Notes** - Optional textarea

**Form Schema:**
```typescript
const formSchema = z.object({
  agent_id: z.string().min(1, "Agent is required"),
  currency: z.string().default("USD"),
  due_date: z.string().optional(),
  notes: z.string().optional(),
  line_items: z.array(z.object({
    description: z.string().min(1, "Description is required"),
    quantity: z.number().min(0.01),
    unit_price: z.number().min(0),
  })).min(1, "At least one line item is required"),
});
```

**Database Insert:**
```typescript
const { data: invoice } = await supabase
  .from("invoices")
  .insert({
    invoice_number: generatedNumber,
    invoice_type: "agent_service",
    invoice_direction: "from_agent",  // Agent bills us
    agent_id: data.agent_id,
    shipment_id: null,  // Not tied to a shipment
    customer_id: null,
    amount: totalAmount,
    currency: data.currency,
    amount_in_tzs: tzsAmount,
    due_date: data.due_date || null,
    notes: data.notes || null,
    status: "pending",
  })
  .select()
  .single();
```

### Step 2: Add Button to B2BInvoices

**Modify: `src/components/admin/B2BInvoices.tsx`**

Add an "Add Agent Invoice" button in the "From Agents" tab header:

```typescript
// State for the new dialog
const [createFromAgentDialogOpen, setCreateFromAgentDialogOpen] = useState(false);

// In the From Agents tab content
<div className="flex items-center justify-between mb-4">
  <p className="text-sm text-muted-foreground">
    Invoices from agents billing Astraline
  </p>
  <Button onClick={() => setCreateFromAgentDialogOpen(true)}>
    <Plus className="h-4 w-4 mr-2" />
    Add Agent Invoice
  </Button>
</div>

// Dialog component at the bottom
<CreateAgentInvoiceDialog
  open={createFromAgentDialogOpen}
  onOpenChange={setCreateFromAgentDialogOpen}
/>
```

### Step 3: Journal Entry Support (Optional)

Add a function to create appropriate journal entries when an agent bills Astraline:

**Modify: `src/lib/journalEntryUtils.ts`**

```typescript
export async function createAgentExpenseJournalEntry({
  invoiceId,
  invoiceNumber,
  amount,
  currency,
  agentName,
}: {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  agentName?: string;
}) {
  // Debit: Agent Expenses (expense account)
  // Credit: Agent Payables (liability account)
}
```

## UI Preview

### From Agents Tab (After)
```
┌─────────────────────────────────────────────────────────────────┐
│ From Agents (1)   |   To Agents (1)                             │
├─────────────────────────────────────────────────────────────────┤
│ Invoices from agents billing Astraline     [+ Add Agent Invoice]│
├─────────────────────────────────────────────────────────────────┤
│ Invoice #  │ Agent       │ Shipment │ Amount   │ Date  │ Status │
│ INV-2025-18│ UK Express  │ -        │ GBP 125  │ Jan 27│ Paid   │
└─────────────────────────────────────────────────────────────────┘
```

### Add Agent Invoice Dialog
```
┌────────────────────────────────────────────────────────┐
│ Add Agent Invoice                                  [X] │
├────────────────────────────────────────────────────────┤
│ Select Agent *                                         │
│ [UK Express Logistics (AGT-001) ▼]                     │
│                                                        │
│ Currency              Due Date                         │
│ [USD ▼]               [_____/_____/_____]              │
├────────────────────────────────────────────────────────┤
│ Line Items                           [+ Add Item]      │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Commission - January 2025      │ 1 │ $500.00  │ X  │ │
│ │ Warehouse handling reimbursement│ 1 │ $75.00   │ X  │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│                                    Subtotal: $575.00   │
│                                    Total: $575.00      │
│                                    ≈ TZS 1,437,500     │
│                                                        │
│ Notes                                                  │
│ [_______________________________________________]      │
│                                                        │
│                     [Cancel]  [Create Invoice]         │
└────────────────────────────────────────────────────────┘
```

## Technical Notes

1. **Invoice Direction**: The key field is `invoice_direction = 'from_agent'` which means the agent is billing Astraline (we owe them money)

2. **No Shipment Link**: Unlike "To Agent" invoices that are typically tied to shipments, "From Agent" invoices can be standalone for commissions, reimbursements, etc.

3. **Reusing Existing Patterns**: The dialog follows the same structure as `CreateAgentCargoInvoiceDialog` but:
   - Adds an agent selector (not pre-selected from shipment)
   - Sets `invoice_direction = 'from_agent'`
   - No shipment reference required

4. **Agent Selector**: Will show company name + agent code like: "UK Express Logistics (AGT-001)"

5. **Payment Flow**: Once created, the invoice appears in "From Agents" tab. Admin can use existing "Record Payment" action to pay the agent.

## Summary

| What | Details |
|------|---------|
| New Button | "Add Agent Invoice" in From Agents tab header |
| New Dialog | Form with agent selector + line items |
| Invoice Direction | `from_agent` (agent bills us) |
| Use Cases | Commissions, reimbursements, service fees, handling charges |
