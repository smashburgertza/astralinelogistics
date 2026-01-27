
# Shop For Me Configuration Separation & Full Customization

## Overview
This plan restructures the Shop For Me admin settings to be completely independent from the Shipping Calculator, with dedicated configuration for **Products** and **Vehicles** sections. Products will have category-specific rates for general goods, hazardous goods, cosmetics, electronics, and spare parts.

---

## Current State Analysis

### What Exists Today
1. **Shop For Me Tab** in admin settings contains:
   - Feature visibility toggle
   - Generic charges (duty_clearing 35%, handling_fee 3%) stored in `shop_for_me_charges` table
   
2. **Shipping Calculator Tab** contains:
   - Region management, container pricing, vehicle pricing, duty rates
   - Air cargo pricing by region
   - Shipping calculator charges by region/cargo type

3. **Customer-facing Shop For Me** has 5 category tabs: Products, Vehicles, Cosmetics, Electronics, Spare Parts

4. **Current `shop_for_me_charges` table** has no region or category differentiation

---

## Proposed Architecture

### New Data Model

```text
+-----------------------------+
|   shop_for_me_settings      |
+-----------------------------+
| id, setting_key, value      |
| (JSON for flexible config)  |
+-----------------------------+

+-----------------------------+
| shop_for_me_product_rates   |
+-----------------------------+
| id                          |
| region (usa, uk, europe...) |
| product_category            |
|   (general, hazardous,      |
|    cosmetics, electronics,  |
|    spare_parts)             |
| rate_per_kg                 |
| handling_fee                |
| duty_percentage             |
| additional_charges (JSON)   |
| currency                    |
| is_active                   |
+-----------------------------+

+-----------------------------+
| shop_for_me_vehicle_rates   |
+-----------------------------+
| id                          |
| region                      |
| vehicle_type                |
| shipping_method (air/sea)   |
| base_price                  |
| duty_percentage             |
| handling_fee                |
| currency                    |
| is_active                   |
+-----------------------------+
```

---

## Implementation Tasks

### Phase 1: Database Schema

**1.1 Create `shop_for_me_product_rates` table**
- Columns: id, region, product_category, rate_per_kg, handling_fee_percentage, duty_percentage, markup_percentage, currency, is_active, display_order, created_at, updated_at
- Product categories: `general`, `hazardous`, `cosmetics`, `electronics`, `spare_parts`
- Regions: usa, uk, europe, dubai, china, india
- Enable RLS with admin access policies

**1.2 Create `shop_for_me_vehicle_rates` table**
- Columns: id, region, vehicle_type, shipping_method, base_shipping_price, handling_fee, markup_percentage, currency, is_active, created_at, updated_at
- Vehicle types: motorcycle, sedan, suv, truck
- Shipping methods: sea_roro, sea_container, air
- Enable RLS with admin access policies

**1.3 Create `shop_for_me_general_charges` table** (replaces current shop_for_me_charges)
- Columns: id, charge_type (products/vehicles), charge_name, charge_key, charge_value, charge_value_type (percentage/fixed), applies_to, is_active, display_order
- Separate charges for products vs vehicles

**1.4 Migrate existing data**
- Move current `shop_for_me_charges` data to new structure
- Seed initial rates per region/category

---

### Phase 2: Admin Settings UI Restructure

**2.1 Reorganize Shop For Me Tab**
Current structure:
```
Shop For Me
├── Feature Visibility
└── Charges Management (generic)
```

New structure:
```
Shop For Me
├── Feature Visibility
├── Products Configuration
│   ├── Region Selection Tabs (USA, UK, Europe, etc.)
│   └── Category-specific rates table
│       ├── General Goods (rate/kg, handling, duty)
│       ├── Hazardous Goods
│       ├── Cosmetics
│       ├── Electronics
│       └── Spare Parts
└── Vehicles Configuration
    ├── Region Selection Tabs
    └── Vehicle rates by type/method
        ├── Motorcycle (Sea RoRo, Sea Container, Air)
        ├── Sedan
        ├── SUV
        └── Truck
```

**2.2 Create new admin components**

| Component | Purpose |
|-----------|---------|
| `ShopForMeProductRatesManagement.tsx` | Manage product rates by region and category |
| `ShopForMeVehicleRatesManagement.tsx` | Manage vehicle rates by region and type |
| `ShopForMeChargesManagement.tsx` (refactor) | Split into product/vehicle specific charges |

**2.3 Update Settings page**
- Add sub-tabs within Shop For Me: "Products" and "Vehicles"
- Each sub-tab shows region-based configuration
- Remove vehicle-related settings from Shipping Calculator that overlap

---

### Phase 3: Hooks and Data Layer

**3.1 Create new hooks**

```typescript
// useShopForMeProductRates.ts
- useShopForMeProductRates(region, category)
- useCreateProductRate()
- useUpdateProductRate()
- useDeleteProductRate()

// useShopForMeVehicleRates.ts  
- useShopForMeVehicleRates(region, vehicleType)
- useCreateVehicleRate()
- useUpdateVehicleRate()
- useDeleteVehicleRate()
```

