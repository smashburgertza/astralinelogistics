import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export interface EmployeeSalary {
  id: string;
  employee_id: string;
  base_salary: number;
  currency: string;
  pay_frequency: string;
  paye_rate: number | null;
  nssf_employee_rate: number | null;
  nssf_employer_rate: number | null;
  health_insurance: number | null;
  other_allowances: number | null;
  effective_from: string;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SalaryAdvance {
  id: string;
  employee_id: string;
  amount: number;
  currency: string;
  advance_date: string;
  reason: string | null;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  deducted_in_payroll_id: string | null;
  paid_from_account_id: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PayrollRun {
  id: string;
  payroll_number: string;
  period_month: number;
  period_year: number;
  run_date: string;
  status: string;
  total_gross: number | null;
  total_deductions: number | null;
  total_net: number | null;
  total_employer_contributions: number | null;
  currency: string;
  paid_from_account_id: string | null;
  paid_at: string | null;
  paid_by: string | null;
  journal_entry_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PayrollItem {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  employee_name: string | null;
  base_salary: number;
  other_allowances: number | null;
  gross_salary: number;
  paye_deduction: number | null;
  nssf_employee_deduction: number | null;
  nssf_employer_contribution: number | null;
  health_deduction: number | null;
  advance_deduction: number | null;
  other_deductions: number | null;
  total_deductions: number | null;
  net_salary: number;
  currency: string;
  status: string;
  notes: string | null;
  created_at: string | null;
}

// ============ Employee Salaries ============

export function useEmployeeSalaries() {
  return useQuery({
    queryKey: ['employee-salaries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_salaries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EmployeeSalary[];
    },
  });
}

export function useEmployeeSalary(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['employee-salary', employeeId],
    queryFn: async () => {
      if (!employeeId) return null;
      const { data, error } = await supabase
        .from('employee_salaries')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('is_active', true)
        .order('effective_from', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as EmployeeSalary | null;
    },
    enabled: !!employeeId,
  });
}

export function useCreateEmployeeSalary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (salary: Omit<EmployeeSalary, 'id' | 'created_at' | 'updated_at'>) => {
      // Deactivate existing salary records for this employee
      await supabase
        .from('employee_salaries')
        .update({ is_active: false })
        .eq('employee_id', salary.employee_id);

      const { data, error } = await supabase
        .from('employee_salaries')
        .insert(salary)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-salaries'] });
      toast.success('Salary configuration saved');
    },
    onError: (error: Error) => {
      toast.error('Failed to save salary: ' + error.message);
    },
  });
}

export function useUpdateEmployeeSalary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmployeeSalary> & { id: string }) => {
      const { data, error } = await supabase
        .from('employee_salaries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-salaries'] });
      toast.success('Salary updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update salary: ' + error.message);
    },
  });
}

// ============ Salary Advances ============

export function useSalaryAdvances(filters?: { status?: string; employeeId?: string }) {
  return useQuery({
    queryKey: ['salary-advances', filters],
    queryFn: async () => {
      let query = supabase
        .from('salary_advances')
        .select('*')
        .order('advance_date', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.employeeId) {
        query = query.eq('employee_id', filters.employeeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SalaryAdvance[];
    },
  });
}

export function usePendingAdvances(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['pending-advances', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from('salary_advances')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('status', 'approved')
        .is('deducted_in_payroll_id', null)
        .order('advance_date', { ascending: true });

      if (error) throw error;
      return data as SalaryAdvance[];
    },
    enabled: !!employeeId,
  });
}

export function useCreateSalaryAdvance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (advance: Omit<SalaryAdvance, 'id' | 'created_at' | 'updated_at' | 'approved_at' | 'approved_by' | 'deducted_in_payroll_id'>) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('salary_advances')
        .insert({
          ...advance,
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-advances'] });
      toast.success('Advance recorded');
    },
    onError: (error: Error) => {
      toast.error('Failed to record advance: ' + error.message);
    },
  });
}

export function useApproveSalaryAdvance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, bankAccountId }: { id: string; bankAccountId?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('salary_advances')
        .update({
          status: 'approved',
          approved_by: userData.user?.id,
          approved_at: new Date().toISOString(),
          paid_from_account_id: bankAccountId,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update bank balance if account specified
      if (bankAccountId) {
        const advance = data as SalaryAdvance;
        // Get current balance and update
        const { data: bankData } = await supabase
          .from('bank_accounts')
          .select('current_balance')
          .eq('id', bankAccountId)
          .single();
          
        if (bankData) {
          await supabase
            .from('bank_accounts')
            .update({ current_balance: (bankData.current_balance || 0) - advance.amount })
            .eq('id', bankAccountId);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-advances'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      toast.success('Advance approved');
    },
    onError: (error: Error) => {
      toast.error('Failed to approve advance: ' + error.message);
    },
  });
}

// ============ Payroll Runs ============

export function usePayrollRuns() {
  return useQuery({
    queryKey: ['payroll-runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_runs')
        .select('*')
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false });

      if (error) throw error;
      return data as PayrollRun[];
    },
  });
}

export function usePayrollRun(id: string | undefined) {
  return useQuery({
    queryKey: ['payroll-run', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as PayrollRun;
    },
    enabled: !!id,
  });
}

export function useCreatePayrollRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ month, year }: { month: number; year: number }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      // Generate payroll number
      const { data: payrollNumber } = await supabase.rpc('generate_payroll_number');

      const { data, error } = await supabase
        .from('payroll_runs')
        .insert({
          payroll_number: payrollNumber || `PAY-${year}-${month.toString().padStart(2, '0')}`,
          period_month: month,
          period_year: year,
          status: 'draft',
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as PayrollRun;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      toast.success('Payroll run created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create payroll: ' + error.message);
    },
  });
}

