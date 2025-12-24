import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Mail, Shield, Settings, Save, Loader2, Upload, Trash2, ImageIcon } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useAllSettings, useUpdateSettings } from '@/hooks/useSettings';

// Schemas
const companySchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().optional(),
  tax_id: z.string().optional(),
  currency: z.string().min(1, 'Currency is required'),
  timezone: z.string().min(1, 'Timezone is required'),
});

const notificationSchema = z.object({
  email_notifications: z.boolean(),
  shipment_updates: z.boolean(),
  invoice_reminders: z.boolean(),
  order_alerts: z.boolean(),
  weekly_reports: z.boolean(),
  admin_email: z.string().optional(),
});

const securitySchema = z.object({
  session_timeout: z.string(),
  password_min_length: z.string(),
  require_uppercase: z.boolean(),
  require_numbers: z.boolean(),
  require_special_chars: z.boolean(),
  max_login_attempts: z.string(),
});

const systemSchema = z.object({
  invoice_prefix: z.string().min(1, 'Invoice prefix is required'),
  estimate_prefix: z.string().min(1, 'Estimate prefix is required'),
  tracking_prefix: z.string().min(1, 'Tracking prefix is required'),
  default_due_days: z.string(),
  auto_archive_days: z.string(),
  date_format: z.string(),
});

const defaultCompany = {
  company_name: 'Astraline Cargo',
  email: 'info@astraline.com',
  phone: '',
  address: '',
  website: '',
  tax_id: '',
  currency: 'USD',
  timezone: 'Asia/Dubai',
};

const defaultNotifications = {
  email_notifications: true,
  shipment_updates: true,
  invoice_reminders: true,
  order_alerts: true,
  weekly_reports: false,
  admin_email: '',
};

const defaultSecurity = {
  session_timeout: '30',
  password_min_length: '8',
  require_uppercase: true,
  require_numbers: true,
  require_special_chars: false,
  max_login_attempts: '5',
};

const defaultSystem = {
  invoice_prefix: 'INV',
  estimate_prefix: 'EST',
  tracking_prefix: 'AST',
  default_due_days: '30',
  auto_archive_days: '90',
  date_format: 'MMM d, yyyy',
};

