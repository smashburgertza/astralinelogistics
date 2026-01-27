

# Enhanced Product Category Classification System

## Overview

Update the product category detection system to use your detailed classification definitions. This will improve both the AI-powered analysis and the keyword-based detection, while also updating the user-facing descriptions.

---

## Category Definitions (Your Specifications)

| Category | Description | Key Characteristics |
|----------|-------------|---------------------|
| **General Goods** | Everyday cargo that doesn't fall into special regulatory classes | Clothing, household items, non-restricted consumer products. Standard documentation and handling. |
| **Hazardous Goods** | Materials classified as dangerous under international transport rules | Flammable, toxic, corrosive, explosive. Special packaging, labeling, safety regulations. Higher risk. |
| **Cosmetics** | Beauty and personal care products | Creams, perfumes, makeup. Subject to health/safety regulations, chemical composition, labeling requirements. |
| **Electronics** | Consumer and industrial electronic devices or components | Phones, laptops, appliances, circuit boards. May involve battery restrictions, careful handling. |
| **Spare Parts** | Mechanical or automotive components for repairs/maintenance | Metals, plastics, assemblies. Often bulky, subject to customs classification. |

---

## Implementation Changes

### 1. Update Product Categories Constant

**File:** `src/hooks/useShopForMeProductRates.ts`

Add detailed descriptions to the category definitions:

```typescript
export const PRODUCT_CATEGORIES: { 
  value: ProductCategory; 
  label: string;
  description: string;
}[] = [
  { 
    value: 'general', 
    label: 'General Goods',
    description: 'Everyday cargo like clothing and household items. Standard handling.'
  },
  { 
    value: 'hazardous', 
    label: 'Hazardous Goods',
    description: 'Flammable, toxic, or dangerous materials. Special packaging required.'
  },
  { 
    value: 'cosmetics', 
    label: 'Cosmetics',
    description: 'Beauty and personal care products. Subject to health regulations.'
  },
  { 
    value: 'electronics', 
    label: 'Electronics',
    description: 'Phones, laptops, and electronic devices. May have battery restrictions.'
  },
  { 
    value: 'spare_parts', 
    label: 'Spare Parts',
    description: 'Automotive and mechanical components for repairs and maintenance.'
  },
];
```

### 2. Enhance Edge Function AI Prompt

**File:** `supabase/functions/fetch-product-info/index.ts`

Update the AI system prompt to use your exact category definitions for more accurate classification:

```typescript
## PRODUCT CATEGORY CLASSIFICATION

Classify this product into ONE of these categories:

1. **general** - Everyday cargo that doesn't fall into special regulatory classes
   - Clothing, household items, non-restricted consumer products
   - Requires standard documentation and handling
   - Examples: furniture, textiles, toys (without batteries), kitchenware

2. **hazardous** - Materials classified as dangerous under international transport rules
   - Flammable, toxic, corrosive, explosive substances
   - Requires special packaging, labeling, and safety compliance
   - Examples: standalone batteries, perfumes, aerosols, paints, solvents, fuel

3. **cosmetics** - Beauty and personal care products
   - Subject to health and safety regulations
   - Examples: creams, moisturizers, makeup, skincare, hair products
   - NOTE: Perfumes and aerosol sprays should be classified as HAZARDOUS instead

4. **electronics** - Consumer and industrial electronic devices or components
   - May involve restrictions on batteries (lithium)
   - Requires careful handling to avoid damage
   - Examples: phones, laptops, tablets, appliances, circuit boards, gaming consoles

5. **spare_parts** - Mechanical or automotive components for repairs/maintenance
   - Can include metals, plastics, or assemblies
   - Often bulky, subject to customs classification
   - Examples: engines, transmissions, brake pads, filters, radiators, alternators

Return in your JSON: "product_category": "general|hazardous|cosmetics|electronics|spare_parts"
```

### 3. Expand Keyword Detection Lists

**File:** `supabase/functions/fetch-product-info/index.ts`

Update the keyword arrays to cover more products in each category:

