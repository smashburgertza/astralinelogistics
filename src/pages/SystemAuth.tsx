import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, ArrowRight, Shield, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import astralineLogo from '@/assets/astraline-logo.svg';

export default function SystemAuthPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const resolveEmailFromIdentifier = async (input: string): Promise<string> => {
    // If it looks like an email, return as-is
    if (input.includes('@')) {
      return input;
    }
    
    // Otherwise, try to find email by employee_code
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .ilike('employee_code', input)
      .maybeSingle();
    
    if (profile?.email) {
      return profile.email;
    }
    
    throw new Error('No account found with that ID. Please check and try again.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const email = await resolveEmailFromIdentifier(identifier);
      const { error } = await signIn(email, password);
      if (error) throw error;

      // Check user role and redirect accordingly
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Authentication failed');

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role, region')
        .eq('user_id', user.id);

      if (!roles || roles.length === 0) {
        await supabase.auth.signOut();
        throw new Error('No role assigned. Contact administrator.');
      }

      const userRole = roles[0];

      // Only employees and super_admins can access via system login
      if (userRole.role === 'super_admin' || userRole.role === 'employee') {
        toast.success('Welcome to Employee Portal!');
        navigate('/admin');
      } else {
        await supabase.auth.signOut();
        throw new Error('You do not have employee access. Please contact administrator.');
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMDIwMjAiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnY0em0wLTZ2LTRoLTJ2NGgyek0yNCAyNGgydi00aC0ydjR6bTAgNnYtNGgtMnY0aDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
      
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link to="/">
            <img 
              src={astralineLogo} 
              alt="Astraline Logistics" 
              className="h-16 w-auto"
            />
          </Link>
        </div>

        <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800">Employee Portal</CardTitle>
            <CardDescription className="text-slate-600">
              Login with your staff credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="employee-identifier">Staff ID or Email</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="employee-identifier"
                    type="text"
                    placeholder="EMP001 or email@company.com"
                    className="pl-10"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="employee-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="employee-password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" 
                size="lg" 
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Access Portal'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t text-center text-sm text-muted-foreground">
              <p>For customer access, please use the</p>
              <Link to="/auth" className="text-primary hover:underline font-medium">
                Customer Portal
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-slate-400 mt-6">
          © {new Date().getFullYear()} Astraline Logistics. All rights reserved.
        </p>
      </div>
    </div>
  );
}
