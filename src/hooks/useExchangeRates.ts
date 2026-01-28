import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ExchangeRate {
  id: string;
  currency_code: string;
  currency_name: string;
  rate_to_tzs: number;
  updated_at: string | null;
  updated_by: string | null;
}

export function useExchangeRates() {
  return useQuery({
    queryKey: ['exchange-rates'],
    staleTime: 5 * 60 * 1000, // 5 minutes - exchange rates don't change often
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('currency_exchange_rates')
        .select('*')
        .order('currency_code');

      if (error) throw error;
      return data as ExchangeRate[];
    },
  });
}

export function useExchangeRate(currencyCode: string | undefined) {
  const { data: rates } = useExchangeRates();
  return rates?.find(r => r.currency_code === currencyCode);
}

export function useUpdateExchangeRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, rate_to_tzs }: { id: string; rate_to_tzs: number }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('currency_exchange_rates')
        .update({
          rate_to_tzs,
          updated_at: new Date().toISOString(),
          updated_by: userData.user?.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
      toast.success('Exchange rate updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update rate: ' + error.message);
    },
  });
}

export function useCreateExchangeRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rate: { currency_code: string; currency_name: string; rate_to_tzs: number }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('currency_exchange_rates')
        .insert({
          ...rate,
          updated_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
      toast.success('Currency added');
    },
    onError: (error: Error) => {
      toast.error('Failed to add currency: ' + error.message);
    },
  });
}

export function useDeleteExchangeRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('currency_exchange_rates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
      toast.success('Currency removed');
    },
    onError: (error: Error) => {
      toast.error('Failed to remove currency: ' + error.message);
    },
  });
}

// Default fallback rates if database is empty
const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  USD: 2500,
  GBP: 3150,
  EUR: 2700,
  AED: 680,
  JPY: 17,
  CNY: 345,
  INR: 30,
  TZS: 1,
};

// Hook that returns exchange rates as a map for easy lookup
export function useExchangeRatesMap() {
  const { data: rates, isLoading, error } = useExchangeRates();

  // Convert array to map for easy lookup
  const ratesMap: Record<string, number> = rates?.reduce((acc, rate) => {
    acc[rate.currency_code] = rate.rate_to_tzs;
    return acc;
  }, {} as Record<string, number>) || {};

  // Merge with defaults (database values take priority)
  const mergedRates = { ...DEFAULT_EXCHANGE_RATES, ...ratesMap };

  return {
    rates: mergedRates,
    isLoading,
    error,
    getRate: (currencyCode: string): number => {
      return mergedRates[currencyCode] || 1;
    },
  };
}

// Helper to convert amount to TZS
export function convertToTZS(amount: number, currencyCode: string, rates: ExchangeRate[]): number {
  if (currencyCode === 'TZS') return amount;
  const rate = rates.find(r => r.currency_code === currencyCode);
  if (!rate) return amount;
  return amount * rate.rate_to_tzs;
}

// Helper to convert TZS to another currency
export function convertFromTZS(amountTZS: number, currencyCode: string, rates: ExchangeRate[]): number {
  if (currencyCode === 'TZS') return amountTZS;
  const rate = rates.find(r => r.currency_code === currencyCode);
  if (!rate) return amountTZS;
  return amountTZS / rate.rate_to_tzs;
}
