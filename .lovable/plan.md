
# Improved Hazardous Goods Detection System

## Overview
Enhance the product category detection system to provide more accurate hazardous goods identification with reduced false positives, contextual analysis, and optional AI-powered classification.

---

## Current State Analysis

### Existing Detection Logic
The current system uses two-stage keyword matching:

**Stage 1 - URL Pattern Detection (lines 110-114):**
```typescript
const hazardousKeywords = ['battery', 'lithium', 'perfume', 'fragrance', 
  'aerosol', 'nail-polish', 'flammable', 'chemical', 'paint', 'solvent', 
  'alcohol', 'fuel'];
```

**Stage 2 - Product Name Detection (lines 506-510):**
```typescript
const hazardousProductKeywords = ['battery', 'lithium', 'perfume', 
  'cologne', 'fragrance', 'nail polish', 'aerosol', 'spray paint', 'flammable'];
```

### Current Limitations
| Problem | Example |
|---------|---------|
| False positives | "Battery-operated toy" → marked hazardous |
| False positives | "Alcohol-free sanitizer" → marked hazardous |
| False positives | "Nail polish remover pads" (dry) → marked hazardous |
| Missing context | Small AA batteries vs large lithium car batteries |
| No severity levels | All hazardous items treated equally |
| No exclusion patterns | Can't distinguish "battery charger" from "battery" |

---

## Proposed Solution

### Multi-Layer Detection Strategy

```text
+------------------+     +------------------+     +------------------+
|  Layer 1         |     |  Layer 2         |     |  Layer 3         |
|  URL & Site      | --> |  Product Name    | --> |  AI Contextual   |
|  Pattern Match   |     |  Analysis        |     |  Analysis        |
+------------------+     +------------------+     +------------------+
        |                        |                        |
        v                        v                        v
   Quick flags            Refined match           Final decision
   (high recall)          (exclusion patterns)    (high precision)
```

---

## Implementation Details

### 1. Enhanced Keyword System with Exclusions

Replace simple keyword matching with pattern-based detection that includes exclusion rules:

```typescript
interface HazardousPattern {
  keywords: string[];           // Match these words
  excludePatterns: string[];    // Don't match if these present
  category: 'battery' | 'flammable' | 'pressurized' | 'chemical' | 'fragrance';
  severity: 'restricted' | 'special_handling' | 'prohibited';
}

const HAZARDOUS_PATTERNS: HazardousPattern[] = [
  {
    keywords: ['lithium battery', 'lithium-ion', 'li-ion', 'lipo'],
    excludePatterns: ['charger only', 'battery charger', 'replacement charger'],
    category: 'battery',
    severity: 'restricted'
  },
  {
    keywords: ['battery'],
    excludePatterns: ['battery-operated', 'battery powered', 'uses batteries', 
                     'batteries included', 'batteries not included', 'charger', 
                     'battery case', 'battery holder', 'battery cover'],
    category: 'battery',
    severity: 'special_handling'
  },
  {
    keywords: ['perfume', 'cologne', 'eau de parfum', 'eau de toilette', 'fragrance spray'],
    excludePatterns: ['fragrance-free', 'unscented', 'perfume bottle empty', 'atomizer only'],
    category: 'fragrance',
    severity: 'restricted'
  },
  {
    keywords: ['aerosol', 'spray can', 'compressed gas'],
    excludePatterns: ['non-aerosol', 'pump spray', 'trigger spray', 'mist spray'],
    category: 'pressurized',
    severity: 'restricted'
  },
  {
    keywords: ['nail polish', 'nail lacquer', 'nail varnish'],
    excludePatterns: ['nail polish remover pads', 'nail stickers', 'press-on nails', 
                     'nail tips', 'nail art', 'nail file'],
    category: 'flammable',
    severity: 'special_handling'
  },
  {
    keywords: ['paint', 'solvent', 'thinner', 'acetone', 'turpentine'],
    excludePatterns: ['paint brush', 'paint roller', 'paint tray', 'dried paint', 
                     'paint sample', 'color sample', 'paint chip'],
    category: 'chemical',
    severity: 'restricted'
  },
  {
    keywords: ['alcohol', 'ethanol', 'isopropyl'],
    excludePatterns: ['alcohol-free', 'non-alcoholic', 'zero alcohol', '0% alcohol'],
    category: 'flammable',
    severity: 'special_handling'
  },
  {
    keywords: ['fuel', 'gasoline', 'petrol', 'kerosene', 'propane'],
    excludePatterns: ['fuel pump', 'fuel filter', 'fuel line', 'fuel tank empty', 
                     'fuel gauge', 'fuel efficient'],
    category: 'flammable',
    severity: 'prohibited'
  }
];
```

### 2. Smart Detection Function

```typescript
interface HazardousResult {
  isHazardous: boolean;
  category: string | null;
  severity: 'restricted' | 'special_handling' | 'prohibited' | null;
  matchedKeyword: string | null;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

function detectHazardousGoods(
  productName: string, 
  productDescription: string | null,
  url: string
): HazardousResult {
  const textToAnalyze = `${productName} ${productDescription || ''} ${url}`.toLowerCase();
  
  for (const pattern of HAZARDOUS_PATTERNS) {
    // Check if any keyword matches
    const matchedKeyword = pattern.keywords.find(k => textToAnalyze.includes(k));
    
    if (matchedKeyword) {
      // Check if any exclusion pattern is present
      const hasExclusion = pattern.excludePatterns.some(ex => textToAnalyze.includes(ex));
      
      if (!hasExclusion) {
        return {
          isHazardous: true,
          category: pattern.category,
          severity: pattern.severity,
          matchedKeyword,
          confidence: pattern.keywords.length > 1 ? 'high' : 'medium',
          reason: `Contains "${matchedKeyword}" which is classified as ${pattern.category}`
        };
      }
    }
  }
  
  return {
    isHazardous: false,
    category: null,
    severity: null,
    matchedKeyword: null,
    confidence: 'high',
    reason: 'No hazardous indicators found'
  };
}
```

