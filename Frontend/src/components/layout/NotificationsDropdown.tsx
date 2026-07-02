import React from 'react';
import { Dropdown } from '../ui/Dropdown.js';
import { Bell, Check, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { useNotificationStore } from '../../store/notificationStore.js';
import { cn } from '../../lib/utils.js';

export const NotificationsDropdown: React.FC = () => {
  const { notifications, markAsRead, markAllAsRead } = useNotificationStore();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const icons = {
    info: <Info className="h-4 w-4 text-blue-500" />,
    success: <CheckCircle className="h-4 w-4 text-success" />,
    warning: <AlertTriangle className="h-4 w-4 text-warning" />,
    error: <AlertCircle className="h-4 w-4 text-destructive" />,
  };

  const menuItems = notifications.length
    ? [
        ...notifications.slice(0, 5).map((n) => ({
          label: n.title,
          icon: icons[n.type],
          onClick: () => markAsRead(n.id),
          className: cn(!n.isRead && 'font-semibold bg-primary/5'),
        })),
        {
          label: 'Mark all as read',
          icon: <Check className="h-4 w-4" />,
          onClick: markAllAsRead,
        },
      ]
    : [
        {
          label: 'No new notifications',
          disabled: true,
        },
      ];

  return (
    <Dropdown
      trigger={
        <button className="relative p-2 rounded-full hover:bg-muted transition-colors cursor-pointer select-none">
          <Bell className="h-5 w-5 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground leading-none">
              {unreadCount}
            </span>
          )}
        </button>
      }
      items={menuItems}
    />
  );
};
export default NotificationsDropdown;
