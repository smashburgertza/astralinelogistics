
# Add Agent Invoice Creation (From Agent) ✅ COMPLETED

## Overview

Added the ability to manually create invoices where **agents bill Astraline** for services, commissions, handling fees, or reimbursements. This creates records with `invoice_direction = 'from_agent'` in the "From Agents" tab.

## Implementation Summary

### Files Created/Modified

| Action | File | Status |
|--------|------|--------|
| **Created** | `src/components/admin/CreateAgentInvoiceDialog.tsx` | ✅ Done |
| **Modified** | `src/components/admin/B2BInvoices.tsx` | ✅ Done |
| **Modified** | `src/components/admin/agents/index.ts` | ✅ Done |

### Features Implemented

1. **New Dialog Component** (`CreateAgentInvoiceDialog.tsx`)
   - Agent selector dropdown populated from `useAgents()` hook
   - Currency selector (USD, TZS, GBP, EUR, CNY, AED)
   - Due date picker
   - Dynamic line items (description, quantity, unit price, calculated amount)
   - Total and TZS conversion display
   - Notes field

2. **B2B Invoices Integration**
   - Added "Add Agent Invoice" button in the "From Agents" tab header
   - Dialog creates invoices with `invoice_direction = 'from_agent'`
   - Automatic query invalidation refreshes balances and invoice lists

### Key Technical Details

- Invoice Direction: `from_agent` (agent bills us)
- Invoice Type: `agent_service`
- No shipment link required (standalone invoices)
- Creates invoice items for each line item
- Converts amounts to TZS using exchange rates
