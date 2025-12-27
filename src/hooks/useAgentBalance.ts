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
}

export function useAgentBalance() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['agent-balance', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Query invoices for this agent
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('amount, status, invoice_direction')
        .eq('agent_id', user.id);

      if (error) throw error;

      // Calculate balance summary manually since view might have RLS issues
      const summary: AgentBalanceSummary = {
        agent_id: user.id,
        agent_name: '',
        paid_to_agent: 0,
        pending_to_agent: 0,
        paid_from_agent: 0,
        pending_from_agent: 0,
        net_balance: 0,
      };

      invoices?.forEach((inv) => {
        const amount = inv.amount || 0;
        if (inv.invoice_direction === 'to_agent') {
          if (inv.status === 'paid') {
            summary.paid_to_agent += amount;
          } else if (inv.status === 'pending') {
            summary.pending_to_agent += amount;
          }
        } else if (inv.invoice_direction === 'from_agent') {
          if (inv.status === 'paid') {
            summary.paid_from_agent += amount;
          } else if (inv.status === 'pending') {
            summary.pending_from_agent += amount;
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
      // Get all agents with their invoices
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select(`
          amount, 
          status, 
          invoice_direction,
          agent_id
        `)
        .not('agent_id', 'is', null);

      if (error) throw error;

      // Get agent profiles
      const agentIds = [...new Set(invoices?.map(i => i.agent_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', agentIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      // Group by agent and calculate balances
      const balancesByAgent = new Map<string, AgentBalanceSummary>();

      invoices?.forEach((inv) => {
        if (!inv.agent_id) return;

        if (!balancesByAgent.has(inv.agent_id)) {
          balancesByAgent.set(inv.agent_id, {
            agent_id: inv.agent_id,
            agent_name: profileMap.get(inv.agent_id) || 'Unknown',
            paid_to_agent: 0,
            pending_to_agent: 0,
            paid_from_agent: 0,
            pending_from_agent: 0,
            net_balance: 0,
          });
        }

        const summary = balancesByAgent.get(inv.agent_id)!;
        const amount = inv.amount || 0;

        if (inv.invoice_direction === 'to_agent') {
          if (inv.status === 'paid') {
            summary.paid_to_agent += amount;
          } else if (inv.status === 'pending') {
            summary.pending_to_agent += amount;
          }
        } else if (inv.invoice_direction === 'from_agent') {
          if (inv.status === 'paid') {
            summary.paid_from_agent += amount;
          } else if (inv.status === 'pending') {
            summary.pending_from_agent += amount;
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
