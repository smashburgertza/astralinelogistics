

# Add Custom Agent Billing (Invoice TO Agent)

## Problem Identified

In the **B2B Agent** section → **To Agents** tab, you can only create invoices for **unbilled cargo shipments** (clearing charges tied to specific shipments). There's no way to bill agents for **general services** that aren't tied to a shipment.

**Current buttons:**
| Tab | Button | What it does |
|-----|--------|--------------|
| From Agents | "Add Agent Invoice" ✅ | Record an invoice where agent bills Astraline |
| To Agents | "Create Invoice" (on cargo rows) | Bill agent for cargo clearing (tied to shipment) |
| To Agents | **No button for custom services** ❌ | Cannot bill agent for general services |

---

## Solution

Add a **"Bill Agent"** button to the **To Agents** tab that opens a new dialog for creating custom invoices to agents for any service—not tied to a shipment.

---

## Changes Required

### 1. Create New Dialog Component

**File:** `src/components/admin/CreateBillToAgentDialog.tsx`

A new dialog similar to `CreateAgentInvoiceDialog` but:
- Sets `invoice_direction: "to_agent"` (agent owes Astraline)
- No shipment required
- Uses products/services catalog for line items
- Supports custom line items

### 2. Update B2BInvoices Component

**File:** `src/components/admin/B2BInvoices.tsx`

Add a "Bill Agent" button to the To Agents tab header:

**Current UI (To Agents tab):**
```
┌─────────────────────────────────────────────────────────────────────┐
│ Invoices TO Agents: For agent cargo clearing...                     │
├─────────────────────────────────────────────────────────────────────┤
│ Unbilled Agent Cargo (3)                                            │
│ [Table of cargo needing invoices with Create Invoice buttons]       │
├─────────────────────────────────────────────────────────────────────┤
│ Invoices (5)                                                        │
│ [Table of existing to-agent invoices]                               │
└─────────────────────────────────────────────────────────────────────┘
```

**After (To Agents tab):**
```
┌─────────────────────────────────────────────────────────────────────┐
│ Invoices TO Agents: For agent cargo clearing...     [+ Bill Agent]  │  ← New button
├─────────────────────────────────────────────────────────────────────┤
│ Unbilled Agent Cargo (3)                                            │
│ [Table of cargo needing invoices with Create Invoice buttons]       │
├─────────────────────────────────────────────────────────────────────┤
│ Invoices (5)                                                        │
│ [Table of existing to-agent invoices]                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## New Dialog Design

**"Bill Agent" Dialog:**

```
┌───────────────────────────────────────────────────────────────────────┐
│ Bill Agent                                                        [X] │
│ Create an invoice to bill an agent for services provided.             │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ Select Agent *                                                        │
│ [Dropdown: Select an agent...]                                        │
│                                                                       │
│ ┌─────────────────────────────────────────────────────────────────┐   │
│ │ Company: ABC Logistics  │  Contact: John Doe  │  Code: AGT-001  │   │
│ └─────────────────────────────────────────────────────────────────┘   │
│                                                                       │
│ Currency          Due Date                                            │
│ [USD ▼]           [____/____/____]                                    │
│                                                                       │
│ Line Items                                            [+ Add Item]    │
│ ┌──────────────────┬──────────────────┬─────┬─────────┬──────────┐    │
│ │ Service          │ Description      │ Qty │ Price   │ Total    │    │
│ ├──────────────────┼──────────────────┼─────┼─────────┼──────────┤    │
│ │ [Select...   ▼]  │ Consulting fee   │ 2   │ 150.00  │ USD 300  │ 🗑 │
│ │ [Select...   ▼]  │ Training session │ 1   │ 500.00  │ USD 500  │ 🗑 │
│ └──────────────────┴──────────────────┴─────┴─────────┴──────────┘    │
│                                                                       │
│ ─────────────────────────────────────────────────────────────────     │
│ Subtotal                                               USD 800.00     │
│ Total                                                  USD 800.00     │
│ ≈ TZS equivalent                                   TZS 2,000,000      │
│                                                                       │
│ Notes                                                                 │
│ [Additional notes (optional)...]                                      │
│                                                                       │
│                                         [Cancel]  [Create Invoice]    │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Technical Details

### Dialog Component Props
```typescript
interface CreateBillToAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

### Invoice Creation Logic
```typescript
// Key difference from CreateAgentInvoiceDialog:
const { data: invoice } = await supabase
  .from("invoices")
  .insert({
    invoice_number: invoiceNumber,
    invoice_type: "agent_service",
    invoice_direction: "to_agent",  // Agent owes Astraline
    agent_id: data.agent_id,
    shipment_id: null,              // Not tied to a shipment
    customer_id: null,
    amount: calculations.total,
    currency: data.currency,
    // ...
  });
```

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/admin/CreateBillToAgentDialog.tsx` | Create | New dialog for billing agents |
| `src/components/admin/B2BInvoices.tsx` | Modify | Add "Bill Agent" button to To Agents tab |
| `src/components/admin/agents/index.ts` | Modify | Export new component |

---

## User Flow

1. Navigate to **B2B Agent** page (was Settlements)
2. Click **"To Agents"** tab
3. Click **"Bill Agent"** button (new)
4. Select agent from dropdown
5. Add line items (from catalog or custom)
6. Review totals
7. Click **"Create Invoice"**
8. Invoice appears in the To Agents list with status "Pending"
9. When agent pays, mark as paid or record payment

