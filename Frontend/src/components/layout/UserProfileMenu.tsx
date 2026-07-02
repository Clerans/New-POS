import React from 'react';
import { Dropdown } from '../ui/Dropdown.js';
import { Avatar } from '../ui/Avatar.js';
import { useAuthStore } from '../../store/authStore.js';
import { useUserStore } from '../../store/userStore.js';
import { LogOut, User, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const UserProfileMenu: React.FC = () => {
  const { clearAuth } = useAuthStore();
  const { user } = useUserStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const menuItems = [
    {
      label: 'My Profile',
      icon: <User className="h-4 w-4" />,
      onClick: () => navigate('/profile'),
    },
    {
      label: 'System Settings',
      icon: <Settings className="h-4 w-4" />,
      onClick: () => navigate('/settings'),
    },
    {
      label: 'Sign Out',
      icon: <LogOut className="h-4 w-4" />,
      onClick: handleLogout,
      variant: 'danger' as const,
    },
  ];

  const fallbackName = user?.firstName || user?.email || 'User';

  return (
    <Dropdown
      trigger={
        <button className="flex items-center gap-2 hover:bg-muted p-1.5 rounded-lg transition-colors cursor-pointer select-none">
          <Avatar fallback={fallbackName} size="sm" />
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-semibold text-foreground leading-none">
              {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email || 'Staff Profile'}
            </span>
            <span className="text-[10px] text-muted-foreground leading-none mt-1">
              {user?.roles?.[0] || 'Staff'}
            </span>
          </div>
        </button>
      }
      items={menuItems}
    />
  );
};
export default UserProfileMenu;
