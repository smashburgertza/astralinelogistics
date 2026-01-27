
# Shop For Me Configuration Separation & Full Customization

## Overview
This plan restructures the Shop For Me admin settings to be completely independent from the Shipping Calculator, with dedicated configuration for **Products** and **Vehicles** sections. Products will have category-specific rates for general goods, hazardous goods, cosmetics, electronics, and spare parts.

---

## Completed Implementation

### ✅ Phase 1: Database Schema (COMPLETE)

**1.1 Created `shop_for_me_product_rates` table**
- Columns: id, region, product_category, rate_per_kg, handling_fee_percentage, duty_percentage, markup_percentage, currency, is_active, display_order, created_at, updated_at
- Product categories: `general`, `hazardous`, `cosmetics`, `electronics`, `spare_parts`
- Regions: usa, uk, europe, dubai, china, india
- RLS enabled with admin access policies

**1.2 Created `shop_for_me_vehicle_rates` table**
- Columns: id, region, vehicle_type, shipping_method, base_shipping_price, handling_fee, duty_percentage, markup_percentage, currency, is_active, created_at, updated_at
- Vehicle types: motorcycle, sedan, suv, truck
- Shipping methods: sea_roro, sea_container, air
- RLS enabled with admin access policies

**1.3 Seeded initial data**
- Product rates seeded for all 6 regions × 5 categories = 30 rows
- Vehicle rates seeded for all 6 regions × 4 types × 3 methods = 72 rows

---

### ✅ Phase 2: Admin Settings UI Restructure (COMPLETE)

**2.1 Reorganized Shop For Me Tab**
New structure:
```
Shop For Me
├── Feature Visibility
├── Preview Button
└── Pricing Configuration Card
    ├── Products Tab
    │   ├── ShopForMeProductRatesManagement (region tabs + category table)
    │   └── ShopForMeChargesManagement
    └── Vehicles Tab
        └── ShopForMeVehicleRatesManagement (region tabs + vehicle/method table)
```

**2.2 Created new admin components**
- `src/components/admin/ShopForMeProductRatesManagement.tsx`
- `src/components/admin/ShopForMeVehicleRatesManagement.tsx`

**2.3 Updated Settings page**
- Added nested tabs within Shop For Me for "Products" and "Vehicles"
- Each region shows as a tab with editable rate table

---

### ✅ Phase 3: Hooks and Data Layer (COMPLETE)

**3.1 Created new hooks**
- `src/hooks/useShopForMeProductRates.ts`
  - useShopForMeProductRates(region)
  - useActiveProductRate(region, category)
  - useCreateShopForMeProductRate()
  - useUpdateShopForMeProductRate()
  - useDeleteShopForMeProductRate()
  - calculateProductCost() helper

- `src/hooks/useShopForMeVehicleRates.ts`
  - useShopForMeVehicleRates(region)
  - useActiveVehicleRate(region, vehicleType, shippingMethod)
  - useCreateShopForMeVehicleRate()
  - useUpdateShopForMeVehicleRate()
  - useDeleteShopForMeVehicleRate()
  - calculateVehicleCost() helper

**3.2 Updated barrel exports**
- `src/hooks/settings/index.ts` - Added new hook exports
- `src/components/admin/settings/index.ts` - Added new component exports

---

## Remaining Tasks

### Phase 4: Customer-Facing Updates (TODO)

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
- Shows CIF and Duty Paid options
- Uses new `shop_for_me_vehicle_rates` instead of shipping calculator rates

---

### Phase 5: Category Auto-Detection (TODO)

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

## Files Created/Modified

| Status | Action | File |
|--------|--------|------|
| ✅ | Create | `src/hooks/useShopForMeProductRates.ts` |
| ✅ | Create | `src/hooks/useShopForMeVehicleRates.ts` |
| ✅ | Create | `src/components/admin/ShopForMeProductRatesManagement.tsx` |
| ✅ | Create | `src/components/admin/ShopForMeVehicleRatesManagement.tsx` |
| ✅ | Modify | `src/pages/admin/Settings.tsx` - Restructured Shop For Me tab |
| ✅ | Modify | `src/hooks/settings/index.ts` - Added new exports |
| ✅ | Modify | `src/components/admin/settings/index.ts` - Added new exports |
| ⏳ | Modify | `src/components/home/ShopForMeSection.tsx` - Reduce to 2 main tabs |
| ⏳ | Modify | `src/components/shopping/ShoppingAggregator.tsx` - Category detection |
| ⏳ | Modify | `supabase/functions/fetch-product-info/index.ts` - Category detection |

---

## Database Tables

### shop_for_me_product_rates
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| region | agent_region | Region code (usa, uk, europe, dubai, china, india) |
| product_category | TEXT | Category (general, hazardous, cosmetics, electronics, spare_parts) |
| rate_per_kg | DECIMAL | Shipping rate per kilogram |
| handling_fee_percentage | DECIMAL | Handling fee as % of product + shipping |
| duty_percentage | DECIMAL | Import duty as % of product cost |
| markup_percentage | DECIMAL | Profit margin % |
| currency | TEXT | Currency code (default: USD) |
| is_active | BOOLEAN | Whether this rate is active |
| display_order | INTEGER | Display ordering |

### shop_for_me_vehicle_rates
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| region | agent_region | Region code |
| vehicle_type | TEXT | Type (motorcycle, sedan, suv, truck) |
| shipping_method | TEXT | Method (sea_roro, sea_container, air) |
| base_shipping_price | DECIMAL | Fixed shipping cost |
| handling_fee | DECIMAL | Fixed handling fee |
| duty_percentage | DECIMAL | Import duty as % of vehicle price |
| markup_percentage | DECIMAL | Profit margin % |
| currency | TEXT | Currency code (default: USD) |
| is_active | BOOLEAN | Whether this rate is active |