```typescript
// Cosmetics keywords (non-hazardous beauty products)
const cosmeticsProductKeywords = [
  'lipstick', 'mascara', 'foundation', 'eyeshadow', 'blush', 
  'concealer', 'moisturizer', 'serum', 'skincare', 'makeup', 
  'cosmetic', 'beauty', 'lotion', 'cream', 'cleanser', 'toner',
  'sunscreen', 'hair conditioner', 'shampoo', 'body lotion',
  'face mask', 'exfoliator', 'primer', 'bronzer', 'highlighter'
];

// Electronics keywords
const electronicsProductKeywords = [
  'laptop', 'phone', 'smartphone', 'tablet', 'computer', 'pc',
  'monitor', 'tv', 'television', 'camera', 'headphone', 'earbuds',
  'speaker', 'console', 'playstation', 'xbox', 'nintendo', 'gpu', 
  'graphics card', 'processor', 'cpu', 'motherboard', 'ram',
  'ssd', 'hard drive', 'keyboard', 'mouse', 'router', 'modem',
  'smart watch', 'fitness tracker', 'drone', 'projector', 'printer'
];

// Spare parts keywords (automotive/mechanical)
const sparePartsProductKeywords = [
  'engine', 'transmission', 'gearbox', 'brake', 'brake pad',
  'filter', 'oil filter', 'air filter', 'radiator', 'alternator', 
  'starter motor', 'exhaust', 'muffler', 'suspension', 'shock absorber',
  'carburetor', 'ignition', 'spark plug', 'clutch', 'gasket', 
  'bearing', 'piston', 'crankshaft', 'camshaft', 'timing belt',
  'water pump', 'fuel pump', 'turbo', 'turbocharger', 'injector',
  'axle', 'cv joint', 'wheel bearing', 'control arm', 'tie rod'
];
```

### 4. Update Admin UI (Product Rates Management)

**File:** `src/components/admin/ShopForMeProductRatesManagement.tsx`

Show category descriptions in the management table:

```tsx
// In table header, add tooltip or description column
<TableHead>
  <div className="flex items-center gap-1">
    Category
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Info className="h-3 w-3 text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent>
          Categories determine pricing based on product type
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
</TableHead>
```

### 5. Show Category Info in ShoppingAggregator

**File:** `src/components/shopping/ShoppingAggregator.tsx`

Add a tooltip to the category badge showing the description:

```tsx
import { PRODUCT_CATEGORIES } from '@/hooks/useShopForMeProductRates';

// Helper to get category info
const getCategoryInfo = (category: string) => {
  return PRODUCT_CATEGORIES.find(c => c.value === category) || {
    label: 'General Goods',
    description: 'Standard cargo with regular handling'
  };
};

// In the product card
const categoryInfo = getCategoryInfo(item.productCategory || 'general');

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>
      <Badge variant={...}>
        {categoryInfo.label}
      </Badge>
    </TooltipTrigger>
    <TooltipContent>
      <p className="max-w-xs">{categoryInfo.description}</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

---

## File Changes Summary

| File | Changes |
|------|---------|
| `src/hooks/useShopForMeProductRates.ts` | Add `description` field to `PRODUCT_CATEGORIES` array |
| `supabase/functions/fetch-product-info/index.ts` | Update AI prompt with detailed category definitions, expand keyword lists |
| `src/components/shopping/ShoppingAggregator.tsx` | Add tooltip to category badge showing description |
| `src/components/admin/ShopForMeProductRatesManagement.tsx` | Optional: Add info tooltip to category column |

---

## Classification Logic Flow

```text
Product URL Submitted
        |
        v
+-------------------+
| 1. Site Detection |  Check if URL is from known category-specific sites
| (Electronics,     |  (BestBuy → electronics, Sephora → cosmetics, AutoZone → spare_parts)
| Cosmetics, etc.)  |
+-------------------+
        |
        v
+-------------------+
| 2. AI Analysis    |  Use Gemini to analyze product name/description
| with Category     |  with detailed classification criteria
| Definitions       |
+-------------------+
        |
        v
+-------------------+
| 3. Hazard Check   |  Apply pattern matching with exclusions
| (Overrides other  |  If hazardous detected, override to 'hazardous'
| categories)       |
+-------------------+
        |
        v
+-------------------+
| 4. Keyword        |  If still 'general', check product name
| Fallback          |  against expanded keyword lists
+-------------------+
        |
        v
  Final Category
```

---

## Expected Behavior

| Product | Site | Expected Category |
|---------|------|-------------------|
| iPhone 15 Pro | apple.com | Electronics |
| Engine block | eBay Motors | Spare Parts |
| MAC Foundation | Sephora | Cosmetics |
| Lithium battery pack | Amazon | Hazardous |
| Men's jacket | ASOS | General Goods |
| Chanel No. 5 Perfume | Amazon | Hazardous (not Cosmetics - flammable) |
| Brake pads | AutoZone | Spare Parts |
| Moisturizer cream | Boots | Cosmetics |

---

## Technical Notes

1. **Cosmetics vs Hazardous**: Perfumes, aerosol sprays, and nail polish are classified as **Hazardous** (not Cosmetics) due to flammable/pressurized contents

2. **Electronics with batteries**: Devices with integrated batteries are classified as **Electronics** (not Hazardous) unless they are standalone battery products

3. **Priority order**: Hazardous detection takes priority over other categories to ensure safety compliance

4. **Fallback**: Products that don't match any specific criteria default to **General Goods**