export function useUpdatePayrollRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PayrollRun> & { id: string }) => {
      const { data, error } = await supabase
        .from('payroll_runs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      toast.success('Payroll updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update payroll: ' + error.message);
    },
  });
}

export function useDeletePayrollRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payroll_runs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      toast.success('Payroll deleted');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete payroll: ' + error.message);
    },
  });
}

// ============ Payroll Items ============

export function usePayrollItems(payrollRunId: string | undefined) {
  return useQuery({
    queryKey: ['payroll-items', payrollRunId],
    queryFn: async () => {
      if (!payrollRunId) return [];
      const { data, error } = await supabase
        .from('payroll_items')
        .select('*')
        .eq('payroll_run_id', payrollRunId)
        .order('employee_name', { ascending: true });

      if (error) throw error;
      return data as PayrollItem[];
    },
    enabled: !!payrollRunId,
  });
}

export function useGeneratePayrollItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payrollRunId: string) => {
      // Get employees with active salaries
      const { data: salaries, error: salaryError } = await supabase
        .from('employee_salaries')
        .select('*')
        .eq('is_active', true);

      if (salaryError) throw salaryError;

      // Get employee profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email');

      if (profileError) throw profileError;

      // Get pending advances
      const { data: advances, error: advanceError } = await supabase
        .from('salary_advances')
        .select('*')
        .eq('status', 'approved')
        .is('deducted_in_payroll_id', null);

      if (advanceError) throw advanceError;

      const items: Omit<PayrollItem, 'id' | 'created_at'>[] = [];
      let totalGross = 0;
      let totalDeductions = 0;
      let totalNet = 0;
      let totalEmployerContributions = 0;

      for (const salary of salaries || []) {
        const profile = profiles?.find(p => p.id === salary.employee_id);
        const employeeAdvances = advances?.filter(a => a.employee_id === salary.employee_id) || [];
        const advanceTotal = employeeAdvances.reduce((sum, a) => sum + a.amount, 0);

        const baseSalary = salary.base_salary;
        const allowances = salary.other_allowances || 0;
        const grossSalary = baseSalary + allowances;
        
        // Calculate deductions
        const payeDeduction = (salary.paye_rate || 0) / 100 * grossSalary;
        const nssfEmployee = (salary.nssf_employee_rate || 0) / 100 * grossSalary;
        const nssfEmployer = (salary.nssf_employer_rate || 0) / 100 * grossSalary;
        const healthDeduction = salary.health_insurance || 0;
        
        const totalDeductionsForEmployee = payeDeduction + nssfEmployee + healthDeduction + advanceTotal;
        const netSalary = grossSalary - totalDeductionsForEmployee;

        totalGross += grossSalary;
        totalDeductions += totalDeductionsForEmployee;
        totalNet += netSalary;
        totalEmployerContributions += nssfEmployer;

        items.push({
          payroll_run_id: payrollRunId,
          employee_id: salary.employee_id,
          employee_name: profile?.full_name || profile?.email || 'Unknown',
          base_salary: baseSalary,
          other_allowances: allowances,
          gross_salary: grossSalary,
          paye_deduction: payeDeduction,
          nssf_employee_deduction: nssfEmployee,
          nssf_employer_contribution: nssfEmployer,
          health_deduction: healthDeduction,
          advance_deduction: advanceTotal,
          other_deductions: 0,
          total_deductions: totalDeductionsForEmployee,
          net_salary: netSalary,
          currency: salary.currency,
          status: 'pending',
          notes: null,
        });

        // Mark advances as deducted
        for (const advance of employeeAdvances) {
          await supabase
            .from('salary_advances')
            .update({ deducted_in_payroll_id: payrollRunId, status: 'deducted' })
            .eq('id', advance.id);
        }
      }

      // Insert payroll items
      if (items.length > 0) {
        const { error: insertError } = await supabase
          .from('payroll_items')
          .insert(items);

        if (insertError) throw insertError;
      }

      // Update payroll run totals
      const { error: updateError } = await supabase
        .from('payroll_runs')
        .update({
          total_gross: totalGross,
          total_deductions: totalDeductions,
          total_net: totalNet,
          total_employer_contributions: totalEmployerContributions,
          status: 'generated',
        })
        .eq('id', payrollRunId);

      if (updateError) throw updateError;

      return items;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-items'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      queryClient.invalidateQueries({ queryKey: ['salary-advances'] });
      toast.success('Payroll generated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to generate payroll: ' + error.message);
    },
  });
}

export function useProcessPayroll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ payrollRunId, bankAccountId }: { payrollRunId: string; bankAccountId: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      // Get payroll run
      const { data: payroll, error: payrollError } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('id', payrollRunId)
        .single();

      if (payrollError) throw payrollError;

      // Update payroll status
      const { error: updateError } = await supabase
        .from('payroll_runs')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          paid_by: userData.user?.id,
          paid_from_account_id: bankAccountId,
        })
        .eq('id', payrollRunId);

      if (updateError) throw updateError;

      // Update all items to paid
      await supabase
        .from('payroll_items')
        .update({ status: 'paid' })
        .eq('payroll_run_id', payrollRunId);

      // Update bank balance
      const totalPaid = (payroll.total_net || 0) + (payroll.total_employer_contributions || 0);
      const { data: bankData } = await supabase
        .from('bank_accounts')
        .select('current_balance')
        .eq('id', bankAccountId)
        .single();

      if (bankData) {
        await supabase
          .from('bank_accounts')
          .update({ current_balance: (bankData.current_balance || 0) - totalPaid })
          .eq('id', bankAccountId);
      }

      return payroll;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-items'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      toast.success('Payroll processed successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to process payroll: ' + error.message);
    },
  });
}

// Month names helper
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
