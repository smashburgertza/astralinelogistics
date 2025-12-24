import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLog {
  id: string;
  action: string;
  table_name: string | null;
  record_id: string | null;
  user_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string | null;
  user_email?: string;
}

export function useAuditLogs(limit = 50) {
  return useQuery({
    queryKey: ['audit-logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Fetch user emails for the logs
      const userIds = [...new Set(data.filter(log => log.user_id).map(log => log.user_id))];
      
      let userEmails: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds as string[]);
        
        userEmails = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p.email;
          return acc;
        }, {} as Record<string, string>);
      }

      return data.map(log => ({
        ...log,
        user_email: log.user_id ? userEmails[log.user_id] : undefined,
      })) as AuditLog[];
    },
  });
}

export function formatAuditAction(log: AuditLog): string {
  const table = log.table_name || 'unknown';
  const action = log.action.toLowerCase();

  if (table === 'user_roles') {
    const newRole = log.new_data?.role as string;
    const oldRole = log.old_data?.role as string;
    
    if (action === 'insert') {
      return `Created ${newRole} role`;
    } else if (action === 'update') {
      if (oldRole !== newRole) {
        return `Changed role from ${oldRole} to ${newRole}`;
      }
      return 'Updated permissions';
    } else if (action === 'delete') {
      return `Removed ${oldRole} role`;
    }
  }
  
  if (table === 'profiles') {
    return 'Updated profile';
  }

  return `${action} on ${table}`;
}
