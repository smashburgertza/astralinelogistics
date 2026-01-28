
# Remove Accounting Module While Keeping Core Features

## Overview

Simplify the system by removing double-entry bookkeeping while retaining full functionality for invoices, estimates, bank accounts, expenses, and payments.

## Current vs. Proposed Architecture

| Feature | Current (with Accounting) | Proposed (Simple) |
|---------|---------------------------|-------------------|
| Invoice creation | Creates journal entry (AR/Revenue) | Just creates invoice |
| Payment recording | Creates journal entry + updates balance | Updates bank balance directly |
| Expense approval | Creates journal entry + updates balance | Updates bank balance directly |
| Bank balance | Calculated from journal lines | Stored in `current_balance` column |
| Financial reports | Trial Balance, Income Statement, etc. | Removed (use external accounting software if needed) |

## What Gets Removed

### Database Tables (can be deleted later)
- `chart_of_accounts`
- `journal_entries`
- `journal_lines`
- `fiscal_periods`
- `tax_rates`
- `account_balances`
- `bank_transactions` (for reconciliation)

### Files to Delete
- `src/lib/journalEntryUtils.ts` (entire file)
- Journal/Chart of Accounts components (already hidden)

### Files to Modify

#### 1. `src/hooks/useAccounting.ts`
- Keep: `useBankAccounts`, `useCreateBankAccount`, `useUpdateBankAccount`
- Remove: All journal entry hooks, chart of accounts hooks, fiscal period hooks, tax rate hooks
- Simplify: `useBankAccounts` to just read from table (no journal line calculation)

#### 2. `src/hooks/useInvoices.ts`
- Remove: Import and calls to `createInvoiceJournalEntry`, `createInvoicePaymentJournalEntry`
- Keep: All invoice CRUD, payment recording (just update bank balance)

#### 3. `src/hooks/useExpenses.ts`
- Remove: Import and calls to `createExpensePaymentJournalEntry`
- Keep: All expense CRUD, approval workflow

#### 4. `src/hooks/useAgentInvoices.ts`
- Remove: Journal entry creation calls
- Keep: All agent invoice functionality

#### 5. `src/pages/admin/Dashboard.tsx`
- Remove: Query to `journal_entries` for expense aggregation
- Use: Query to `expenses` table directly

#### 6. `src/pages/admin/Approvals.tsx`
- Remove: `usePendingTransactions`, journal-related approval logic
- Keep: Expense approvals, payment verifications

## Simplified Bank Balance Logic

```typescript
// NEW: Simple bank balance update
async function updateBankBalance(bankAccountId: string, amount: number, isDebit: boolean) {
  const { data: account } = await supabase
    .from('bank_accounts')
    .select('current_balance')
    .eq('id', bankAccountId)
    .single();
  
  const newBalance = isDebit 
    ? account.current_balance + amount  // Money in (payment received)
    : account.current_balance - amount; // Money out (expense paid)
  
  await supabase
    .from('bank_accounts')
    .update({ current_balance: newBalance })
    .eq('id', bankAccountId);
}
```

## What Stays the Same

- Invoice creation, editing, status updates
- Estimate creation and conversion to invoices
- Customer payments with multiple payment methods
- Bank account management (add, edit, view balances)
- Expense submission and multi-step approval
- Payroll runs and salary advances
- All reporting based on invoices/expenses tables

## Migration Steps

### Phase 1: Remove Journal Entry Creation
1. Delete `src/lib/journalEntryUtils.ts`
2. Remove journal entry imports and calls from hooks
3. Simplify `useBankAccounts` to read `current_balance` directly

### Phase 2: Simplify Accounting Hook
1. Remove chart of accounts, journal, fiscal period, tax rate hooks
2. Keep only bank account hooks

### Phase 3: Clean Up UI
1. Remove any remaining journal/chart references from components
2. Update dashboard expense query to use `expenses` table

### Phase 4: Database Cleanup (Optional - Later)
1. Drop unused accounting tables via migration
2. Clean up database functions like `generate_journal_number`

## Technical Summary

| Action | Files Affected |
|--------|----------------|
| Delete file | 1 (`journalEntryUtils.ts`) |
| Modify hooks | 4 (`useAccounting`, `useInvoices`, `useExpenses`, `useAgentInvoices`) |
| Modify pages | 2 (`Dashboard`, `Approvals`) |
| Tables to drop | 6 (can do later) |

## Benefits

- Simpler codebase (less code to maintain)
- Faster transactions (no background journal creation)
- Easier to understand (direct balance tracking vs. double-entry)
- Bank balances still work correctly

## Trade-offs

- No double-entry audit trail
- No automatic financial reports (Trial Balance, P&L, Balance Sheet)
- If you need CPA-level accounting later, you'd use external software

---

This approach gives you a clean, simple operational system that tracks money in and out of bank accounts without the complexity of full double-entry bookkeeping.
