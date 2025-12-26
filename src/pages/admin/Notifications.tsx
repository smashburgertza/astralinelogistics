import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, Package, FileText, Users, Wallet, Check, CheckCheck, 
  Trash2, Loader2, Inbox
} from 'lucide-react';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/useNotifications';
import { formatDistanceToNow, format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'shipment':
      return Package;
    case 'invoice':
      return FileText;
    case 'customer':
      return Users;
    case 'expense':
      return Wallet;
    default:
      return Bell;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'shipment':
      return 'text-blue-500 bg-blue-500/10';
    case 'invoice':
      return 'text-green-500 bg-green-500/10';
    case 'customer':
      return 'text-purple-500 bg-purple-500/10';
    case 'expense':
      return 'text-orange-500 bg-orange-500/10';
    default:
      return 'text-muted-foreground bg-muted';
  }
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: notifications = [], isLoading } = useNotifications();
  const markAsRead = useMarkNotificationRead();
  const markAllAsRead = useMarkAllNotificationsRead();

  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Notification deleted');
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', user?.id] });
    },
    onError: () => {
      toast.error('Failed to delete notification');
    },
  });

  const clearAllRead = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('read', true);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Cleared read notifications');
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
    onError: () => {
      toast.error('Failed to clear notifications');
    },
  });

  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }
    
    if (notification.type === 'shipment' && notification.shipment_id) {
      navigate('/admin/shipments');
    } else if (notification.type === 'invoice') {
      navigate('/admin/invoices');
    } else if (notification.type === 'expense') {
      navigate('/admin/expenses');
    }
  };

  const renderNotification = (notification: any) => {
    const Icon = getNotificationIcon(notification.type);
    const colorClass = getNotificationColor(notification.type);

    return (
      <div
        key={notification.id}
        className={cn(
          "flex items-start gap-4 p-4 rounded-lg border transition-colors cursor-pointer group",
          !notification.read && "bg-accent/30 border-accent",
          notification.read && "hover:bg-muted/50"
        )}
        onClick={() => handleNotificationClick(notification)}
      >
        <div className={cn("p-2.5 rounded-lg shrink-0", colorClass)}>
          <Icon className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className={cn(
              "text-sm",
              !notification.read && "font-semibold"
            )}>
              {notification.title}
            </p>
            {!notification.read && (
              <Badge variant="default" className="text-xs">New</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-2">
            {format(new Date(notification.created_at), 'MMM d, yyyy h:mm a')} • {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </p>
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {!notification.read && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                markAsRead.mutate(notification.id);
              }}
            >
              <Check className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              deleteNotification.mutate(notification.id);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout title="Notifications" subtitle="View and manage your notifications">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              All Notifications
              {unreadNotifications.length > 0 && (
                <Badge variant="default">{unreadNotifications.length} unread</Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {unreadNotifications.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAllAsRead.mutate()}
                  disabled={markAllAsRead.isPending}
                >
                  <CheckCheck className="w-4 h-4 mr-2" />
                  Mark all read
                </Button>
              )}
              {readNotifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearAllRead.mutate()}
                  disabled={clearAllRead.isPending}
                >
                  Clear read
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">
                  All ({notifications.length})
                </TabsTrigger>
                <TabsTrigger value="unread">
                  Unread ({unreadNotifications.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-3">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-12">
                    <Inbox className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No notifications</p>
                  </div>
                ) : (
                  notifications.map(renderNotification)
                )}
              </TabsContent>

              <TabsContent value="unread" className="space-y-3">
                {unreadNotifications.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCheck className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">All caught up!</p>
                  </div>
                ) : (
                  unreadNotifications.map(renderNotification)
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}