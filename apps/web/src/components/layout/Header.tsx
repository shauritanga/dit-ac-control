import { Menu, Search } from 'lucide-react';
import type { AppNotification, UserProfile } from '../../types';
import { useSidebar } from '../../context/SidebarContext';
import { ThemeToggle } from './ThemeToggle';
import { NotificationDropdown } from './NotificationDropdown';
import { UserMenu } from './UserMenu';

type HeaderProps = {
  title: string;
  subtitle?: string;
  user: UserProfile;
  notifications: AppNotification[];
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
  onProfile: () => void;
  onSettings: () => void;
  onLogout: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
};

export function Header({
  title,
  subtitle,
  user,
  notifications,
  onMarkAllRead,
  onMarkRead,
  onProfile,
  onSettings,
  onLogout,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
}: HeaderProps) {
  const { openMobile } = useSidebar();

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          type="button"
          className="icon-btn header-menu-btn"
          aria-label="Open navigation"
          onClick={openMobile}
        >
          <Menu size={20} />
        </button>

        <div className="header-titles">
          {subtitle && <p className="eyebrow">{subtitle}</p>}
          <h1>{title}</h1>
        </div>
      </div>

      <div className="header-center">
        {onSearchChange && (
          <label className="header-search">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">Search</span>
            <input
              type="search"
              value={searchValue ?? ''}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
            />
          </label>
        )}
      </div>

      <div className="header-actions">
        <ThemeToggle />
        <NotificationDropdown
          notifications={notifications}
          onMarkAllRead={onMarkAllRead}
          onMarkRead={onMarkRead}
        />
        <UserMenu
          user={user}
          onProfile={onProfile}
          onSettings={onSettings}
          onLogout={onLogout}
        />
      </div>
    </header>
  );
}
