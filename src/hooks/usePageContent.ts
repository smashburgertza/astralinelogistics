import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PageContent {
  id: string;
  section_key: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  content: Record<string, any>;
  is_visible: boolean;
  updated_at: string;
  updated_by: string | null;
}

export function usePageContent(sectionKey?: string) {
  return useQuery({
    queryKey: ['page-content', sectionKey],
    queryFn: async () => {
      if (sectionKey) {
        const { data, error } = await supabase
          .from('page_content')
          .select('*')
          .eq('section_key', sectionKey)
          .single();
        if (error) throw error;
        return data as PageContent;
      } else {
        const { data, error } = await supabase
          .from('page_content')
          .select('*')
          .order('section_key');
        if (error) throw error;
        return data as PageContent[];
      }
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useUpdatePageContent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      sectionKey, 
      updates 
    }: { 
      sectionKey: string; 
      updates: Partial<Omit<PageContent, 'id' | 'section_key' | 'updated_at' | 'updated_by'>> 
    }) => {
      const { data, error } = await supabase
        .from('page_content')
        .update(updates)
        .eq('section_key', sectionKey)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { sectionKey }) => {
      queryClient.invalidateQueries({ queryKey: ['page-content'] });
      toast.success('Content updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update content: ' + error.message);
    },
  });
}
