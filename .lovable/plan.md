

# Fix Product Category Misclassification

## Problem Analysis

The "20 Pcs Car Wheel Tire Brush Set" is being incorrectly classified as "electronics" or "spare_parts" instead of "general" goods.

### Root Cause

The keyword detection logic uses `.includes()` for substring matching, which causes false positives:

```typescript
// Current code (line 866)
if (electronicsProductKeywords.some(k => productNameLower.includes(k)) && finalCategory === 'general') {
  finalCategory = 'electronics';
}
```

**What's happening:**
1. The AI correctly classifies the product as "general"
2. But then the keyword fallback logic overrides it incorrectly
3. The substring matching is too aggressive - for example:
   - "wheel bearing" in spare_parts list might partially match "wheel" in the product name
   - Or other partial matches are occurring

### Evidence

From edge function logs, AI correctly returned:
```json
{
  "product_category": "general",
  ...
}
```

But the final response shows `"product_category": "spare_parts"` because the keyword fallback overrode the AI's correct classification.

---

## Solution

### 1. Use Word Boundary Matching Instead of Substring Matching

Replace `.includes()` with proper word boundary regex matching to prevent partial word matches:

```typescript
// Helper function for word boundary matching
function matchesKeyword(text: string, keyword: string): boolean {
  // For multi-word keywords, match the exact phrase
  if (keyword.includes(' ')) {
    return text.includes(keyword);
  }
  // For single words, use word boundary matching
  const regex = new RegExp(`\\b${keyword}\\b`, 'i');
  return regex.test(text);
}

// Updated usage
if (electronicsProductKeywords.some(k => matchesKeyword(productNameLower, k)) && finalCategory === 'general') {
  finalCategory = 'electronics';
}
```

This ensures:
- "wheel brush" does NOT match "wheel bearing" keyword
- "brake pad" keyword only matches products that contain "brake pad" together
- Single-word keywords like "laptop" match "laptop" but not "laptops" (wait, that's wrong)

Actually, let me refine this:

```typescript
function matchesKeyword(text: string, keyword: string): boolean {
  // Escape special regex characters in keyword
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Match word boundaries - allows plurals (laptops matches laptop)
  const regex = new RegExp(`\\b${escapedKeyword}s?\\b`, 'i');
  return regex.test(text);
}
```

### 2. Trust AI Classification Over Keywords

The AI is correctly identifying this as "general goods" but the keyword fallback is overriding it. Change the logic to only apply keyword detection when AI returns "general" AND the keyword is a strong match:

```typescript
// Only apply keyword override if:
// 1. AI classified as "general" (uncertain)
// 2. The keyword match is strong (exact match, not partial)
// 3. The product description supports it (optional additional check)
```

### 3. Refine Spare Parts Keywords

The spare_parts keywords include terms that can match car accessories:
- "wheel bearing" → but "wheel" alone can match car washing supplies
- "brake pad" → but "brake" alone could match various products

**Refined keywords for spare_parts:**
```typescript
const sparePartsProductKeywords = [
  'engine block', 'transmission', 'gearbox', 'brake pad', 'brake disc', 'brake rotor',
  'oil filter', 'air filter', 'fuel filter', 'radiator', 'alternator', 
  'starter motor', 'exhaust pipe', 'muffler', 'suspension spring', 'shock absorber',
  'carburetor', 'ignition coil', 'spark plug', 'clutch plate', 'gasket', 
  'crankshaft', 'camshaft', 'timing belt', 'timing chain',
  'water pump', 'fuel pump', 'turbocharger', 'fuel injector',
  'cv joint', 'wheel bearing', 'control arm', 'tie rod'
];
```

### 4. Add Exclusion Patterns for Car Accessories

Add patterns to exclude common car care/cleaning products from spare_parts classification:

```typescript
// Car care products - should be general, not spare_parts
const carCareExclusions = [
  'brush', 'cleaner', 'cleaning', 'wash', 'wax', 'polish', 
  'detailing', 'mitt', 'towel', 'microfiber', 'sponge', 'shampoo'
];

// If product matches car care exclusions, don't reclassify to spare_parts
const isCarCareProduct = carCareExclusions.some(ex => productNameLower.includes(ex));
if (sparePartsProductKeywords.some(k => matchesKeyword(productNameLower, k)) 
    && finalCategory === 'general' 
    && !isCarCareProduct) {
  finalCategory = 'spare_parts';
}
```

---

## Implementation

### File Changes

**File:** `supabase/functions/fetch-product-info/index.ts`

1. Add `matchesKeyword()` helper function (before the `serve()` function)

2. Add car care exclusion patterns

3. Update the keyword matching logic for all categories:
   - Replace `.includes()` with `matchesKeyword()`
   - Add exclusion checks

4. Refine the spare_parts keywords to be more specific (two-word phrases where possible)

---

## Expected Behavior After Fix

| Product | Current | Expected |
|---------|---------|----------|
| 20 Pcs Car Wheel Tire Brush Set | spare_parts/electronics | **general** |
| MacBook Pro laptop | electronics | electronics |
| Brake Pad Set for Toyota | spare_parts | spare_parts |
| Car Wax Polish Kit | general | general |
| Wheel Bearing Assembly | spare_parts | spare_parts |
| iPhone 15 Pro | electronics | electronics |
| Car Wash Mitt and Towel Set | general | general |

---

## Technical Implementation Details

The changes will ensure that:
1. Word boundary matching prevents partial word false positives
2. Car care/cleaning products are explicitly excluded from spare_parts
3. AI classification is given higher priority over keyword matching
4. Multi-word keywords require exact phrase matching

