import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, Mail, Phone, Building2, MapPin, Shield, Clock, 
  Save, Loader2, Key, History, Award
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function AdminProfilePage() {
  const { user, profile, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    company_name: profile?.company_name || '',
    address: profile?.address || '',
  });

  // Fetch user role details
  const { data: roleData } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch recent activity
  const { data: recentActivity = [] } = useQuery({
    queryKey: ['user-activity', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          phone: data.phone,
          company_name: data.company_name,
          address: data.address,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Profile updated successfully');
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error) => {
      toast.error('Failed to update profile: ' + error.message);
    },
  });

  const handleSave = () => {
    updateProfile.mutate(formData);
  };

  const userInitials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : profile?.email?.slice(0, 2).toUpperCase() || 'AD';

  const getRoleBadge = () => {
    if (hasRole('super_admin')) return { label: 'Super Admin', variant: 'default' as const };
    if (hasRole('employee')) return { label: roleData?.employee_role || 'Employee', variant: 'secondary' as const };
    return { label: 'User', variant: 'outline' as const };
  };

  const roleBadge = getRoleBadge();

  return (
    <AdminLayout title="My Profile" subtitle="View and manage your account settings">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <Avatar className="h-24 w-24 bg-accent text-2xl">
                <AvatarFallback className="bg-accent text-accent-foreground font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold">{profile?.full_name || 'User'}</h2>
                  <Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
                </div>
                <p className="text-muted-foreground">{profile?.email}</p>
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Member
                  </span>
                  {roleData?.region && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {roleData.region.charAt(0).toUpperCase() + roleData.region.slice(1)}
                    </span>
                  )}
                </div>
              </div>

              <Button
                variant={isEditing ? 'outline' : 'default'}
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="details" className="space-y-6">
          <TabsList>
            <TabsTrigger value="details" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your personal details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      Full Name
                    </Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      value={profile?.email || ''}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      disabled={!isEditing}
                      placeholder="+255 xxx xxx xxx"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company" className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      Company Name
                    </Label>
                    <Input
                      id="company"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Your company"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    Address
                  </Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Enter your address"
                    rows={3}
                  />
                </div>

                {isEditing && (
                  <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={updateProfile.isPending}>
                      {updateProfile.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage your account security and authentication
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-muted rounded-lg">
                      <Key className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">Password</p>
                      <p className="text-sm text-muted-foreground">
                        Change your account password
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" disabled>
                    Change Password
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-muted rounded-lg">
                      <Shield className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">Role & Permissions</p>
                      <p className="text-sm text-muted-foreground">
                        Your current role: <Badge variant="secondary">{roleBadge.label}</Badge>
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Your recent actions and changes in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>No recent activity</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="p-2 bg-muted rounded-lg shrink-0">
                          <History className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {activity.action} on {activity.table_name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}