### 3. AI-Powered Contextual Analysis

Add hazardous classification to the existing AI prompt for ambiguous cases:

```typescript
// Add to the AI system prompt
const hazardousAnalysisPrompt = `
## HAZARDOUS GOODS CLASSIFICATION

Analyze if this product is hazardous for air/sea shipping:

HAZARDOUS CATEGORIES:
- Battery products: Standalone lithium batteries, power banks, battery packs
  (NOT battery-operated toys, battery chargers, battery cases)
- Flammable liquids: Perfumes, nail polish, paint, solvents, alcohol
  (NOT alcohol-free products, dry items, empty containers)
- Pressurized containers: Aerosols, compressed gas
  (NOT pump sprays, non-aerosol alternatives)
- Chemicals: Acids, corrosives, oxidizers

Return in your JSON:
{
  "is_hazardous": true/false,
  "hazard_category": "battery|flammable|pressurized|chemical|none",
  "hazard_reason": "brief explanation or null"
}
`;
```

### 4. Weight-Based Battery Detection

For battery products, use weight as an additional signal:

```typescript
function refineHazardousClassification(
  category: string,
  weightKg: number,
  productName: string
): HazardousResult {
  // Small battery products (< 0.5kg) are often battery-operated toys
  if (category === 'battery' && weightKg < 0.5) {
    const toyIndicators = ['toy', 'kids', 'children', 'game', 'remote control', 
                          'rc car', 'drone', 'robot'];
    if (toyIndicators.some(t => productName.toLowerCase().includes(t))) {
      return {
        isHazardous: false,
        category: null,
        severity: null,
        matchedKeyword: null,
        confidence: 'medium',
        reason: 'Appears to be battery-operated toy, not standalone battery'
      };
    }
  }
  
  // Large battery products (> 5kg) like car batteries are definitely hazardous
  if (category === 'battery' && weightKg > 5) {
    return {
      isHazardous: true,
      category: 'battery',
      severity: 'restricted',
      matchedKeyword: 'battery',
      confidence: 'high',
      reason: 'Large battery product requires special handling'
    };
  }
  
  // ... return original classification
}
```

---

## Response Structure Enhancement

### Updated API Response

```typescript
interface ProductInfoResponse {
  product_name: string;
  product_description: string | null;
  product_image: string | null;
  product_price: number | null;
  currency: string;
  estimated_weight_kg: number;
  origin_region: string;
  product_category: 'general' | 'hazardous' | 'cosmetics' | 'electronics' | 'spare_parts';
  // NEW FIELDS
  hazard_details?: {
    category: 'battery' | 'flammable' | 'pressurized' | 'chemical' | 'fragrance';
    severity: 'restricted' | 'special_handling' | 'prohibited';
    reason: string;
    confidence: 'high' | 'medium' | 'low';
  };
}
```

---

## Customer-Facing Display

### Show Hazardous Warning in ShoppingAggregator

Add a visual indicator when a product is detected as hazardous:

```tsx
{item.productCategory === 'hazardous' && (
  <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded-md mt-2">
    <AlertTriangle className="h-4 w-4" />
    <span className="text-sm">
      This item may require special shipping handling
      {item.hazardDetails?.reason && `: ${item.hazardDetails.reason}`}
    </span>
  </div>
)}
```

---

## File Changes Summary

| File | Changes |
|------|---------|
| `supabase/functions/fetch-product-info/index.ts` | Replace keyword arrays with pattern-based detection, add exclusion logic, enhance AI prompt |
| `src/components/shopping/ShoppingAggregator.tsx` | Add hazard warning display, show confidence indicator |
| `src/hooks/useShopForMeProductRates.ts` | No changes (rates already support hazardous category) |

---

## Testing Scenarios

| Product | Expected Result |
|---------|-----------------|
| "Energizer AA Batteries 8-pack" | Hazardous (battery) |
| "PAW Patrol Battery-Operated Toy Car" | NOT hazardous (exclusion) |
| "Milwaukee M18 Lithium Battery" | Hazardous (lithium battery) |
| "Battery Charger for DeWalt" | NOT hazardous (exclusion) |
| "Chanel No. 5 Perfume 100ml" | Hazardous (fragrance) |
| "Fragrance-Free Moisturizer" | NOT hazardous (exclusion) |
| "Rust-Oleum Spray Paint" | Hazardous (aerosol + paint) |
| "Acrylic Paint Set - 12 Tubes" | NOT hazardous (not aerosol/solvent) |
| "Isopropyl Alcohol 70% 500ml" | Hazardous (flammable) |
| "Alcohol-Free Hand Sanitizer" | NOT hazardous (exclusion) |

---

## Technical Implementation Notes

1. **Order of operations**: Exclusions are checked AFTER keyword match to avoid performance overhead
2. **Case insensitivity**: All text normalized to lowercase before matching
3. **Combined text analysis**: Checks URL + product name + description together for better context
4. **Confidence scoring**: High = multiple keyword match, Medium = single keyword, Low = AI inference only
5. **Backward compatibility**: Existing `product_category: 'hazardous'` still works, new `hazard_details` is optional
