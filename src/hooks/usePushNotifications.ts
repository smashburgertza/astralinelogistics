import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

interface PushNotificationSettings {
  enabled: boolean;
  shipment_updates: boolean;
  new_orders: boolean;
  invoice_alerts: boolean;
  expense_approvals: boolean;
  system_alerts: boolean;
}

const DEFAULT_SETTINGS: PushNotificationSettings = {
  enabled: false,
  shipment_updates: true,
  new_orders: true,
  invoice_alerts: true,
  expense_approvals: true,
  system_alerts: true,
};

export function usePushNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [settings, setSettings] = useState<PushNotificationSettings>(DEFAULT_SETTINGS);

  // Check if push notifications are supported
  useEffect(() => {
    const supported = 'Notification' in window;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Load settings from database
  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', `push_notifications_${user.id}`)
        .maybeSingle();
      
      if (data?.value && typeof data.value === 'object' && !Array.isArray(data.value)) {
        setSettings({ ...DEFAULT_SETTINGS, ...(data.value as unknown as PushNotificationSettings) });
      }
    };

    loadSettings();
  }, [user?.id]);

  // Save settings to database
  const saveSettings = useCallback(async (newSettings: Partial<PushNotificationSettings>) => {
    if (!user?.id) return;
    
    const updated = { ...settings, ...newSettings };
    setSettings(updated);

    // Check if setting exists first
    const { data: existing } = await supabase
      .from('settings')
      .select('id')
      .eq('key', `push_notifications_${user.id}`)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('settings')
        .update({
          value: updated as unknown as Json,
        })
        .eq('key', `push_notifications_${user.id}`);
    } else {
      await supabase
        .from('settings')
        .insert({
          key: `push_notifications_${user.id}`,
          category: 'user_preferences',
          value: updated as unknown as Json,
          description: 'Push notification preferences',
        });
    }
    
    queryClient.invalidateQueries({ queryKey: ['settings'] });
  }, [user?.id, settings, queryClient]);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast.error('Push notifications are not supported in this browser');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        await saveSettings({ enabled: true });
        toast.success('Push notifications enabled!');
        return true;
      } else if (result === 'denied') {
        toast.error('Notification permission denied. Please enable in browser settings.');
        return false;
      }
      
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to enable notifications');
      return false;
    }
  }, [isSupported, saveSettings]);

  // Send a push notification
  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== 'granted' || !settings.enabled) {
      return null;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      return null;
    }
  }, [isSupported, permission, settings.enabled]);

  // Disable notifications
  const disableNotifications = useCallback(async () => {
    await saveSettings({ enabled: false });
    toast.info('Push notifications disabled');
  }, [saveSettings]);

  return {
    isSupported,
    permission,
    settings,
    requestPermission,
    sendNotification,
    saveSettings,
    disableNotifications,
  };
}

// Hook to listen for realtime notifications and show push notifications
export function useRealtimeNotifications() {
  const { user } = useAuth();
  const { sendNotification, settings } = usePushNotifications();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id || !settings.enabled) return;

    const channel = supabase
      .channel('realtime-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as {
            title: string;
            message: string;
            type: string;
          };

          // Check if this notification type is enabled
          const typeEnabled = 
            (notification.type === 'shipment' && settings.shipment_updates) ||
            (notification.type === 'order' && settings.new_orders) ||
            (notification.type === 'invoice' && settings.invoice_alerts) ||
            (notification.type === 'expense' && settings.expense_approvals) ||
            (notification.type === 'system' && settings.system_alerts) ||
            !['shipment', 'order', 'invoice', 'expense', 'system'].includes(notification.type);

          if (typeEnabled) {
            sendNotification(notification.title, {
              body: notification.message,
              tag: notification.type,
            });
          }

          // Refresh notification queries
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, settings, sendNotification, queryClient]);
}
