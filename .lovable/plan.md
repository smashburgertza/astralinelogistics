

# Consolidate Agent Portal into Admin Portal

## Current Understanding

### Your Actual Workflow
1. **Agents communicate via WhatsApp** - they send parcel information and bills to your team
2. **Astraline staff enter all data** - shipments, customer info, tracking updates
3. **Agents send their invoices/bills via WhatsApp** - staff upload these to track payables
4. **System tracks what you owe agents** - for settlement and payment reconciliation

### What Currently Exists
- **Agent Portal** (`/agent/*`): 6 pages for agents to self-serve
  - Dashboard, Upload Shipments, View Shipments, Invoices, Settlements, Settings
- **Admin B2B Agent section** (`/admin/settlements`): Already handles agent invoices and payments
- The agent portal duplicates functionality that admins can already do

---

## Proposed Architecture

### What Gets Removed
| Component | Path | Reason |
|-----------|------|--------|
| Agent Dashboard | `/agent` | Not used - agents use WhatsApp |
| Agent Upload | `/agent/upload` | Admins create shipments instead |
| Agent Shipments | `/agent/shipments` | Admins manage all shipments |
| Agent Invoices | `/agent/invoices` | Admins handle via B2B section |
| Agent Settlements | `/agent/settlements` | Admins manage settlements |
| Agent Settings | `/agent/settings` | Not needed |
| AgentLayout component | Layout file | No longer needed |
| Agent hooks | Various | Keep core logic, remove auth-scoped versions |

### What Gets Enhanced in Admin Portal

#### 1. Agent Bill Upload Feature (New)
Add ability to upload agent bills/invoices received via WhatsApp:
- Upload PDF/image of agent's bill
- Enter bill details (amount, currency, region, date)
- Link to shipments (optional)
- Auto-create "from_agent" invoice for payables tracking

#### 2. Enhanced Shipment Creation
Already exists but ensure it supports:
- Selecting which agent the shipment came from
- Tracking agent's cargo vs customer cargo
- Weight and rate tracking per agent

#### 3. Agent Payables Dashboard
Already partially exists in `/admin/settlements` - enhance with:
- Clear view of what's owed to each agent
- Bill upload history
- Payment recording with proof upload

---

## Technical Changes

### Files to Delete (13 files)
```
src/pages/agent/Dashboard.tsx
src/pages/agent/Upload.tsx
src/pages/agent/Shipments.tsx
src/pages/agent/Invoices.tsx
src/pages/agent/Settlements.tsx
src/pages/agent/Settings.tsx
src/components/layout/AgentLayout.tsx
src/components/agent/BatchGroupedShipmentTable.tsx (duplicate of admin version)
src/components/agent/CustomerSelector.tsx
src/components/agent/EditShipmentDialog.tsx
src/components/agent/MarkPaymentDialog.tsx
src/components/agent/ShipmentFilters.tsx
src/components/agent/ShipmentTable.tsx
```

### Files to Keep (Shared utilities)
```
src/components/agent/InvoicePDF.tsx - Used for printing
src/components/agent/ParcelLabel.tsx - Used for label printing
src/components/agent/PrintableLabels.tsx - Used for printing
src/components/agent/ShipmentUploadForm.tsx - Repurpose for admin use
```

### Route Changes (App.tsx)
Remove all `/agent/*` routes:
```typescript
// DELETE these routes:
<Route path="/agent" ... />
<Route path="/agent/upload" ... />
<Route path="/agent/shipments" ... />
<Route path="/agent/invoices" ... />
<Route path="/agent/settlements" ... />
<Route path="/agent/settings" ... />
```

### Authentication Changes (SystemAuth.tsx)
Remove agent login flow - agents no longer access the system:
```typescript
// Remove 'agent' role handling from login redirect logic
// All system logins go to /admin
```

### New Feature: Agent Bill Upload

Add to `/admin/settlements` page:

**UploadAgentBillDialog component:**
```typescript
interface AgentBill {
  agent_id: string;
  amount: number;
  currency: string;
  bill_date: string;
  bill_reference: string;
  notes?: string;
  attachment_url?: string; // Uploaded bill image/PDF
}
```

This creates a `from_agent` invoice representing what Astraline owes the agent.

### Hook Changes

| Hook | Action |
|------|--------|
| `useAgentShipments.ts` | Delete (admin hooks cover this) |
| `useAgentBalance.ts` | Keep - used by admin for agent balance tracking |
| `useAgentInvoices.ts` | Keep `usePaymentsPendingVerification` and `useVerifyPayment`, remove agent-scoped functions |
| `useAgentSettings.ts` | Keep - used for agent configuration |
| `useSettlements.ts` | Keep - already admin-focused |

---

## Summary of Benefits

1. **Simpler System**: One portal for internal staff, one for customers
2. **Matches Reality**: Your actual workflow is WhatsApp-based for agents
3. **Less Maintenance**: No duplicate components to maintain
4. **Clearer Data Flow**: All data entry happens in admin portal
5. **Better Audit Trail**: Staff enter everything, full accountability

## What You Still Need

1. **Agent records in database**: Keep agent profiles for assignment and billing
2. **Agent bill upload**: New feature to record incoming agent invoices
3. **Agent payables tracking**: Already exists in B2B section

---

## Implementation Steps

### Step 1: Add Agent Bill Upload Feature
Create dialog for uploading agent bills with file attachment support

### Step 2: Remove Agent Portal Routes
Update App.tsx to remove `/agent/*` routes

### Step 3: Update System Auth
Redirect any agent logins appropriately (or disable agent login)

### Step 4: Delete Agent Portal Files
Remove unused pages and components

### Step 5: Clean Up Hooks
Remove agent-scoped hook functions no longer needed

### Step 6: Test Admin Workflow
Ensure all agent-related functionality works from admin side

