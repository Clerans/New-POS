import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Settings as SettingsIcon, Store, X, Layers, Calendar, ShoppingCart } from 'lucide-react';
import { useSidebarStore } from '../../store/sidebarStore.js';
import { useUserStore } from '../../store/userStore.js';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils.js';

export const MobileDrawer: React.FC = () => {
  const { isOpenMobile, setMobile } = useSidebarStore();
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
    <AnimatePresence>
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobile(false)}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm cursor-pointer"
          />

          {/* Drawer Menu */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="relative flex w-full max-w-xs flex-col bg-card p-6 shadow-xl h-full border-r border-border"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
              <div className="flex items-center gap-2 font-bold text-lg text-primary tracking-tight">
                <Store className="h-6 w-6 text-primary" />
                <span>CafeChai POS</span>
              </div>
              <button
                onClick={() => setMobile(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Links */}
            <nav className="flex-1 space-y-1.5">
              {visibleItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobile(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3.5 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors cursor-pointer",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )
                  }
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span>{item.name}</span>
                </NavLink>
              ))}
            </nav>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
export default MobileDrawer;
