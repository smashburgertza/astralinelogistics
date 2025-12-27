import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Tables that affect the public site and should trigger real-time updates
const PUBLIC_TABLES = [
  { table: 'regions', queryKeys: [['regions'], ['regions', 'active']] },
  { table: 'region_pricing', queryKeys: [['region_pricing']] },
  { table: 'agent_addresses', queryKeys: [['agent_addresses']] },
  { table: 'container_pricing', queryKeys: [['container-pricing']] },
  { table: 'vehicle_pricing', queryKeys: [['vehicle-pricing']] },
  { table: 'page_content', queryKeys: [['page-content']] },
  { table: 'shop_for_me_charges', queryKeys: [['shop-for-me-charges']] },
  { table: 'shipping_calculator_charges', queryKeys: [['shipping-calculator-charges']] },
] as const;

/**
 * Hook that subscribes to real-time database changes and invalidates
 * React Query cache to keep the UI in sync across all tabs/users.
 * 
 * Use this hook at the app root level to enable real-time sync.
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Create a single channel for all public table subscriptions
    const channel = supabase
      .channel('public-site-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'regions' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['regions'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'region_pricing' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['region_pricing'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agent_addresses' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['agent_addresses'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'container_pricing' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['container-pricing'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicle_pricing' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['vehicle-pricing'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'page_content' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['page-content'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shop_for_me_charges' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['shop-for-me-charges'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shipping_calculator_charges' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['shipping-calculator-charges'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'region_delivery_times' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['region_delivery_times'] });
        }
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/**
 * Hook for subscribing to a specific table's real-time changes.
 * Useful when you only need updates for a specific feature.
 */
export function useRealtimeTable(
  tableName: string,
  queryKeys: string[][],
  enabled = true
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel(`realtime-${tableName}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        () => {
          queryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName, queryKeys, enabled, queryClient]);
}
