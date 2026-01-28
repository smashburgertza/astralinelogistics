
# Performance Optimization Plan for Admin Pages

## Summary

The admin pages are slow due to excessive database queries, lack of caching, and inefficient data fetching strategies. This plan optimizes data loading to significantly improve page load times.

## Root Causes Identified

| Issue | Impact | Location |
|-------|--------|----------|
| 8 count queries on every page | ~500-800ms overhead | `useSidebarCounts.ts` |
| Dashboard fetches ALL records | 2-5 seconds on large datasets | `Dashboard.tsx` |
| Realtime subscriptions to 10 tables | Connection overhead | `useRealtimeSync.ts` |
| Duplicate expense queries | 3x data fetching | `Expenses.tsx` |
| No staleTime on queries | Constant refetching | Various hooks |

## Optimization Strategy

### 1. Optimize Sidebar Counts Hook

**Current Problem**: 8 separate count queries run on every admin page navigation

**Solution**: 
- Increase `staleTime` to 2 minutes (data doesn't need to be real-time)
- Keep `refetchInterval` at 60 seconds for background updates
- Add `refetchOnWindowFocus: false` to prevent refetches when switching tabs

```typescript
// useSidebarCounts.ts
return useQuery({
  queryKey: ["sidebar-counts"],
  queryFn: async () => { ... },
  refetchInterval: 60000,
  staleTime: 120000,  // 2 minutes - data is fresh for longer
  refetchOnWindowFocus: false,  // Don't refetch on tab switch
});
```

### 2. Optimize Dashboard Stats Loading

**Current Problem**: Fetches ALL records from 6 tables just to calculate counts and sums

**Solution**: Use database-level aggregation with indexed queries

```typescript
// Instead of fetching all records and calculating in JS:
const [shipmentsCount, thisMonthCount, revenueSum, ...] = await Promise.all([
  // Use count queries instead of fetching all data
  supabase.from('shipments').select('*', { count: 'exact', head: true }),
  supabase.from('shipments').select('*', { count: 'exact', head: true })
    .gte('created_at', thisMonthStart),
  
  // For revenue: fetch only aggregated data or use a view
  supabase.from('invoices')
    .select('amount_in_tzs')
    .eq('status', 'paid'),
  ...
]);
```

**Additional optimization**: Cache dashboard stats with longer staleTime since they're summary data

### 3. Add Proper Caching to All Admin Hooks

**Files to update** with increased `staleTime`:

| Hook | Current staleTime | Recommended |
|------|-------------------|-------------|
| `useAllExpenses` | 0 (default) | 30 seconds |
| `usePendingExpenses` | 0 (default) | 30 seconds |
| `useExpenseStats` | 0 (default) | 60 seconds |
| `useBankAccounts` | 0 (default) | 60 seconds |
| `useRegions` | 0 (default) | 5 minutes |
| `useExchangeRates` | 0 (default) | 5 minutes |

### 4. Eliminate Redundant Expense Queries

**Current Problem**: `Expenses.tsx` makes 4 separate queries including 2 that fetch the same data

**Solution**: Consolidate into a single query with proper filtering in the component

```typescript
// Single query, filter in component
const { data: allExpenses } = useAllExpenses();
const pendingExpenses = useMemo(() => 
  allExpenses?.filter(e => e.status === 'pending' || e.status === 'needs_clarification'),
  [allExpenses]
);
```

### 5. Lazy Load Realtime Subscriptions

**Current Problem**: `useRealtimeSync` subscribes to 10 tables at app start

**Solution**: 
- Move realtime sync to be conditional (only on admin routes)
- Consider disabling for tables that don't need real-time updates

```typescript
// Only enable realtime sync on admin routes
export function useRealtimeSync(enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    // ... subscription logic
  }, [queryClient, enabled]);
}
```

### 6. Add Pagination to Data Tables

For pages that display large lists (shipments, invoices, expenses), implement server-side pagination:

```typescript
// useAllExpenses with pagination
export function useAllExpenses(filters?: { page?: number; pageSize?: number; ... }) {
  const page = filters?.page ?? 0;
  const pageSize = filters?.pageSize ?? 50;
  
  return useQuery({
    queryKey: ['expenses', filters],
    queryFn: async () => {
      let query = supabase
        .from('expenses')
        .select('*, shipments(tracking_number)', { count: 'exact' })
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .order('created_at', { ascending: false });
      // ... filters
    },
    staleTime: 30000,
  });
}
```

## Implementation Priority

### Phase 1 - Quick Wins (Immediate Impact)
1. Add `staleTime` and `refetchOnWindowFocus: false` to sidebar counts
2. Add caching to frequently-used hooks (regions, exchange rates)
3. Fix duplicate expense queries

### Phase 2 - Medium Effort
4. Optimize Dashboard stats to use count queries instead of fetching all records
5. Add staleTime to all expense-related hooks

### Phase 3 - Larger Refactoring
6. Implement server-side pagination for data tables
7. Optimize realtime subscriptions to be route-specific

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useSidebarCounts.ts` | Add staleTime, refetchOnWindowFocus |
| `src/hooks/useExpenses.ts` | Add staleTime to all queries |
| `src/hooks/useExchangeRates.ts` | Add staleTime (5 min) |
| `src/hooks/useRegions.ts` | Add staleTime (5 min) |
| `src/hooks/useAccounting.ts` | Add staleTime to bank accounts |
| `src/pages/admin/Dashboard.tsx` | Replace full fetches with count queries |
| `src/pages/admin/Expenses.tsx` | Remove redundant usePendingExpenses call |
| `src/hooks/useRealtimeSync.ts` | Add enabled parameter |

## Expected Results

- **Page load time**: Reduce from 3-5 seconds to under 1 second
- **Network requests**: Reduce from 638 to approximately 50-100 on initial load
- **Subsequent navigations**: Near-instant due to caching
- **Real-time updates**: Still functional but optimized

## Technical Notes

- All changes are backward compatible
- No database schema changes required
- React Query handles cache invalidation automatically on mutations
- StaleTime doesn't prevent background updates, only immediate refetches
