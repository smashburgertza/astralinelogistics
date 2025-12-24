import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export interface SettingsRecord {
  id: string;
  key: string;
  value: Record<string, unknown>;
  category: string;
  description: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export function useSettings(key: string) {
  return useQuery({
    queryKey: ['settings', key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('key', key)
        .maybeSingle();

      if (error) throw error;
      return data as SettingsRecord | null;
    },
  });
}

export function useAllSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .order('category');

      if (error) throw error;
      
      // Convert to a map for easy access
      const settingsMap: Record<string, Record<string, unknown>> = {};
      (data as SettingsRecord[]).forEach((setting) => {
        settingsMap[setting.key] = setting.value as Record<string, unknown>;
      });
      
      return settingsMap;
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: Record<string, unknown> }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('settings')
        .update({ 
          value: value as unknown as Json,
          updated_by: user?.id || null,
        })
        .eq('key', key)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['settings', variables.key] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save settings');
    },
  });
}
