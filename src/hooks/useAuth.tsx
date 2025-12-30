import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'super_admin' | 'employee' | 'agent' | 'customer';
type AgentRegion = 'europe' | 'dubai' | 'china' | 'india' | 'usa' | 'uk';

interface UserRole {
  role: AppRole;
  region?: AgentRegion;
  employee_role?: string;
  permissions?: Record<string, boolean>;
}

interface Profile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  company_name?: string;
  address?: string;
}

// Permission keys that can be assigned to employees
export type PermissionKey = 
  | 'manage_shipments'
  | 'manage_invoices'
  | 'manage_customers'
  | 'manage_agents'
  | 'manage_expenses'
  | 'approve_expenses'
  | 'view_reports'
  | 'manage_settings';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: UserRole[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  hasPermission: (permission: PermissionKey) => boolean;
  isAdmin: () => boolean;
  isAgent: () => boolean;
  isCustomer: () => boolean;
  getRegion: () => AgentRegion | undefined;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData as Profile);
      }

      // Fetch roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role, region, employee_role, permissions')
        .eq('user_id', userId);

      if (rolesData) {
        setRoles(rolesData as UserRole[]);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
        }
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName },
      },
    });
    return { error };
  };

  const signOut = async () => {
    // Clear state first to prevent any race conditions
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    
    // Then sign out from Supabase
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
  };

  const hasRole = (role: AppRole) => roles.some(r => r.role === role);
  
  // Check if user has a specific permission
  // Super admins automatically have all permissions
  const hasPermission = (permission: PermissionKey): boolean => {
    // Super admins bypass all permission checks
    if (hasRole('super_admin')) return true;
    
    // Check if any role has this permission
    return roles.some(r => {
      if (r.permissions && typeof r.permissions === 'object') {
        return (r.permissions as Record<string, boolean>)[permission] === true;
      }
      return false;
    });
  };
  
  const isAdmin = () => hasRole('super_admin') || hasRole('employee');
  const isAgent = () => hasRole('agent');
  const isCustomer = () => hasRole('customer');
  const getRegion = () => roles.find(r => r.region)?.region;
  
  const refetchProfile = async () => {
    if (user?.id) {
      await fetchUserData(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      roles,
      loading,
      signIn,
      signUp,
      signOut,
      hasRole,
      hasPermission,
      isAdmin,
      isAgent,
      isCustomer,
      getRegion,
      refetchProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
