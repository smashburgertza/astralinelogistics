import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, Mail, User, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const emailSchema = z.string().trim().email({ message: 'Invalid email address' });
const passwordSchema = z.string().min(6, { message: 'Password must be at least 6 characters' });

// Get or create session ID for tracking anonymous users
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('teaser_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('teaser_session_id', sessionId);
  }
  return sessionId;
};

interface InlineAuthGateProps {
  teaserContent: React.ReactNode;
  fullContent: React.ReactNode;
  title?: string;
  description?: string;
  source: 'shipping_calculator' | 'shop_for_me';
}

export function InlineAuthGate({
  teaserContent,
  fullContent,
  title = 'Sign in to see full details',
  description = 'Create a free account or sign in to view your complete quote breakdown.',
  source,
}: InlineAuthGateProps) {
  const { user, signIn, signUp, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const viewTrackedRef = useRef(false);
  const formStartedTrackedRef = useRef(false);

  // Track teaser view (once per component mount)
  useEffect(() => {
    if (!user && !viewTrackedRef.current) {
      viewTrackedRef.current = true;
      const sessionId = getSessionId();
      supabase
        .from('teaser_conversion_events')
        .insert({ event_type: 'view', source, session_id: sessionId })
        .then(({ error }) => {
          if (error) console.error('Failed to track teaser view:', error);
        });
    }
  }, [user, source]);

  // Track form_started when user begins typing
  const trackFormStarted = () => {
    if (!formStartedTrackedRef.current) {
      formStartedTrackedRef.current = true;
      const sessionId = getSessionId();
      supabase
        .from('teaser_conversion_events')
        .insert({ event_type: 'form_started', source, session_id: sessionId })
        .then(({ error }) => {
          if (error) console.error('Failed to track form started:', error);
        });
    }
  };

  // If user is authenticated, show full content
  if (user) {
    return <>{fullContent}</>;
  }

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);

    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login')) {
            toast.error('Invalid email or password');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Signed in successfully!');
        }
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('This email is already registered. Please sign in instead.');
            setMode('signin');
          } else {
            toast.error(error.message);
          }
        } else {
          // Track signup conversion (user_id will be null since signup just completed)
          const sessionId = getSessionId();
          await supabase
            .from('teaser_conversion_events')
            .insert({ 
              event_type: 'signup', 
              source, 
              session_id: sessionId
            });
          toast.success('Account created! You can now see your full quote.');
        }
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Teaser Content with blur overlay */}
      <div className="relative">
        <div className="filter blur-sm pointer-events-none select-none opacity-60">
          {teaserContent}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-background/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-border">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lock className="h-4 w-4 text-primary" />
              <span>Sign in to view full breakdown</span>
            </div>
          </div>
        </div>
      </div>

      {/* Inline Auth Form */}
      <div className="bg-muted/50 rounded-lg p-4 sm:p-6 border border-border">
        <div className="text-center mb-4">
          <h4 className="font-semibold text-lg">{title}</h4>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <Button
            type="button"
            variant={mode === 'signup' ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => setMode('signup')}
          >
            Create Account
          </Button>
          <Button
            type="button"
            variant={mode === 'signin' ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => setMode('signin')}
          >
            Sign In
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-sm">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    trackFormStarted();
                  }}
                  className="pl-9"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  trackFormStarted();
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                className={`pl-9 ${errors.email ? 'border-destructive' : ''}`}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={mode === 'signup' ? 'Create a password' : 'Enter your password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  trackFormStarted();
                  if (errors.password) setErrors({ ...errors, password: undefined });
                }}
                className={`pl-9 pr-9 ${errors.password ? 'border-destructive' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {mode === 'signup' ? 'Creating account...' : 'Signing in...'}
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                {mode === 'signup' ? 'Create Account & View Quote' : 'Sign In & View Quote'}
              </>
            )}
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground mt-3">
          {mode === 'signup' 
            ? 'By creating an account, you agree to our terms of service.' 
            : 'Forgot your password? Contact support for help.'}
        </p>
      </div>
    </div>
  );
}
