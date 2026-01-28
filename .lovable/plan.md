
# Fix Bank Balance Not Updating with Correct Payment Amount

## Problem Identified

When recording a payment for a multi-currency invoice (e.g., GBP invoice paid in TZS), the bank balance updates with **206** instead of **762,200** because the `amountInPaymentCurrency` field is not being passed in some components.

### Root Cause
The `RecordPaymentDialog` correctly calculates and returns `amountInPaymentCurrency` (the converted amount in payment currency), but two components strip this field when calling `recordPayment.mutate()`:

| Component | Status |
|-----------|--------|
| `InvoiceDetailDialog.tsx` | ✅ Passes `amountInPaymentCurrency` |
| `B2BInvoices.tsx` | ✅ Passes entire `details` object |
| `InvoiceTable.tsx` | ❌ **Missing** `amountInPaymentCurrency` |
| `ParcelCheckoutScanner.tsx` | ❌ **Missing** `amountInPaymentCurrency` |

### Example Flow (Current Bug)
1. Invoice created: **£206 GBP**
2. Payment recorded in TZS (exchange rate: 1 GBP = 3,700 TZS)
3. Dialog calculates: `amountInPaymentCurrency = 762,200 TZS`
4. Dialog passes: `{ amount: 206, amountInPaymentCurrency: 762200, ... }`
5. **BUG**: `InvoiceTable` strips `amountInPaymentCurrency` and only passes `amount: 206`
6. Hook falls back to `params.amount` (206) for bank balance update
7. Bank shows **206** instead of **762,200**

## Solution

Add the missing `amountInPaymentCurrency: details.amountInPaymentCurrency` to both components.

## Files to Modify

### 1. `src/components/admin/InvoiceTable.tsx`
Add `amountInPaymentCurrency` to the payment recording call:
```typescript
// Lines 343-360
recordPayment.mutate({
  invoiceId: details.invoiceId,
  amount: details.amount,
  amountInPaymentCurrency: details.amountInPaymentCurrency,  // ← ADD THIS
  paymentMethod: details.paymentMethod,
  depositAccountId: details.depositAccountId,
  paymentCurrency: details.paymentCurrency,
  paymentDate: details.paymentDate,
  reference: details.reference,
  notes: details.notes,
  splits: details.splits,
}, { ... });
```

### 2. `src/components/admin/billing/ParcelCheckoutScanner.tsx`
Add `amountInPaymentCurrency` to the payment recording call:
```typescript
// Lines 375-386
recordPayment.mutate({
  invoiceId: details.invoiceId,
  amount: details.amount,
  amountInPaymentCurrency: details.amountInPaymentCurrency,  // ← ADD THIS
  paymentMethod: details.paymentMethod,
  depositAccountId: details.depositAccountId,
  paymentCurrency: details.paymentCurrency,
  paymentDate: details.paymentDate,
  reference: details.reference,
  notes: details.notes,
  splits: details.splits,
}, { ... });
```

## After Fix

| Field | Value |
|-------|-------|
| Invoice amount | £206 GBP |
| Payment recorded | 762,200 TZS |
| Bank balance | 762,200 TZS ✅ |
| Invoice `amount_paid` | 206 (in invoice currency) |

## Testing Recommendations

After the fix:
1. Reset the Exim Bank balance to 0 in the database
2. Record a new payment for the existing invoice
3. Verify bank balance updates to the converted TZS amount
