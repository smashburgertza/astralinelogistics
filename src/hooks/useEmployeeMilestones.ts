import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Milestone {
  type: 'invoices' | 'estimates' | 'shipments' | 'revenue';
  value: number;
  label: string;
  icon: string;
}

export const MILESTONES: Milestone[] = [
  // Invoice milestones
  { type: 'invoices', value: 10, label: '10 Invoices Created', icon: '📝' },
  { type: 'invoices', value: 25, label: '25 Invoices Created', icon: '📝' },
  { type: 'invoices', value: 50, label: '50 Invoices Created', icon: '📝' },
  { type: 'invoices', value: 100, label: '100 Invoices Created', icon: '🎯' },
  
  // Estimate milestones
  { type: 'estimates', value: 10, label: '10 Estimates Created', icon: '📋' },
  { type: 'estimates', value: 25, label: '25 Estimates Created', icon: '📋' },
  { type: 'estimates', value: 50, label: '50 Estimates Created', icon: '📋' },
  { type: 'estimates', value: 100, label: '100 Estimates Created', icon: '🎯' },
  
  // Shipment milestones
  { type: 'shipments', value: 10, label: '10 Shipments Handled', icon: '📦' },
  { type: 'shipments', value: 25, label: '25 Shipments Handled', icon: '📦' },
  { type: 'shipments', value: 50, label: '50 Shipments Handled', icon: '📦' },
  { type: 'shipments', value: 100, label: '100 Shipments Handled', icon: '🚀' },
  
  // Revenue milestones (in TZS)
  { type: 'revenue', value: 1000000, label: '1M TZS Revenue Generated', icon: '💰' },
  { type: 'revenue', value: 5000000, label: '5M TZS Revenue Generated', icon: '💰' },
  { type: 'revenue', value: 10000000, label: '10M TZS Revenue Generated', icon: '💎' },
  { type: 'revenue', value: 50000000, label: '50M TZS Revenue Generated', icon: '🏆' },
  { type: 'revenue', value: 100000000, label: '100M TZS Revenue Generated', icon: '👑' },
];

interface EmployeeMetrics {
  invoices: number;
  estimates: number;
  shipments: number;
  revenue: number;
}

