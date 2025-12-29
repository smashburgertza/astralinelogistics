import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export type Customer = Tables<'customers'>;

export function useCustomersList(filters?: {
  search?: string;
}) {
  return useQuery({
    queryKey: ['customers', filters],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,customer_code.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Customer[];
    },
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as Customer | null;
    },
    enabled: !!id,
  });
}

export function useCustomerShipments(customerId: string) {
  return useQuery({
    queryKey: ['customer-shipments', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });
}

export function useCustomerInvoices(customerId: string) {
  return useQuery({
    queryKey: ['customer-invoices', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customer: TablesInsert<'customers'>) => {
      const { data, error } = await supabase
        .from('customers')
        .insert(customer)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create customer: ${error.message}`);
    },
  });
}

export function useCreateCustomerWithAuth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      email: string;
      password: string;
      phone?: string | null;
      company_name?: string | null;
      address?: string | null;
      notes?: string | null;
    }) => {
      // Store current admin session before creating new user
      const { data: currentSession } = await supabase.auth.getSession();
      const adminSession = currentSession.session;

      // Create user via auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: data.name },
        },
      });

      if (authError) {
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

      // Restore admin session and wait for it to be ready
      if (adminSession) {
        await supabase.auth.setSession(adminSession);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Update the profile that was auto-created
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: data.name,
          phone: data.phone || null,
          company_name: data.company_name || null,
          address: data.address || null,
        })
        .eq('id', authData.user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
      }

      // Create the customer record linked to the user
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          company_name: data.company_name || null,
          address: data.address || null,
          notes: data.notes || null,
          user_id: authData.user.id,
        })
        .select()
        .single();

      if (customerError) throw customerError;
      return customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer created with login credentials');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create customer');
    },
  });
}

export function useBulkCreateCustomers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customers: TablesInsert<'customers'>[]) => {
      const { data, error } = await supabase
        .from('customers')
        .insert(customers)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(`${data.length} customers imported successfully`);
    },
    onError: (error) => {
      toast.error(`Failed to import customers: ${error.message}`);
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'customers'> & { id: string }) => {
      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update customer: ${error.message}`);
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete customer: ${error.message}`);
    },
  });
}
