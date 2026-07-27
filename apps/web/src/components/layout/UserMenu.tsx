import { useCallback, useId, useRef, useState } from 'react';
import { ChevronDown, LogOut, Settings, User } from 'lucide-react';
import type { UserProfile } from '../../types';
import { useClickOutside } from '../../hooks/useClickOutside';

type UserMenuProps = {
  user: UserProfile;
  onProfile: () => void;
  onSettings: () => void;
  onLogout: () => void;
};

export function UserMenu({ user, onProfile, onSettings, onLogout }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback(() => setOpen(false), []);
  useClickOutside(rootRef, close, open);

  function handleAction(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        className="user-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="avatar" aria-hidden="true">
          {user.initials}
        </span>
        <span className="user-menu-meta">
          <span className="user-menu-name">{user.name}</span>
          <span className="user-menu-role">{user.role}</span>
        </span>
        <ChevronDown
          size={16}
          className={`user-menu-chevron ${open ? 'open' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="popover-panel user-menu-panel" id={menuId} role="menu">
          <div className="user-menu-header">
            <span className="avatar avatar-lg" aria-hidden="true">
              {user.initials}
            </span>
            <div>
              <p className="user-menu-name">{user.name}</p>
              <p className="user-menu-email">{user.email}</p>
            </div>
          </div>

          <div className="popover-divider" />

          <button type="button" role="menuitem" className="menu-item" onClick={() => handleAction(onProfile)}>
            <User size={16} />
            Profile
          </button>
          <button type="button" role="menuitem" className="menu-item" onClick={() => handleAction(onSettings)}>
            <Settings size={16} />
            Settings
          </button>

          <div className="popover-divider" />

          <button
            type="button"
            role="menuitem"
            className="menu-item menu-item-danger"
            onClick={() => handleAction(onLogout)}
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
