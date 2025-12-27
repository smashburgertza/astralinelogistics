import { useState, useEffect } from 'react';
import { AgentLayout } from '@/components/layout/AgentLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useAgentFullConfig } from '@/hooks/useAgentSettings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, User, Mail, Phone, Building2, MapPin, Save, Globe, Package, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export default function AgentSettingsPage() {
  const { profile, user, refetchProfile } = useAuth();
  const { data: agentConfig, isLoading: configLoading, refetch: refetchConfig } = useAgentFullConfig();
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    company_name: '',
    address: '',
  });

  // Update form when profile changes
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        company_name: profile.company_name || '',
        address: profile.address || '',
      });
    }
  }, [profile]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchProfile(), refetchConfig()]);
      toast.success('Settings refreshed');
    } catch (error) {
      toast.error('Failed to refresh settings');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          company_name: formData.company_name,
          address: formData.address,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      await refetchProfile();
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(`Failed to update profile: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <AgentLayout title="Settings" subtitle="Manage your account settings">
      <div className="max-w-2xl space-y-6">
        {/* Refresh Button */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh Settings
          </Button>
        </div>

        {/* Account Configuration (Read-only, set by admin) */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Account Configuration
            </CardTitle>
            <CardDescription>
              Settings configured by your administrator
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {configLoading ? (
              <div className="space-y-4">
                <div className="h-10 bg-muted animate-pulse rounded" />
                <div className="h-10 bg-muted animate-pulse rounded" />
              </div>
            ) : (
              <>
                {/* Assigned Regions */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    Assigned Regions
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {agentConfig?.regions && agentConfig.regions.length > 0 ? (
                      agentConfig.regions.map((region) => (
                        <Badge key={region.region_code} variant="secondary" className="gap-1.5 py-1.5 px-3">
                          {region.flag_emoji && <span>{region.flag_emoji}</span>}
                          {region.region_name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No regions assigned</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Contact your administrator to change region assignments
                  </p>
                </div>

                <Separator />

                {/* Consolidated Cargo Permission */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    Consolidated Cargo
                  </Label>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    {agentConfig?.settings?.can_have_consolidated_cargo ? (
                      <>
                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-green-700 dark:text-green-400">Enabled</p>
                          <p className="text-xs text-muted-foreground">
                            You can add consolidated cargo to your shipments
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <XCircle className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Disabled</p>
                          <p className="text-xs text-muted-foreground">
                            Consolidated cargo is not enabled for your account
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This setting is managed by your administrator
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Profile Settings */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your personal information and contact details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                Email
              </Label>
              <Input 
                value={profile?.email || ''} 
                disabled 
                className="bg-muted/50"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>

            <Separator />

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name" className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                Full Name
              </Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder="Your full name"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                Phone Number
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+1 234 567 8900"
              />
            </div>

            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="company_name" className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                Company Name
              </Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                placeholder="Your company name"
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                Address
              </Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Your business address"
              />
            </div>

            <Separator />

            <Button 
              onClick={handleSaveProfile} 
              disabled={isUpdating}
              className="w-full sm:w-auto"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AgentLayout>
  );
}