export function useEmployeeMilestones(employeeId?: string) {
  const queryClient = useQueryClient();

  // Fetch achieved milestones
  const { data: achievedMilestones = [], isLoading } = useQuery({
    queryKey: ['employee-milestones', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      
      const { data, error } = await supabase
        .from('employee_milestones')
        .select('*')
        .eq('employee_id', employeeId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!employeeId,
  });

  // Check for new milestones
  const checkMilestones = useMutation({
    mutationFn: async ({ 
      employeeId, 
      employeeName,
      metrics 
    }: { 
      employeeId: string; 
      employeeName: string;
      metrics: EmployeeMetrics;
    }) => {
      const newMilestones: Milestone[] = [];

      // Check each milestone type
      for (const milestone of MILESTONES) {
        const achieved = achievedMilestones?.some(
          m => m.milestone_type === milestone.type && m.milestone_value === String(milestone.value)
        );

        if (achieved) continue;

        let currentValue = 0;
        switch (milestone.type) {
          case 'invoices':
            currentValue = metrics.invoices;
            break;
          case 'estimates':
            currentValue = metrics.estimates;
            break;
          case 'shipments':
            currentValue = metrics.shipments;
            break;
          case 'revenue':
            currentValue = metrics.revenue;
            break;
        }

        if (currentValue >= milestone.value) {
          newMilestones.push(milestone);
        }
      }

      if (newMilestones.length === 0) return [];

      // Record milestones and create notifications
      for (const milestone of newMilestones) {
        // Insert milestone record
        const { error: milestoneError } = await supabase
          .from('employee_milestones')
          .insert({
            employee_id: employeeId,
            milestone_type: milestone.type,
            milestone_value: String(milestone.value),
            notified_at: new Date().toISOString(),
          });

        if (milestoneError) {
          console.error('Error recording milestone:', milestoneError);
          continue;
        }

        // Create notification for the employee
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: employeeId,
            title: `${milestone.icon} Milestone Achieved!`,
            message: `Congratulations! You've reached ${milestone.label}.`,
            type: 'milestone',
          });

        if (notifError) {
          console.error('Error creating notification:', notifError);
        }
      }

      return newMilestones;
    },
    onSuccess: (newMilestones) => {
      if (newMilestones.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['employee-milestones'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    },
  });

  return {
    achievedMilestones,
    isLoading,
    checkMilestones: checkMilestones.mutate,
    isChecking: checkMilestones.isPending,
  };
}

// Hook to check milestones for all employees
export function useCheckAllEmployeeMilestones() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Fetch all employees
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, employee_role')
        .in('role', ['employee', 'super_admin']);

      if (rolesError) throw rolesError;

      const userIds = userRoles?.map(r => r.user_id) || [];
      if (userIds.length === 0) return { checked: 0, newMilestones: 0 };

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      // Fetch existing milestones
      const { data: existingMilestones } = await supabase
        .from('employee_milestones')
        .select('employee_id, milestone_type, milestone_value')
        .in('employee_id', userIds);

      const milestoneSet = new Set(
        existingMilestones?.map(m => `${m.employee_id}-${m.milestone_type}-${m.milestone_value}`) || []
      );

      // Fetch metrics for all employees
      const { data: estimates } = await supabase
        .from('estimates')
        .select('created_by')
        .in('created_by', userIds);

      const { data: invoices } = await supabase
        .from('invoices')
        .select('created_by, amount_in_tzs, amount, status')
        .in('created_by', userIds);

      const { data: shipments } = await supabase
        .from('shipments')
        .select('created_by')
        .in('created_by', userIds);

      let totalNewMilestones = 0;

      // Check each employee
      for (const userId of userIds) {
        const employeeName = profileMap.get(userId) || 'Employee';
        
        const employeeEstimates = estimates?.filter(e => e.created_by === userId).length || 0;
        const employeeInvoices = invoices?.filter(i => i.created_by === userId) || [];
        const employeeShipments = shipments?.filter(s => s.created_by === userId).length || 0;
        
        const paidInvoices = employeeInvoices.filter(i => i.status === 'paid');
        const revenue = paidInvoices.reduce((sum, i) => sum + Number(i.amount_in_tzs || i.amount), 0);

        const metrics: EmployeeMetrics = {
          invoices: employeeInvoices.length,
          estimates: employeeEstimates,
          shipments: employeeShipments,
          revenue,
        };

        // Check milestones
        for (const milestone of MILESTONES) {
          const key = `${userId}-${milestone.type}-${milestone.value}`;
          if (milestoneSet.has(key)) continue;

          let currentValue = 0;
          switch (milestone.type) {
            case 'invoices':
              currentValue = metrics.invoices;
              break;
            case 'estimates':
              currentValue = metrics.estimates;
              break;
            case 'shipments':
              currentValue = metrics.shipments;
              break;
            case 'revenue':
              currentValue = metrics.revenue;
              break;
          }

          if (currentValue >= milestone.value) {
            // Insert milestone record
            const { error: milestoneError } = await supabase
              .from('employee_milestones')
              .insert({
                employee_id: userId,
                milestone_type: milestone.type,
                milestone_value: String(milestone.value),
                notified_at: new Date().toISOString(),
              });

            if (!milestoneError) {
              // Create notification
              await supabase.from('notifications').insert({
                user_id: userId,
                title: `${milestone.icon} Milestone Achieved!`,
                message: `Congratulations ${employeeName}! You've reached ${milestone.label}.`,
                type: 'milestone',
              });

              milestoneSet.add(key);
              totalNewMilestones++;
            }
          }
        }
      }

      return { checked: userIds.length, newMilestones: totalNewMilestones };
    },
    onSuccess: (result) => {
      if (result.newMilestones > 0) {
        toast.success(`${result.newMilestones} new milestone(s) achieved!`);
        queryClient.invalidateQueries({ queryKey: ['employee-milestones'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    },
    onError: (error: Error) => {
      console.error('Error checking milestones:', error);
      toast.error('Failed to check milestones');
    },
  });
}
