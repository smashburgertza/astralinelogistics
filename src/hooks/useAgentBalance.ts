import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface AgentBalanceSummary {
  agent_id: string;
  agent_name: string;
  paid_to_agent: number;
  pending_to_agent: number;
  paid_from_agent: number;
  pending_from_agent: number;
  net_balance: number;
  base_currency: string;
}

export function useAgentBalance() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['agent-balance', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Fetch invoices and agent settings in parallel
      const [invoicesResult, settingsResult, ratesResult] = await Promise.all([
        supabase
          .from('invoices')
          .select('amount, currency, status, invoice_direction')
          .eq('agent_id', user.id),
        supabase
          .from('agent_settings')
          .select('base_currency')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('currency_exchange_rates')
          .select('currency_code, rate_to_tzs'),
      ]);

      if (invoicesResult.error) throw invoicesResult.error;
      
      const invoices = invoicesResult.data || [];
      const baseCurrency = (settingsResult.data as any)?.base_currency || 'USD';
      const exchangeRates = ratesResult.data || [];
      
      // Build rate map (currency -> rate to TZS)
      const rateMap = new Map<string, number>();
      rateMap.set('TZS', 1);
      exchangeRates.forEach(r => rateMap.set(r.currency_code, r.rate_to_tzs));
      
      // Get base currency rate
      const baseCurrencyRate = rateMap.get(baseCurrency) || 1;

      // Calculate balance summary with currency conversion
      const summary: AgentBalanceSummary = {
        agent_id: user.id,
        agent_name: '',
        paid_to_agent: 0,
        pending_to_agent: 0,
        paid_from_agent: 0,
        pending_from_agent: 0,
        net_balance: 0,
        base_currency: baseCurrency,
      };

      invoices.forEach((inv) => {
        const invoiceCurrency = inv.currency || 'USD';
        const invoiceCurrencyRate = rateMap.get(invoiceCurrency) || 1;
        
        // Convert amount to TZS first, then to base currency
        const amountInTZS = (inv.amount || 0) * invoiceCurrencyRate;
        const amountInBaseCurrency = baseCurrencyRate > 0 ? amountInTZS / baseCurrencyRate : amountInTZS;
        
        if (inv.invoice_direction === 'to_agent') {
          if (inv.status === 'paid') {
            summary.paid_to_agent += amountInBaseCurrency;
          } else if (inv.status === 'pending') {
            summary.pending_to_agent += amountInBaseCurrency;
          }
        } else if (inv.invoice_direction === 'from_agent') {
          if (inv.status === 'paid') {
            summary.paid_from_agent += amountInBaseCurrency;
          } else if (inv.status === 'pending') {
            summary.pending_from_agent += amountInBaseCurrency;
          }
        }
      });

      // Calculate net: positive = agent owes Astraline, negative = Astraline owes agent
      const totalFromAgent = summary.paid_from_agent + summary.pending_from_agent;
      const totalToAgent = summary.paid_to_agent + summary.pending_to_agent;
      summary.net_balance = totalFromAgent - totalToAgent;

      return summary;
    },
    enabled: !!user?.id,
  });
}

export function useAllAgentBalances() {
  return useQuery({
    queryKey: ['all-agent-balances'],
    queryFn: async () => {
      // Get all agents with their invoices, settings, and exchange rates in parallel
      const [invoicesResult, settingsResult, profilesResult, ratesResult] = await Promise.all([
        supabase
          .from('invoices')
          .select(`
            amount, 
            currency,
            status, 
            invoice_direction,
            agent_id
          `)
          .not('agent_id', 'is', null),
        supabase
          .from('agent_settings')
          .select('user_id, base_currency'),
        supabase
          .from('profiles')
          .select('id, full_name'),
        supabase
          .from('currency_exchange_rates')
          .select('currency_code, rate_to_tzs'),
      ]);

      if (invoicesResult.error) throw invoicesResult.error;
      
      const invoices = invoicesResult.data || [];
      const settingsData = settingsResult.data || [];
      const profiles = profilesResult.data || [];
      const exchangeRates = ratesResult.data || [];

      // Build maps
      const profileMap = new Map(profiles.map(p => [p.id, p.full_name]));
      const settingsMap = new Map(settingsData.map((s: any) => [s.user_id, s.base_currency || 'USD']));
      
      // Build rate map (currency -> rate to TZS)
      const rateMap = new Map<string, number>();
      rateMap.set('TZS', 1);
      exchangeRates.forEach(r => rateMap.set(r.currency_code, r.rate_to_tzs));

      // Group by agent and calculate balances
      const balancesByAgent = new Map<string, AgentBalanceSummary>();

      invoices.forEach((inv) => {
        if (!inv.agent_id) return;
        
        const baseCurrency = settingsMap.get(inv.agent_id) || 'USD';
        const baseCurrencyRate = rateMap.get(baseCurrency) || 1;
        const invoiceCurrency = inv.currency || 'USD';
        const invoiceCurrencyRate = rateMap.get(invoiceCurrency) || 1;
        
        // Convert amount to TZS first, then to base currency
        const amountInTZS = (inv.amount || 0) * invoiceCurrencyRate;
        const amountInBaseCurrency = baseCurrencyRate > 0 ? amountInTZS / baseCurrencyRate : amountInTZS;

        if (!balancesByAgent.has(inv.agent_id)) {
          balancesByAgent.set(inv.agent_id, {
            agent_id: inv.agent_id,
            agent_name: profileMap.get(inv.agent_id) || 'Unknown',
            paid_to_agent: 0,
            pending_to_agent: 0,
            paid_from_agent: 0,
            pending_from_agent: 0,
            net_balance: 0,
            base_currency: baseCurrency,
          });
        }

        const summary = balancesByAgent.get(inv.agent_id)!;

        if (inv.invoice_direction === 'to_agent') {
          if (inv.status === 'paid') {
            summary.paid_to_agent += amountInBaseCurrency;
          } else if (inv.status === 'pending') {
            summary.pending_to_agent += amountInBaseCurrency;
          }
        } else if (inv.invoice_direction === 'from_agent') {
          if (inv.status === 'paid') {
            summary.paid_from_agent += amountInBaseCurrency;
          } else if (inv.status === 'pending') {
            summary.pending_from_agent += amountInBaseCurrency;
          }
        }
      });

      // Calculate net balances
      balancesByAgent.forEach((summary) => {
        const totalFromAgent = summary.paid_from_agent + summary.pending_from_agent;
        const totalToAgent = summary.paid_to_agent + summary.pending_to_agent;
        summary.net_balance = totalFromAgent - totalToAgent;
      });

      return Array.from(balancesByAgent.values());
    },
  });
}
