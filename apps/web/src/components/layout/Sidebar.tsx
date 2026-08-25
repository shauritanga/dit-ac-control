import {
  Activity,
  Building2,
  ChevronLeft,
  ChevronRight,
  FileBarChart2,
  History,
  LayoutDashboard,
  Settings,
  X,
} from 'lucide-react';
import type { NavItem } from '../../types';
import { useSidebar } from '../../context/SidebarContext';
import { DitLogo } from '../DitLogo';

const ICONS = {
  overview: LayoutDashboard,
  operations: Activity,
  buildings: Building2,
  history: History,
  reports: FileBarChart2,
  settings: Settings,
} as const;

type SidebarProps = {
  items: NavItem[];
  activeId: string;
  onNavigate: (id: string) => void;
};

export function Sidebar({ items, activeId, onNavigate }: SidebarProps) {
  const { collapsed, mobileOpen, toggleCollapsed, closeMobile } = useSidebar();

  return (
    <>
      {mobileOpen && <button type="button" className="sidebar-backdrop" aria-label="Close menu" onClick={closeMobile} />}

      <aside
        className={[
          'sidebar',
          collapsed ? 'sidebar-collapsed' : '',
          mobileOpen ? 'sidebar-mobile-open' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label="Primary"
      >
        <div className="sidebar-top">
          <div className="brand-row">
            <DitLogo size={40} className="brand-logo" />
            <div className="brand-text">
              <span className="brand-title">AC Control</span>
              <span className="brand-subtitle">DIT Facilities</span>
            </div>
          </div>

          <button
            type="button"
            className="icon-btn sidebar-mobile-close"
            aria-label="Close navigation"
            onClick={closeMobile}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <p className="sidebar-section-label">Workspace</p>
          {items.map((item) => {
            const Icon = ICONS[item.icon];
            const active = item.id === activeId;
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${active ? 'active' : ''}`}
                aria-current={active ? 'page' : undefined}
                title={collapsed ? item.label : undefined}
                onClick={() => {
                  onNavigate(item.id);
                  closeMobile();
                }}
              >
                <Icon size={18} strokeWidth={1.75} />
                <span className="nav-label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            <span className="nav-label">{collapsed ? 'Expand' : 'Collapse'}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
