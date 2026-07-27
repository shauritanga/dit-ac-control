import type { ReactNode } from 'react';
import type { AppNotification, NavItem, UserProfile } from '../../types';
import { useSidebar } from '../../context/SidebarContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

type AppShellProps = {
  navItems: NavItem[];
  activeNav: string;
  onNavigate: (id: string) => void;
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
  children: ReactNode;
};

export function AppShell({
  navItems,
  activeNav,
  onNavigate,
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
  searchPlaceholder,
  children,
}: AppShellProps) {
  const { collapsed } = useSidebar();

  return (
    <div className={`app-shell ${collapsed ? 'is-collapsed' : ''}`}>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <Sidebar items={navItems} activeId={activeNav} onNavigate={onNavigate} />

      <div className="app-main">
        <Header
          title={title}
          subtitle={subtitle}
          user={user}
          notifications={notifications}
          onMarkAllRead={onMarkAllRead}
          onMarkRead={onMarkRead}
          onProfile={onProfile}
          onSettings={onSettings}
          onLogout={onLogout}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
        />

        <main id="main-content" className="app-content">
          {children}
        </main>
      </div>
    </div>
  );
}
