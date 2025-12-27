import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AgentSettings {
  can_have_consolidated_cargo: boolean;
}

interface AgentRegionInfo {
  region_code: string;
  region_name: string;
  flag_emoji: string | null;
}

interface AgentFullSettings {
  settings: AgentSettings | null;
  regions: AgentRegionInfo[];
}

export function useAgentFullConfig() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['agent-full-config', user?.id],
    queryFn: async (): Promise<AgentFullSettings> => {
      if (!user?.id) {
        return { settings: null, regions: [] };
      }

      // Fetch agent settings
      const { data: settingsData } = await supabase
        .from('agent_settings')
        .select('can_have_consolidated_cargo')
        .eq('user_id', user.id)
        .maybeSingle();

      // Fetch agent regions with region details
      const { data: regionsData } = await supabase
        .from('agent_regions')
        .select(`
          region_code,
          regions:region_id (
            name,
            flag_emoji
          )
        `)
        .eq('user_id', user.id);

      const regions: AgentRegionInfo[] = (regionsData || []).map((r: any) => ({
        region_code: r.region_code,
        region_name: r.regions?.name || r.region_code,
        flag_emoji: r.regions?.flag_emoji || null,
      }));

      return {
        settings: settingsData ? {
          can_have_consolidated_cargo: settingsData.can_have_consolidated_cargo,
        } : null,
        regions,
      };
    },
    enabled: !!user?.id,
  });
}
