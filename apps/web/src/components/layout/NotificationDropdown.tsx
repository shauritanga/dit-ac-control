import { useCallback, useId, useRef, useState } from 'react';
import { AlertTriangle, Bell, CheckCircle2, Info, XCircle } from 'lucide-react';
import type { AppNotification } from '../../types';
import { useClickOutside } from '../../hooks/useClickOutside';

type NotificationDropdownProps = {
  notifications: AppNotification[];
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
};

const severityIcon = {
  info: Info,
  warning: AlertTriangle,
  critical: XCircle,
  success: CheckCircle2,
};

export function NotificationDropdown({
  notifications,
  onMarkAllRead,
  onMarkRead,
}: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const unread = notifications.filter((item) => !item.read).length;

  const close = useCallback(() => setOpen(false), []);
  useClickOutside(rootRef, close, open);

  return (
    <div className="notification-menu" ref={rootRef}>
      <button
        type="button"
        className="icon-btn"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={18} strokeWidth={1.75} />
        {unread > 0 && <span className="badge-dot">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="popover-panel notification-panel" id={panelId} role="dialog" aria-label="Notifications">
          <div className="notification-panel-header">
            <div>
              <h2>Notifications</h2>
              <p>{unread > 0 ? `${unread} unread` : 'You are all caught up'}</p>
            </div>
            {unread > 0 && (
              <button type="button" className="text-btn" onClick={onMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <Bell size={22} />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((item) => {
                const Icon = severityIcon[item.severity];
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`notification-item ${item.read ? '' : 'unread'}`}
                    onClick={() => onMarkRead(item.id)}
                  >
                    <span className={`notification-icon severity-${item.severity}`}>
                      <Icon size={16} />
                    </span>
                    <span className="notification-body">
                      <span className="notification-title">{item.title}</span>
                      <span className="notification-message">{item.message}</span>
                      <span className="notification-time">{item.time}</span>
                    </span>
                    {!item.read && <span className="unread-pip" aria-hidden="true" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
