import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Database } from '@/integrations/supabase/types';

type AgentRegion = Database['public']['Enums']['agent_region'];

interface AgentRegionInfo {
  region_code: AgentRegion;
  region_id: string | null;
  region_name?: string;
  flag_emoji?: string;
}

// Hook to fetch all regions assigned to the current agent
export function useAgentAssignedRegions() {
  const { user, roles } = useAuth();

  return useQuery({
    queryKey: ['agent-assigned-regions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // First check user_roles for region assignment
      const userRoleRegions = roles
        .filter(r => r.region)
        .map(r => r.region!);

      // Also check agent_regions table for multi-region assignments
      const { data: agentRegions, error } = await supabase
        .from('agent_regions')
        .select('region_code, region_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching agent regions:', error);
      }

      // Combine both sources
      const allRegionCodes = new Set<AgentRegion>([
        ...userRoleRegions,
        ...(agentRegions?.map(ar => ar.region_code as AgentRegion) || [])
      ]);

      // Fetch region details for all assigned regions
      const { data: regionsData } = await supabase
        .from('regions')
        .select('id, code, name, flag_emoji')
        .in('code', Array.from(allRegionCodes))
        .eq('is_active', true)
        .order('display_order');

      return regionsData?.map(r => ({
        region_code: r.code as AgentRegion,
        region_id: r.id,
        region_name: r.name,
        flag_emoji: r.flag_emoji,
      })) || [];
    },
    enabled: !!user?.id,
  });
}