**3.2 Update `useShopForMeCharges.ts`**
- Add category parameter to fetch charges
- Update calculation logic to use category-specific rates

**3.3 Calculation logic update**
```typescript
calculateShopForMeCost({
  productCost,
  weightKg,
  region,
  category, // NEW: general, hazardous, cosmetics, electronics, spare_parts
})

calculateShopForMeVehicleCost({
  vehiclePrice,
  region,
  vehicleType,
  shippingMethod,
})
```

---

### Phase 4: Customer-Facing Updates

**4.1 Update ShopForMeSection.tsx**
- Reduce categories from 5 to 2 main tabs: "Products" and "Vehicles"
- Products section internally categorizes items (user doesn't see sub-categories directly)

**4.2 Update ShoppingAggregator.tsx**
- Accept `category` prop to determine rate lookup
- Behind the scenes, detect product type from URL/description:
  - Cosmetics sites (Sephora, Ulta) → cosmetics rates
  - Electronics sites (Best Buy, Newegg) → electronics rates
  - Auto parts sites → spare_parts rates
  - Hazardous indicators → hazardous rates
  - Default → general rates

**4.3 Vehicle-specific flow**
- Vehicles tab uses dedicated vehicle rate lookup
- Shows CIF and Duty Paid options (already exists)
- Uses new `shop_for_me_vehicle_rates` instead of shipping calculator rates

---

### Phase 5: Category Auto-Detection

**5.1 Enhance product info extraction**
Update `fetch-product-info` edge function to:
- Detect product category from URL domain patterns
- Parse product descriptions for category keywords
- Return `product_category` field in response

**5.2 Domain-to-category mapping**
```typescript
const CATEGORY_DOMAINS = {
  cosmetics: ['sephora', 'ulta', 'beautybay', 'cultbeauty'],
  electronics: ['bestbuy', 'newegg', 'bhphoto', 'currys'],
  spare_parts: ['autozone', 'rockauto', 'parts', 'autoparts'],
  hazardous: [], // Detected by keywords: battery, lithium, flammable, etc.
};
```

---

## Technical Details

### Database Migration SQL Summary

```sql
-- Product rates table
CREATE TABLE shop_for_me_product_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region agent_region NOT NULL,
  product_category TEXT NOT NULL CHECK (product_category IN 
    ('general', 'hazardous', 'cosmetics', 'electronics', 'spare_parts')),
  rate_per_kg DECIMAL NOT NULL DEFAULT 0,
  handling_fee_percentage DECIMAL NOT NULL DEFAULT 0,
  duty_percentage DECIMAL NOT NULL DEFAULT 0,
  markup_percentage DECIMAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(region, product_category)
);

-- Vehicle rates table
CREATE TABLE shop_for_me_vehicle_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region agent_region NOT NULL,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN 
    ('motorcycle', 'sedan', 'suv', 'truck')),
  shipping_method TEXT NOT NULL CHECK (shipping_method IN 
    ('sea_roro', 'sea_container', 'air')),
  base_shipping_price DECIMAL NOT NULL DEFAULT 0,
  handling_fee DECIMAL NOT NULL DEFAULT 0,
  markup_percentage DECIMAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(region, vehicle_type, shipping_method)
);
```

### File Changes Summary

| Action | File |
|--------|------|
| Create | `src/hooks/useShopForMeProductRates.ts` |
| Create | `src/hooks/useShopForMeVehicleRates.ts` |
| Create | `src/components/admin/ShopForMeProductRatesManagement.tsx` |
| Create | `src/components/admin/ShopForMeVehicleRatesManagement.tsx` |
| Modify | `src/pages/admin/Settings.tsx` - Restructure Shop For Me tab |
| Modify | `src/components/admin/ShopForMeChargesManagement.tsx` - Add category support |
| Modify | `src/hooks/useShopForMeCharges.ts` - Add category-based calculations |
| Modify | `src/components/home/ShopForMeSection.tsx` - Reduce to 2 main tabs |
| Modify | `src/components/shopping/ShoppingAggregator.tsx` - Category detection |
| Modify | `supabase/functions/fetch-product-info/index.ts` - Category detection |

---

## User Experience Flow

### Admin Flow
1. Navigate to Settings → Shop For Me
2. Select "Products" sub-tab
3. Choose region (USA, UK, Europe, etc.)
4. Configure rates for each product category:
   - General Goods: $8/kg, 35% duty, 3% handling
   - Hazardous: $15/kg, 45% duty, 5% handling
   - Cosmetics: $10/kg, 40% duty, 3% handling
   - Electronics: $12/kg, 25% duty, 4% handling
   - Spare Parts: $9/kg, 30% duty, 3% handling

### Customer Flow
1. Visit Shop For Me section
2. Select "Products" or "Vehicles" tab
3. Paste product URL
4. System auto-detects category (behind the scenes)
5. Price calculated using category-specific rates
6. Customer sees final quote without knowing category complexity

---

## Migration Strategy

1. Deploy database changes first
2. Seed initial rates (copy from existing shipping calculator where applicable)
3. Deploy admin UI changes
4. Deploy customer-facing changes
5. Monitor and adjust rates as needed
