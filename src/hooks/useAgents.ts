import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Region } from '@/lib/constants';

export interface Agent {
  id: string;
  user_id: string;
  role: 'agent';
  region: Region | null;
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

      // Get profiles for these users
      const userIds = agentRoles.map(r => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combine the data
      const agents: Agent[] = agentRoles.map(role => ({
        id: role.id,
        user_id: role.user_id,
        role: 'agent' as const,
        region: role.region,
        created_at: role.created_at || '',
        profile: profiles?.find(p => p.id === role.user_id) || null,
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
      region 
    }: { 
      email: string; 
      password: string; 
      fullName: string;
      phone?: string;
      region: Region;
    }) => {
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

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      const userId = authData.user.id;

      // Update the profile with phone if provided
      if (phone) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ phone, full_name: fullName })
          .eq('id', userId);

        if (profileError) console.error('Failed to update profile:', profileError);
      }

      // Update the user_roles to set role as agent with region
      // The default role 'customer' was created by the trigger, so we update it
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ 
          role: 'agent',
          region: region,
        })
        .eq('user_id', userId);

      if (roleError) throw roleError;

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

export function useUpdateAgentRegion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      region 
    }: { 
      userId: string; 
      region: Region;
    }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ region })
        .eq('user_id', userId)
        .eq('role', 'agent');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast.success('Agent region updated');
    },
    onError: (error: any) => {
      toast.error(`Failed to update agent: ${error.message}`);
    },
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      // We can't delete the auth user from client-side
      // Instead, we'll change their role back to customer
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
