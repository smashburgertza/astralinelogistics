import { Bell, BellOff, BellRing, Check, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useState } from 'react';

export function PushNotificationSettings() {
  const {
    isSupported,
    permission,
    settings,
    requestPermission,
    saveSettings,
    disableNotifications,
  } = usePushNotifications();
  
  const [isEnabling, setIsEnabling] = useState(false);

  const handleEnableNotifications = async () => {
    setIsEnabling(true);
    await requestPermission();
    setIsEnabling(false);
  };

  const handleToggleSetting = (key: keyof typeof settings) => {
    if (key === 'enabled') {
      if (settings.enabled) {
        disableNotifications();
      } else {
        handleEnableNotifications();
      }
    } else {
      saveSettings({ [key]: !settings[key] });
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BellOff className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Push Notifications</CardTitle>
          </div>
          <CardDescription>
            Push notifications are not supported in this browser. Please try using a modern browser like Chrome, Firefox, or Safari.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary" />
            <CardTitle>Push Notifications</CardTitle>
          </div>
          <Badge variant={settings.enabled && permission === 'granted' ? 'default' : 'secondary'}>
            {settings.enabled && permission === 'granted' ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
        <CardDescription>
          Receive real-time push notifications for important updates even when you're not actively using the app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master Toggle */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">Enable Push Notifications</Label>
            <p className="text-sm text-muted-foreground">
              {permission === 'denied' 
                ? 'Notifications are blocked. Please enable in browser settings.'
                : 'Get notified about new shipments, orders, and more.'
              }
            </p>
          </div>
          {permission === 'denied' ? (
            <Button variant="outline" size="sm" disabled>
              <BellOff className="h-4 w-4 mr-2" />
              Blocked
            </Button>
          ) : settings.enabled && permission === 'granted' ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleToggleSetting('enabled')}
            >
              <Check className="h-4 w-4 mr-2" />
              Enabled
            </Button>
          ) : (
            <Button 
              size="sm" 
              onClick={handleEnableNotifications}
              disabled={isEnabling}
            >
              {isEnabling ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Bell className="h-4 w-4 mr-2" />
              )}
              Enable
            </Button>
          )}
        </div>

        {/* Notification Types */}
        {settings.enabled && permission === 'granted' && (
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Notification Types
            </h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="shipment_updates">Shipment Updates</Label>
                  <p className="text-sm text-muted-foreground">New shipments and status changes</p>
                </div>
                <Switch
                  id="shipment_updates"
                  checked={settings.shipment_updates}
                  onCheckedChange={() => handleToggleSetting('shipment_updates')}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="new_orders">New Orders</Label>
                  <p className="text-sm text-muted-foreground">Shop for me order requests</p>
                </div>
                <Switch
                  id="new_orders"
                  checked={settings.new_orders}
                  onCheckedChange={() => handleToggleSetting('new_orders')}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="invoice_alerts">Invoice Alerts</Label>
                  <p className="text-sm text-muted-foreground">New invoices and payment updates</p>
                </div>
                <Switch
                  id="invoice_alerts"
                  checked={settings.invoice_alerts}
                  onCheckedChange={() => handleToggleSetting('invoice_alerts')}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="expense_approvals">Expense Approvals</Label>
                  <p className="text-sm text-muted-foreground">Expenses requiring approval</p>
                </div>
                <Switch
                  id="expense_approvals"
                  checked={settings.expense_approvals}
                  onCheckedChange={() => handleToggleSetting('expense_approvals')}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="system_alerts">System Alerts</Label>
                  <p className="text-sm text-muted-foreground">Important system notifications</p>
                </div>
                <Switch
                  id="system_alerts"
                  checked={settings.system_alerts}
                  onCheckedChange={() => handleToggleSetting('system_alerts')}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