export default function AdminSettingsPage() {
  const { data: settings, isLoading } = useAllSettings();
  const updateSettings = useUpdateSettings();
  
  // Logo upload state
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Favicon upload state
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // Forms
  const companyForm = useForm({
    resolver: zodResolver(companySchema),
    defaultValues: defaultCompany,
  });

  const notificationForm = useForm({
    resolver: zodResolver(notificationSchema),
    defaultValues: defaultNotifications,
  });

  const securityForm = useForm({
    resolver: zodResolver(securitySchema),
    defaultValues: defaultSecurity,
  });

  const systemForm = useForm({
    resolver: zodResolver(systemSchema),
    defaultValues: defaultSystem,
  });

  // Load settings into forms when data is available
  useEffect(() => {
    if (settings) {
      if (settings.company) {
        companyForm.reset({ ...defaultCompany, ...settings.company } as typeof defaultCompany);
        if ((settings.company as Record<string, unknown>).logo_url) {
          setLogoUrl((settings.company as Record<string, unknown>).logo_url as string);
        }
        if ((settings.company as Record<string, unknown>).favicon_url) {
          setFaviconUrl((settings.company as Record<string, unknown>).favicon_url as string);
        }
      }
      if (settings.notifications) {
        notificationForm.reset({ ...defaultNotifications, ...settings.notifications } as typeof defaultNotifications);
      }
      if (settings.security) {
        securityForm.reset({ ...defaultSecurity, ...settings.security } as typeof defaultSecurity);
      }
      if (settings.system) {
        systemForm.reset({ ...defaultSystem, ...settings.system } as typeof defaultSystem);
      }
    }
  }, [settings]);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `company-logo.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('branding')
        .getPublicUrl(fileName);

      setLogoUrl(publicUrl);

      // Save logo URL to settings
      const currentCompany = settings?.company || defaultCompany;
      await updateSettings.mutateAsync({
        key: 'company',
        value: { ...currentCompany, logo_url: publicUrl } as Record<string, unknown>,
      });

      toast.success('Logo uploaded successfully');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      // Delete from storage
      await supabase.storage.from('branding').remove(['company-logo.png', 'company-logo.jpg', 'company-logo.jpeg', 'company-logo.svg', 'company-logo.webp']);

      setLogoUrl(null);

      // Remove logo URL from settings
      const currentCompany = settings?.company || defaultCompany;
      const { logo_url, ...rest } = currentCompany as Record<string, unknown>;
      await updateSettings.mutateAsync({
        key: 'company',
        value: rest as Record<string, unknown>,
      });

      toast.success('Logo removed');
    } catch (error) {
      console.error('Error removing logo:', error);
      toast.error('Failed to remove logo');
    }
  };

  const handleFaviconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type - favicons should be ICO, PNG, or SVG
    const validTypes = ['image/x-icon', 'image/vnd.microsoft.icon', 'image/png', 'image/svg+xml'];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.ico')) {
      toast.error('Please select an ICO, PNG, or SVG file');
      return;
    }

    // Validate file size (max 500KB for favicons)
    if (file.size > 500 * 1024) {
      toast.error('Favicon must be less than 500KB');
      return;
    }

    setUploadingFavicon(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `favicon.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('branding')
        .getPublicUrl(fileName);

      setFaviconUrl(publicUrl);

      // Save favicon URL to settings
      const currentCompany = settings?.company || defaultCompany;
      await updateSettings.mutateAsync({
        key: 'company',
        value: { ...currentCompany, favicon_url: publicUrl } as Record<string, unknown>,
      });

      toast.success('Favicon uploaded successfully');
    } catch (error) {
      console.error('Error uploading favicon:', error);
      toast.error('Failed to upload favicon');
    } finally {
      setUploadingFavicon(false);
    }
  };

  const handleRemoveFavicon = async () => {
    try {
      // Delete from storage
      await supabase.storage.from('branding').remove(['favicon.ico', 'favicon.png', 'favicon.svg']);

      setFaviconUrl(null);

      // Remove favicon URL from settings
      const currentCompany = settings?.company || defaultCompany;
      const { favicon_url, ...rest } = currentCompany as Record<string, unknown>;
      await updateSettings.mutateAsync({
        key: 'company',
        value: rest as Record<string, unknown>,
      });

      toast.success('Favicon removed');
    } catch (error) {
      console.error('Error removing favicon:', error);
      toast.error('Failed to remove favicon');
    }
  };

  const handleSave = async (key: string, data: Record<string, unknown>) => {
    // Preserve logo_url and favicon_url when saving company settings
    if (key === 'company') {
      if (logoUrl) data = { ...data, logo_url: logoUrl };
      if (faviconUrl) data = { ...data, favicon_url: faviconUrl };
    }
    await updateSettings.mutateAsync({ key, value: data });
    toast.success(`${key.charAt(0).toUpperCase() + key.slice(1)} settings saved`);
  };

  if (isLoading) {
    return (
      <AdminLayout title="Settings" subtitle="Configure your system preferences">
        <div className="space-y-6">
          <Skeleton className="h-10 w-96" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Settings" subtitle="Configure your system preferences">
      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="company" className="gap-2">
            <Building2 className="h-4 w-4 hidden sm:inline" />
            Company
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Mail className="h-4 w-4 hidden sm:inline" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4 hidden sm:inline" />
            Security
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <Settings className="h-4 w-4 hidden sm:inline" />
            System
          </TabsTrigger>
        </TabsList>

        {/* Company Settings */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Company Profile</CardTitle>
              <CardDescription>Manage your company information and branding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Branding Upload Section */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Logo Upload */}
                <div className="space-y-3">
                  <Label>Company Logo</Label>
                  <div className="flex items-center gap-4">
                    <div className="relative h-24 w-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted/50">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Company logo" className="h-full w-full object-contain p-2" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleLogoUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingLogo}
                      >
                        {uploadingLogo ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        {logoUrl ? 'Change' : 'Upload'}
                      </Button>
                      {logoUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={handleRemoveLogo}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground">PNG, JPG or SVG. Max 2MB.</p>
                    </div>
                  </div>
                </div>

                {/* Favicon Upload */}
                <div className="space-y-3">
                  <Label>Favicon</Label>
                  <div className="flex items-center gap-4">
                    <div className="relative h-24 w-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted/50">
                      {faviconUrl ? (
                        <img src={faviconUrl} alt="Favicon" className="h-12 w-12 object-contain" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <input
                        type="file"
                        ref={faviconInputRef}
                        onChange={handleFaviconUpload}
                        accept=".ico,.png,.svg,image/x-icon,image/png,image/svg+xml"
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => faviconInputRef.current?.click()}
                        disabled={uploadingFavicon}
                      >
                        {uploadingFavicon ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        {faviconUrl ? 'Change' : 'Upload'}
                      </Button>
                      {faviconUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={handleRemoveFavicon}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground">ICO, PNG or SVG. Max 500KB.</p>
                    </div>
                  </div>
                </div>
              </div>

              <Form {...companyForm}>
                <form onSubmit={companyForm.handleSubmit((data) => handleSave('company', data))} className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={companyForm.control}
                      name="company_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your Company" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={companyForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="info@company.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={companyForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 234 567 8900" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={companyForm.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input placeholder="https://yourcompany.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={companyForm.control}
                      name="tax_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax ID / VAT Number</FormLabel>
                          <FormControl>
                            <Input placeholder="TAX-12345678" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={companyForm.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Currency</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="USD">USD - US Dollar</SelectItem>
                              <SelectItem value="EUR">EUR - Euro</SelectItem>
                              <SelectItem value="GBP">GBP - British Pound</SelectItem>
                              <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                              <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                              <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={companyForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Company address..." rows={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={companyForm.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timezone</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="max-w-xs">
                              <SelectValue placeholder="Select timezone" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                            <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                            <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                            <SelectItem value="Europe/London">London (GMT)</SelectItem>
                            <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                            <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                            <SelectItem value="Asia/Shanghai">Shanghai (CST)</SelectItem>
                            <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end">
                    <Button type="submit" disabled={updateSettings.isPending}>
                      {updateSettings.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Email & Notifications</CardTitle>
              <CardDescription>Configure email and notification preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...notificationForm}>
                <form onSubmit={notificationForm.handleSubmit((data) => handleSave('notifications', data))} className="space-y-6">
                  <div className="space-y-4">
                    {[
                      { name: 'email_notifications' as const, label: 'Email Notifications', desc: 'Enable or disable all email notifications' },
                      { name: 'shipment_updates' as const, label: 'Shipment Updates', desc: 'Notify when shipment status changes' },
                      { name: 'invoice_reminders' as const, label: 'Invoice Reminders', desc: 'Send reminders for pending invoices' },
                      { name: 'order_alerts' as const, label: 'New Order Alerts', desc: 'Get notified when new orders are placed' },
                      { name: 'weekly_reports' as const, label: 'Weekly Reports', desc: 'Receive weekly summary reports via email' },
                    ].map((item) => (
                      <FormField
                        key={item.name}
                        control={notificationForm.control}
                        name={item.name}
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">{item.label}</FormLabel>
                              <FormDescription>{item.desc}</FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormField
                    control={notificationForm.control}
                    name="admin_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admin Notification Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="admin@company.com" className="max-w-md" {...field} />
                        </FormControl>
                        <FormDescription>Override email for admin notifications (optional)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end">
                    <Button type="submit" disabled={updateSettings.isPending}>
                      {updateSettings.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security & Access</CardTitle>
              <CardDescription>Configure security policies and access controls</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...securityForm}>
                <form onSubmit={securityForm.handleSubmit((data) => handleSave('security', data))} className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={securityForm.control}
                      name="session_timeout"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Session Timeout (minutes)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select timeout" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="15">15 minutes</SelectItem>
                              <SelectItem value="30">30 minutes</SelectItem>
                              <SelectItem value="60">1 hour</SelectItem>
                              <SelectItem value="120">2 hours</SelectItem>
                              <SelectItem value="480">8 hours</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={securityForm.control}
                      name="max_login_attempts"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Login Attempts</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select limit" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="3">3 attempts</SelectItem>
                              <SelectItem value="5">5 attempts</SelectItem>
                              <SelectItem value="10">10 attempts</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base font-medium">Password Requirements</Label>
                    <FormField
                      control={securityForm.control}
                      name="password_min_length"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Password Length</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="max-w-xs">
                                <SelectValue placeholder="Select length" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="6">6 characters</SelectItem>
                              <SelectItem value="8">8 characters</SelectItem>
                              <SelectItem value="10">10 characters</SelectItem>
                              <SelectItem value="12">12 characters</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {[
                      { name: 'require_uppercase' as const, label: 'Require Uppercase', desc: 'Passwords must contain uppercase letters' },
                      { name: 'require_numbers' as const, label: 'Require Numbers', desc: 'Passwords must contain numbers' },
                      { name: 'require_special_chars' as const, label: 'Require Special Characters', desc: 'Passwords must contain special characters (!@#$%...)' },
                    ].map((item) => (
                      <FormField
                        key={item.name}
                        control={securityForm.control}
                        name={item.name}
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">{item.label}</FormLabel>
                              <FormDescription>{item.desc}</FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={updateSettings.isPending}>
                      {updateSettings.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>System Preferences</CardTitle>
              <CardDescription>Configure system defaults and document numbering</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...systemForm}>
                <form onSubmit={systemForm.handleSubmit((data) => handleSave('system', data))} className="space-y-6">
                  <div className="space-y-4">
                    <Label className="text-base font-medium">Document Prefixes</Label>
                    <div className="grid gap-4 md:grid-cols-3">
                      <FormField
                        control={systemForm.control}
                        name="invoice_prefix"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Invoice Prefix</FormLabel>
                            <FormControl>
                              <Input placeholder="INV" {...field} />
                            </FormControl>
                            <FormDescription>e.g., INV-202501-0001</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={systemForm.control}
                        name="estimate_prefix"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estimate Prefix</FormLabel>
                            <FormControl>
                              <Input placeholder="EST" {...field} />
                            </FormControl>
                            <FormDescription>e.g., EST-202501-0001</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={systemForm.control}
                        name="tracking_prefix"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tracking Prefix</FormLabel>
                            <FormControl>
                              <Input placeholder="AST" {...field} />
                            </FormControl>
                            <FormDescription>e.g., AST241224ABC123</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={systemForm.control}
                      name="default_due_days"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Payment Terms (days)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select days" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="7">Net 7</SelectItem>
                              <SelectItem value="15">Net 15</SelectItem>
                              <SelectItem value="30">Net 30</SelectItem>
                              <SelectItem value="45">Net 45</SelectItem>
                              <SelectItem value="60">Net 60</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={systemForm.control}
                      name="auto_archive_days"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Auto-Archive After (days)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select days" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="30">30 days</SelectItem>
                              <SelectItem value="60">60 days</SelectItem>
                              <SelectItem value="90">90 days</SelectItem>
                              <SelectItem value="180">180 days</SelectItem>
                              <SelectItem value="365">1 year</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={systemForm.control}
                    name="date_format"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date Format</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="max-w-xs">
                              <SelectValue placeholder="Select format" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="MMM d, yyyy">Dec 24, 2025</SelectItem>
                            <SelectItem value="dd/MM/yyyy">24/12/2025</SelectItem>
                            <SelectItem value="MM/dd/yyyy">12/24/2025</SelectItem>
                            <SelectItem value="yyyy-MM-dd">2025-12-24</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button type="submit" disabled={updateSettings.isPending}>
                      {updateSettings.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
