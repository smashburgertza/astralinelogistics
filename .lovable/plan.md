
# Fix Category-Specific Pricing with Correct Regional Currencies

## Problem Summary

The Shop For Me calculator has two issues:

1. **Wrong data source**: Uses generic `region_pricing` + `shop_for_me_charges` instead of category-specific `shop_for_me_product_rates`
2. **Currency mismatch**: Product rates in database are all stored in USD, but should use regional currencies

### Current Currency Configuration (from regions table)
| Region | Currency |
|--------|----------|
| UK | GBP |
| Europe | EUR |
| USA | USD |
| China | USD |
| Dubai | USD |
| India | USD |

### Current Rates (all in USD - needs fixing)
The `shop_for_me_product_rates` table currently stores all rates in USD. This needs to be updated to match regional currencies.

---

## Solution Overview

### Part 1: Update Database - Store Rates in Regional Currencies

Update the existing product rates to use the correct currency per region:

| Region | Currency | Example: Hazardous Rate |
|--------|----------|-------------------------|
| UK | GBP | £30/kg |
| Europe | EUR | €16/kg |
| USA | USD | $15/kg |
| China | USD | $10/kg |
| Dubai | USD | $12/kg |
| India | USD | $11/kg |

**Database update needed:**
- Update `shop_for_me_product_rates` where region = 'uk' SET currency = 'GBP'
- Update `shop_for_me_product_rates` where region = 'europe' SET currency = 'EUR'
- All other regions remain USD (correct)

### Part 2: Update Calculator Logic

Replace the current calculation flow with category-aware pricing:

```text
CURRENT FLOW (incorrect):
+-------------------+     +---------------------+     +------------------+
| region_pricing    | --> | shop_for_me_charges | --> | Calculate total  |
| (generic rate/kg) |     | (global %)          |     |                  |
+-------------------+     +---------------------+     +------------------+

NEW FLOW (correct):
+---------------------------+     +------------------+
| shop_for_me_product_rates | --> | Calculate total  |
| (region + category)       |     | in region's      |
| Uses: rate_per_kg,        |     | currency         |
|       duty_percentage,    |     +------------------+
|       handling_fee_%,     |
|       markup_%            |
+---------------------------+
```

---

## Implementation Steps

### Step 1: Database Migration

Update currencies in `shop_for_me_product_rates` to match regional settings:

```sql
-- Update UK rates to use GBP
UPDATE shop_for_me_product_rates 
SET currency = 'GBP' 
WHERE region = 'uk';

-- Update Europe rates to use EUR
UPDATE shop_for_me_product_rates 
SET currency = 'EUR' 
WHERE region = 'europe';

-- USA, China, Dubai, India remain USD (already correct)
```

### Step 2: Update ShoppingAggregator.tsx

**Changes to imports and hooks:**
```typescript
// Add import for product rates
import { 
  useAllShopForMeProductRates, 
  calculateProductCost,
  type ShopForMeProductRate 
} from '@/hooks/useShopForMeProductRates';

// Inside component
const { data: productRates } = useAllShopForMeProductRates();
```

**Add helper function to find rates:**
```typescript
// Find rate for specific region + category
const getProductRate = (region: string, category: string): ShopForMeProductRate | null => {
  if (!productRates) return null;
  
  // Try exact match first
  let rate = productRates.find(
    r => r.region === region && 
         r.product_category === category && 
         r.is_active
  );
  
  // Fallback to 'general' category for same region
  if (!rate && category !== 'general') {
    rate = productRates.find(
      r => r.region === region && 
           r.product_category === 'general' && 
           r.is_active
    );
  }
  
  return rate || null;
};
```

**Update calculateTotals function:**
```typescript
const calculateTotals = () => {
  // Group items by region AND category
  const groupedItems: Record<string, ProductItem[]> = {};
  
  items.forEach(item => {
    const region = item.originRegion || selectedRegion;
    const category = item.productCategory || 'general';
    const key = `${region}:${category}`;
    
    if (!groupedItems[key]) groupedItems[key] = [];
    groupedItems[key].push(item);
  });

  const regionBreakdowns: RegionBreakdown[] = [];
  let grandTotalInTZS = 0;

  Object.entries(groupedItems).forEach(([key, groupItems]) => {
    const [region, category] = key.split(':');
    const rate = getProductRate(region, category);
    
    if (!rate) {
      // Fallback to legacy calculation if no rate found
      // ... existing logic
      return;
    }

    // Use rate's currency (GBP for UK, EUR for Europe, USD for others)
    const currency = rate.currency;
    const exchangeRate = getExchangeRate(currency);

    // Calculate for each item using category-specific rates
    let groupTotal = 0;
    const breakdown: BreakdownItem[] = [];
    
    groupItems.forEach(item => {
      const productCost = (item.productPrice || 0) * item.quantity;
      const weight = roundWeight(item.estimatedWeightKg) * item.quantity;
      
      const calc = calculateProductCost(productCost, weight, rate);
      groupTotal += calc.total;
    });

    // Build breakdown using rate's percentages
    // Product Cost → Shipping → Duty → Handling → Markup
    
    const subtotalInTZS = groupTotal * exchangeRate;
    grandTotalInTZS += subtotalInTZS;

    regionBreakdowns.push({
      region,
      category,
      currency,
      charges: breakdown,
      subtotal: groupTotal,
      subtotalInTZS,
      exchangeRate,
    });
  });

  // ... rest of calculation
};
```

### Step 3: Update Breakdown Display

Consolidate items from same region into single regional breakdown, showing:

```text
🇬🇧 United Kingdom (Hazardous)

Line Item          | Amount (GBP)
-------------------|-------------
Product Cost       | £150.00
Shipping (35kg)    | £1,050.00 (35 × £30/kg)
Duty (45%)         | £67.50
Handling (5%)      | £60.00
-------------------|-------------
Subtotal           | £1,327.50
                   | ≈ TZS 4,379,325
```

---

## File Changes Summary

| File | Changes |
|------|---------|
| `shop_for_me_product_rates` table | Update UK currency to GBP, Europe to EUR |
| `src/components/shopping/ShoppingAggregator.tsx` | Import product rates hook, update `calculateTotals()` to use category-specific rates and regional currencies |
| `src/hooks/useShopForMeProductRates.ts` | No changes (already has `calculateProductCost`) |

---

## Expected Results

### For UK Hazardous Product (35kg Battery at £150):

| Line Item | Before (Wrong) | After (Fixed) |
|-----------|----------------|---------------|
| Product Cost | £150 | £150 |
| Shipping | £280 (£8/kg generic) | £1,050 (£30/kg hazardous) |
| Duty | 35% global | 45% hazardous |
| Handling | 3% global | 5% hazardous |
| **Currency** | USD rate shown as GBP | **GBP** (correct) |

### For China Electronics (5kg Laptop at $800):

| Line Item | Rate Used |
|-----------|-----------|
| Product Cost | $800 |
| Shipping | $40 ($8/kg electronics) |
| Duty (25%) | $200 |
| Handling (4%) | $33.60 |
| **Currency** | **USD** |

---

## Testing Checklist

- [ ] UK product shows prices in GBP (£)
- [ ] Europe product shows prices in EUR (€)
- [ ] USA/China/Dubai/India products show USD ($)
- [ ] Hazardous category uses higher rates than general
- [ ] Electronics category uses electronics-specific rates
- [ ] TZS equivalent calculated correctly using exchange rates
- [ ] Fallback to 'general' category if specific category not configured
