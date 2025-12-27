import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AgentRegion {
  id: string;
  region_code: string;
  region_id: string | null;
}

export interface Agent {
  id: string;
  user_id: string;
  role: 'agent';
  region: string | null; // Legacy single region (for backward compatibility)
  regions: AgentRegion[]; // New: multiple regions
  created_at: string;
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
  } | null;
}

export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      // Get all users with agent role
      const { data: agentRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('role', 'agent');

      if (rolesError) throw rolesError;

      if (!agentRoles?.length) return [];

      const userIds = agentRoles.map(r => r.user_id);

      // Get profiles and agent_regions in parallel
      const [profilesResult, regionsResult] = await Promise.all([
        supabase.from('profiles').select('*').in('id', userIds),
        supabase.from('agent_regions').select('*').in('user_id', userIds),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (regionsResult.error) throw regionsResult.error;

      const profiles = profilesResult.data || [];
      const agentRegions = regionsResult.data || [];

      // Combine the data
      const agents: Agent[] = agentRoles.map(role => ({
        id: role.id,
        user_id: role.user_id,
        role: 'agent' as const,
        region: role.region, // Legacy
        regions: agentRegions
          .filter(ar => ar.user_id === role.user_id)
          .map(ar => ({
            id: ar.id,
            region_code: ar.region_code,
            region_id: ar.region_id,
          })),
        created_at: role.created_at || '',
        profile: profiles.find(p => p.id === role.user_id) || null,
      }));

      return agents;
    },
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      email, 
      password, 
      fullName, 
      phone,
      regions 
    }: { 
      email: string; 
      password: string; 
      fullName: string;
      phone?: string;
      regions: string[]; // Array of region codes
    }) => {
      // Store current admin session before creating new user
      const { data: currentSession } = await supabase.auth.getSession();
      const adminSession = currentSession.session;

      // First, create the user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) {
        // Restore admin session if signup failed
        if (adminSession) {
          await supabase.auth.setSession(adminSession);
        }
        throw authError;
      }
      if (!authData.user) {
        if (adminSession) {
          await supabase.auth.setSession(adminSession);
        }
        throw new Error('Failed to create user');
      }

      const userId = authData.user.id;

      // Restore admin session and wait for it to be ready
      if (adminSession) {
        await supabase.auth.setSession(adminSession);
        // Small delay to ensure session is propagated
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Update the profile with phone if provided
      if (phone) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ phone, full_name: fullName })
          .eq('id', userId);

        if (profileError) console.error('Failed to update profile:', profileError);
      }

      // Update the user_roles to set role as agent
      // Set the first region for backward compatibility
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ 
          role: 'agent',
          region: regions[0] as any, // First region for legacy support
        })
        .eq('user_id', userId);

      if (roleError) {
        console.error('Failed to update role:', roleError);
        throw roleError;
      }

      // Insert all regions into agent_regions
      if (regions.length > 0) {
        const regionInserts = regions.map(regionCode => ({
          user_id: userId,
          region_code: regionCode,
        }));

        const { error: regionsError } = await supabase
          .from('agent_regions')
          .insert(regionInserts);

        if (regionsError) {
          console.error('Failed to insert regions:', regionsError);
          throw regionsError;
        }
      }

      return { userId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast.success('Agent created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create agent: ${error.message}`);
    },
  });
}

export function useUpdateAgentRegions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      regions 
    }: { 
      userId: string; 
      regions: string[]; // Array of region codes
    }) => {
      // Delete existing agent_regions for this user
      const { error: deleteError } = await supabase
        .from('agent_regions')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Insert new regions
      if (regions.length > 0) {
        const regionInserts = regions.map(regionCode => ({
          user_id: userId,
          region_code: regionCode,
        }));

        const { error: insertError } = await supabase
          .from('agent_regions')
          .insert(regionInserts);

        if (insertError) throw insertError;
      }

      // Update legacy region field in user_roles
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ region: regions[0] as any || null })
        .eq('user_id', userId)
        .eq('role', 'agent');

      if (roleError) throw roleError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast.success('Agent regions updated');
    },
    onError: (error: any) => {
      toast.error(`Failed to update agent regions: ${error.message}`);
    },
  });
}

// Keep the old hook for backward compatibility
export function useUpdateAgentRegion() {
  const updateAgentRegions = useUpdateAgentRegions();

  return useMutation({
    mutationFn: async ({ userId, region }: { userId: string; region: string }) => {
      return updateAgentRegions.mutateAsync({ userId, regions: [region] });
    },
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      // Delete agent_regions first
      await supabase
        .from('agent_regions')
        .delete()
        .eq('user_id', userId);

      // Change their role back to customer
      const { error } = await supabase
        .from('user_roles')
        .update({ role: 'customer', region: null })
        .eq('user_id', userId)
        .eq('role', 'agent');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast.success('Agent removed');
    },
    onError: (error: any) => {
      toast.error(`Failed to remove agent: ${error.message}`);
    },
  });
}
