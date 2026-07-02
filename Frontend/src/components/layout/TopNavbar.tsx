import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { useSidebarStore } from '../../store/sidebarStore.js';
import { Breadcrumb } from './Breadcrumb.js';
import { SearchInput } from '../ui/SearchInput.js';
import { QuickActions } from './QuickActions.js';
import { NotificationsDropdown } from './NotificationsDropdown.js';
import { UserProfileMenu } from './UserProfileMenu.js';

export const TopNavbar: React.FC = () => {
  const { toggleMobile } = useSidebarStore();
  const [searchValue, setSearchValue] = useState('');

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6 sticky top-0 z-10 select-none">
      {/* Left items: Mobile toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleMobile}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground md:hidden cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden sm:block">
          <Breadcrumb />
        </div>
      </div>

      {/* Center item: Search bar (hidden on extra small screens) */}
      <div className="hidden md:block w-72 max-w-xs">
        <SearchInput
          value={searchValue}
          onChange={setSearchValue}
          placeholder="Global search..."
          enableShortcut={true}
        />
      </div>

      {/* Right items: Actions, notifications, user menu */}
      <div className="flex items-center gap-3">
        <QuickActions />
        <NotificationsDropdown />
        <span className="h-6 w-px bg-border hidden md:block" />
        <UserProfileMenu />
      </div>
    </header>
  );
};
export default TopNavbar;
