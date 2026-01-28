import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AgentRegion {
  id: string;
  region_code: string;
  region_id: string | null;
}

export interface AgentSettings {
  can_have_consolidated_cargo: boolean;
  base_currency: string;
}

export interface Agent {
  id: string;
  user_id: string;
  role: 'agent';
  region: string | null; // Legacy single region (for backward compatibility)
  regions: AgentRegion[]; // New: multiple regions
  settings: AgentSettings | null;
  created_at: string;
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
    company_name: string | null;
    company_address: string | null;
    contact_person_name: string | null;
    contact_person_email: string | null;
    contact_person_phone: string | null;
    agent_code: string | null;
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

      // Get profiles, agent_regions, and agent_settings in parallel
      const [profilesResult, regionsResult, settingsResult] = await Promise.all([
        supabase.from('profiles').select('*').in('id', userIds),
        supabase.from('agent_regions').select('*').in('user_id', userIds),
        supabase.from('agent_settings').select('*').in('user_id', userIds),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (regionsResult.error) throw regionsResult.error;
      // Settings error is non-fatal - some agents may not have settings yet

      const profiles = profilesResult.data || [];
      const agentRegions = regionsResult.data || [];
      const agentSettings = settingsResult.data || [];

      // Combine the data
      const agents: Agent[] = agentRoles.map(role => {
        const settings = agentSettings.find(s => s.user_id === role.user_id);
        return {
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
          settings: settings ? {
            can_have_consolidated_cargo: settings.can_have_consolidated_cargo,
            base_currency: settings.base_currency || 'USD',
          } : null,
          created_at: role.created_at || '',
          profile: profiles.find(p => p.id === role.user_id) || null,
        };
      });

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
      companyName,
      companyAddress,
      contactPersonName,
      contactPersonEmail,
      contactPersonPhone,
      regions,
      canHaveConsolidatedCargo = false,
    }: { 
      email: string; 
      password: string; 
      companyName: string;
      companyAddress?: string;
      contactPersonName: string;
      contactPersonEmail: string;
      contactPersonPhone?: string;
      regions: string[]; // Array of region codes
      canHaveConsolidatedCargo?: boolean;
    }) => {
      // Store current admin session tokens before creating new user
      const { data: currentSession } = await supabase.auth.getSession();
      const adminAccessToken = currentSession.session?.access_token;
      const adminRefreshToken = currentSession.session?.refresh_token;

      if (!adminAccessToken || !adminRefreshToken) {
        throw new Error('Admin session not found');
      }

      // Create the user via Supabase Auth - this will automatically log in the new user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: contactPersonName,
          },
        },
      });

      if (authError) {
        // Restore admin session if signup failed
        await supabase.auth.setSession({
          access_token: adminAccessToken,
          refresh_token: adminRefreshToken,
        });
        throw authError;
      }
      if (!authData.user) {
        await supabase.auth.setSession({
          access_token: adminAccessToken,
          refresh_token: adminRefreshToken,
        });
        throw new Error('Failed to create user');
      }

      const userId = authData.user.id;

      // Immediately restore admin session
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: adminAccessToken,
        refresh_token: adminRefreshToken,
      });

      if (sessionError) {
        console.error('Failed to restore admin session:', sessionError);
        window.location.reload();
        throw new Error('Session restoration failed. Please try again.');
      }

      // Wait for session to be fully restored
      await new Promise(resolve => setTimeout(resolve, 300));

      // Generate agent code
      const { data: agentCodeResult } = await supabase
        .rpc('generate_agent_code');
      
      const agentCode = agentCodeResult || `AG${Date.now()}`;

      // Update the profile with company and contact info
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          full_name: contactPersonName,
          phone: contactPersonPhone,
          company_name: companyName,
          company_address: companyAddress,
          contact_person_name: contactPersonName,
          contact_person_email: contactPersonEmail,
          contact_person_phone: contactPersonPhone,
          agent_code: agentCode,
        })
        .eq('id', userId);

      if (profileError) console.error('Failed to update profile:', profileError);

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

      // Create agent settings
      const { error: settingsError } = await supabase
        .from('agent_settings')
        .insert({
          user_id: userId,
          can_have_consolidated_cargo: canHaveConsolidatedCargo,
        });

      if (settingsError) {
        console.error('Failed to create agent settings:', settingsError);
        // Don't throw - settings can be added later
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

export function useBulkDeleteAgents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userIds: string[]) => {
      // Delete agent_regions first
      await supabase
        .from('agent_regions')
        .delete()
        .in('user_id', userIds);

      // Change their roles back to customer
      const { error } = await supabase
        .from('user_roles')
        .update({ role: 'customer', region: null })
        .in('user_id', userIds)
        .eq('role', 'agent');

      if (error) throw error;
      return { count: userIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast.success(`${data.count} agent(s) removed successfully`);
    },
    onError: (error: any) => {
      toast.error(`Failed to remove agents: ${error.message}`);
    },
  });
}

// Hook for agents to check their own settings
export function useAgentSettings() {
  return useQuery({
    queryKey: ['agent-settings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('agent_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch agent settings:', error);
        return null;
      }

      return data;
    },
  });
}

// Hook to update agent settings (admin only)
export function useUpdateAgentSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      canHaveConsolidatedCargo,
      baseCurrency,
    }: {
      userId: string;
      canHaveConsolidatedCargo?: boolean;
      baseCurrency?: string;
    }) => {
      // Build update object
      const updateData: Record<string, any> = {
        user_id: userId,
        updated_at: new Date().toISOString(),
      };
      
      if (canHaveConsolidatedCargo !== undefined) {
        updateData.can_have_consolidated_cargo = canHaveConsolidatedCargo;
      }
      if (baseCurrency !== undefined) {
        updateData.base_currency = baseCurrency;
      }

      // Upsert the settings
      const { error } = await supabase
        .from('agent_settings')
        .upsert(updateData as any, {
          onConflict: 'user_id',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agent-settings'] });
      queryClient.invalidateQueries({ queryKey: ['agent-full-config'] });
      queryClient.invalidateQueries({ queryKey: ['agent-balance'] });
      toast.success('Agent settings updated');
    },
    onError: (error: any) => {
      toast.error(`Failed to update settings: ${error.message}`);
    },
  });
}
