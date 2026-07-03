import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Settings as SettingsIcon, ChevronLeft, ChevronRight, Store, Layers, Calendar, ShoppingCart, Utensils, Package } from 'lucide-react';
import { useSidebarStore } from '../../store/sidebarStore.js';
import { useUserStore } from '../../store/userStore.js';
import { cn } from '../../lib/utils.js';

export const Sidebar: React.FC = () => {
  const { isCollapsed, toggleCollapsed } = useSidebarStore();
  const { hasPermission } = useUserStore();

  const navigationItems = [
    {
      name: 'Dashboard',
      to: '/dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
      permission: 'Dashboard.View',
    },
    {
      name: 'POS Billing',
      to: '/pos',
      icon: <ShoppingCart className="h-5 w-5" />,
      permission: 'POS.View',
    },
    {
      name: 'Menu Catalog',
      to: '/menu-management',
      icon: <Utensils className="h-5 w-5" />,
      permission: 'Products.View',
    },
    {
      name: 'Inventory',
      to: '/inventory',
      icon: <Package className="h-5 w-5" />,
      permission: 'Inventory.View',
    },
    {
      name: 'Floor Plan',
      to: '/floor-management',
      icon: <Layers className="h-5 w-5" />,
      permission: 'Restaurant.View',
    },
    {
      name: 'Reservations',
      to: '/reservations',
      icon: <Calendar className="h-5 w-5" />,
      permission: 'Reservation.View',
    },
    {
      name: 'Settings',
      to: '/settings',
      icon: <SettingsIcon className="h-5 w-5" />,
      permission: 'Settings.Manage',
    },
  ];

  const visibleItems = navigationItems.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col bg-card border-r border-border transition-all duration-300 ease-in-out h-screen sticky top-0 shrink-0 z-20",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        {!isCollapsed && (
          <div className="flex items-center gap-2 font-bold text-lg text-primary tracking-tight truncate">
            <Store className="h-6 w-6 text-primary shrink-0" />
            <span className="truncate">CafeChai POS</span>
          </div>
        )}
        {isCollapsed && (
          <div className="flex w-full justify-center">
            <Store className="h-6 w-6 text-primary shrink-0" />
          </div>
        )}
        {!isCollapsed && (
          <button
            onClick={toggleCollapsed}
            className="p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 space-y-1.5 px-3 py-4">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3.5 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors cursor-pointer",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
                isCollapsed && "justify-center px-0"
              )
            }
          >
            <span className="shrink-0">{item.icon}</span>
            {!isCollapsed && <span className="truncate">{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse Toggle when collapsed */}
      {isCollapsed && (
        <div className="p-4 border-t border-border flex justify-center">
          <button
            onClick={toggleCollapsed}
            className="p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </aside>
  );
};
export default Sidebar;
