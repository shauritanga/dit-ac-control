import { useCallback, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { ThemeProvider } from './context/ThemeContext';
import { SidebarProvider } from './context/SidebarContext';
import { PreferencesProvider, usePreferences } from './context/PreferencesContext';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { OverviewPage } from './pages/OverviewPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { ReportsPage } from './pages/ReportsPage';
import { HistoryPage } from './pages/HistoryPage';
import { apiRequest, SOCKET_URL } from './lib/api';
import { formatRelativeTime, severityTone } from './lib/format';
import type {
  AcUnit,
  AppNotification,
  NavItem,
  OverviewData,
  Summary,
  UserProfile,
} from './types';
import type { WorkspacePreferences } from './context/PreferencesContext';

const TOKEN_KEY = 'dit-ac-token';
const READ_NOTIFICATIONS_KEY = 'dit-ac-read-notifications';

function loadReadNotificationIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_NOTIFICATIONS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

function saveReadNotificationIds(ids: Set<string>) {
  try {
    // Cap growth — keep the most recent 200 dismissed ids
    const list = Array.from(ids).slice(-200);
    localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(list));
  } catch {
    // ignore quota / private mode
  }
}

function markNotificationIdsRead(ids: string[]) {
  if (ids.length === 0) return;
  const stored = loadReadNotificationIds();
  for (const id of ids) stored.add(id);
  saveReadNotificationIds(stored);
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: 'overview' },
  { id: 'operations', label: 'Operations', icon: 'operations' },
  { id: 'buildings', label: 'Buildings', icon: 'buildings' },
  { id: 'history', label: 'History', icon: 'history' },
  { id: 'reports', label: 'Reports', icon: 'reports' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

const FALLBACK_USER: UserProfile = {
  name: 'Facilities Admin',
  email: 'admin@dit.ac.tz',
  role: 'Administrator',
  initials: 'FA',
};

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

function toUserProfile(user: AuthUser | null): UserProfile {
  if (!user) return FALLBACK_USER;
  const parts = user.name.trim().split(/\s+/);
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : user.name.slice(0, 2).toUpperCase();
  return {
    name: user.name,
    email: user.email,
    role: user.role,
    initials,
  };
}

function notificationsFromOverview(
  overview: OverviewData | null,
  prefs: WorkspacePreferences,
): AppNotification[] {
  if (!overview) return [];

  const items: AppNotification[] = [];

  // Offline units
  if (prefs.notifyOffline) {
    for (const unit of overview.attentionUnits.filter((u) => !u.online)) {
      items.push({
        id: `offline-${unit.id}`,
        title: 'Unit offline',
        message: `${unit.name} · ${unit.building} / ${unit.room}`,
        time: unit.lastSeenAt ? formatRelativeTime(unit.lastSeenAt) : 'No recent signal',
        read: false,
        severity: 'critical',
      });
    }
  }

  // Power outside min–max band (live)
  if (prefs.notifyHighPower) {
    for (const unit of overview.topConsumers) {
      const w = unit.activePowerW;
      if (unit.powerState === 'ON' && w > 0 && w < prefs.powerThresholdMinW) {
        items.push({
          id: `power-low-${unit.id}`,
          title: 'Possible malfunction',
          message: `${unit.name} · ${Math.round(w)} W below minimum ${prefs.powerThresholdMinW} W`,
          time: 'Live',
          read: false,
          severity: 'warning',
        });
      }
      if (w >= prefs.powerThresholdMaxW) {
        items.push({
          id: `power-high-${unit.id}`,
          title: 'High power draw',
          message: `${unit.name} · ${Math.round(w)} W at or above maximum ${prefs.powerThresholdMaxW} W`,
          time: 'Live',
          read: false,
          severity: 'warning',
        });
      }
    }
  }

  // Server-side alerts (faults, power band from API, etc.)
  for (const alert of overview.recentAlerts) {
    const tone = severityTone(alert.severity);
    const isPower =
      /high power/i.test(alert.title) ||
      /malfunction/i.test(alert.title) ||
      /low power/i.test(alert.title);
    const isOffline = /offline/i.test(alert.title);
    if (isPower && !prefs.notifyHighPower) continue;
    if (isOffline && !prefs.notifyOffline) continue;

    items.push({
      id: `alert-${alert.id}`,
      title: alert.title,
      message: `${alert.acUnit.name} · ${alert.message}`,
      time: formatRelativeTime(alert.createdAt),
      read: false,
      severity: (tone === 'critical'
        ? 'critical'
        : tone === 'warning'
          ? 'warning'
          : 'info') as AppNotification['severity'],
    });
  }

  // Failed commands
  if (prefs.notifyFailedCommand) {
    for (const cmd of overview.recentCommands.filter((c) => c.status === 'FAILED').slice(0, 4)) {
      items.push({
        id: `cmd-${cmd.id}`,
        title: 'Command failed',
        message: `${cmd.type.replaceAll('_', ' ')} on ${cmd.acUnit.name}`,
        time: formatRelativeTime(cmd.createdAt),
        read: false,
        severity: 'critical',
      });
    }
  }

  // Dedupe by id
  const seen = new Set<string>();
  return items
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .slice(0, 10);
}

function AuthenticatedApp({
  token,
  onLogout,
}: {
  token: string;
  onLogout: () => void;
}) {
  const { preferences } = usePreferences();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [units, setUnits] = useState<AcUnit[]>([]);
  const [selected, setSelected] = useState<AcUnit | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [overviewError, setOverviewError] = useState('');
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [activeNav, setActiveNav] = useState('overview');
  const [pendingUnitId, setPendingUnitId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toast, setToast] = useState('');
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const userId = authUser?.id ?? null;

  const user = useMemo(() => toUserProfile(authUser), [authUser]);

  const api = useCallback(
    <T,>(path: string, options?: RequestInit) => apiRequest<T>(path, token, options),
    [token],
  );

  useEffect(() => {
    void (async () => {
      try {
        const me = await api<AuthUser>('/auth/me');
        setAuthUser(me);
        setApiOnline(true);
      } catch {
        setApiOnline(false);
      }
    })();
  }, [api]);

  const loadOverview = useCallback(async () => {
    try {
      const data = await api<OverviewData>('/dashboard/overview');
      setOverview(data);
      setSummary(data.summary);
      setOverviewError('');
      setApiOnline(true);
    } catch (err) {
      setApiOnline(false);
      setOverviewError(
        err instanceof TypeError
          ? 'Cannot reach API.'
          : err instanceof Error
            ? err.message
            : 'Unable to load overview.',
      );
    } finally {
      setOverviewLoading(false);
    }
  }, [api]);

  // Rebuild notification list when overview data or notification prefs change.
  // Read state is restored from localStorage so refresh doesn't resurrect unread items.
  useEffect(() => {
    if (!overview) return;
    const storedRead = loadReadNotificationIds();
    setNotifications((current) => {
      const next = notificationsFromOverview(overview, preferences);
      return next.map((item) => {
        const prev = current.find((c) => c.id === item.id);
        const read = storedRead.has(item.id) || Boolean(prev?.read);
        return { ...item, read };
      });
    });
  }, [
    overview,
    preferences.notifyOffline,
    preferences.notifyHighPower,
    preferences.notifyFailedCommand,
    preferences.powerThresholdMinW,
    preferences.powerThresholdMaxW,
  ]);

  const loadOperations = useCallback(async () => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (status !== 'all') params.set('status', status);

    try {
      const [nextSummary, nextUnits] = await Promise.all([
        api<Summary>('/dashboard/summary'),
        api<AcUnit[]>(`/ac-units?${params.toString()}`),
      ]);
      setError('');
      setApiOnline(true);
      setSummary(nextSummary);
      setUnits(nextUnits);
      setSelected((current) => {
        if (pendingUnitId) {
          const match = nextUnits.find((unit) => unit.id === pendingUnitId);
          if (match) return match;
        }
        return nextUnits.find((unit) => unit.id === current?.id) ?? nextUnits[0] ?? null;
      });
      if (pendingUnitId) setPendingUnitId(null);
    } catch (err) {
      setApiOnline(false);
      setError(
        err instanceof TypeError
          ? 'Cannot reach API.'
          : err instanceof Error
            ? err.message
            : 'Unable to load dashboard data.',
      );
    }
  }, [api, query, status, pendingUnitId]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (
      activeNav === 'operations' ||
      activeNav === 'buildings' ||
      activeNav === 'history'
    ) {
      void loadOperations();
    }
  }, [activeNav, loadOperations]);

  useEffect(() => {
    if (!preferences.autoRefresh) return;

    const socket = io(SOCKET_URL);
    const refresh = () => {
      void loadOverview();
      if (activeNav === 'operations') void loadOperations();
    };
    socket.on('telemetry.updated', refresh);
    socket.on('command.updated', refresh);
    socket.on('alert.created', refresh);
    return () => {
      socket.disconnect();
    };
  }, [loadOverview, loadOperations, activeNav, preferences.autoRefresh]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function issue(type: string, payload: Record<string, unknown>) {
    if (!selected) return;

    if (preferences.confirmCommands) {
      const label = type.replaceAll('_', ' ').toLowerCase();
      const ok = window.confirm(
        `Send ${label} command to ${selected.name}?`,
      );
      if (!ok) return;
    }

    await api(`/ac-units/${selected.id}/commands`, {
      method: 'POST',
      body: JSON.stringify({ type, payload }),
    });
    setNotice(`${selected.name}: command queued`);
    await Promise.all([loadOperations(), loadOverview()]);
  }

  const pageMeta = useMemo(() => {
    switch (activeNav) {
      case 'overview':
        return {
          title: 'System overview',
          subtitle: 'Dar es Salaam Institute of Technology',
        };
      case 'buildings':
        return { title: 'Buildings', subtitle: 'Campus structure' };
      case 'reports':
        return { title: 'Reports', subtitle: 'View energy consumption and cost reports.' };
      case 'history':
        return { title: 'Telemetry history', subtitle: 'Received device readings' };
      case 'settings':
        return { title: 'Settings', subtitle: 'Workspace preferences' };
      case 'profile':
        return { title: 'Profile', subtitle: 'Your account' };
      case 'operations':
        return {
          title: 'Building AC operations',
          subtitle: 'Live control console',
        };
      default:
        return {
          title: 'DIT AC Control',
          subtitle: 'Facilities operations',
        };
    }
  }, [activeNav]);

  function openOperations(unitId?: string) {
    if (unitId) setPendingUnitId(unitId);
    setActiveNav('operations');
  }

  function openProfile() {
    setActiveNav('profile');
  }

  function openSettings() {
    setActiveNav('settings');
  }

  return (
    <>
      <AppShell
        navItems={NAV_ITEMS}
        activeNav={activeNav}
        onNavigate={setActiveNav}
        title={pageMeta.title}
        subtitle={pageMeta.subtitle}
        user={user}
        notifications={notifications}
        onMarkAllRead={() => {
          setNotifications((items) => {
            markNotificationIdsRead(items.map((item) => item.id));
            return items.map((item) => ({ ...item, read: true }));
          });
        }}
        onMarkRead={(id) => {
          markNotificationIdsRead([id]);
          setNotifications((items) =>
            items.map((item) => (item.id === id ? { ...item, read: true } : item)),
          );
        }}
        onProfile={openProfile}
        onSettings={() => openSettings()}
        onLogout={onLogout}
        searchValue={query}
        onSearchChange={(value) => {
          setQuery(value);
          if (activeNav === 'overview') setActiveNav('operations');
        }}
        searchPlaceholder="Search units, rooms, assets…"
      >
        {activeNav === 'overview' && (
          <OverviewPage
            data={overview}
            loading={overviewLoading}
            error={overviewError}
            onOpenOperations={openOperations}
            onOpenAlerts={() => setActiveNav('reports')}
          />
        )}

        {activeNav === 'operations' && (
          <DashboardPage
            summary={summary}
            units={units}
            selected={selected}
            onSelect={setSelected}
            query={query}
            onQueryChange={setQuery}
            status={status}
            onStatusChange={(value) =>
              setStatus(value as typeof status)
            }
            notice={notice}
            error={error}
            onIssue={issue}
          />
        )}

        {activeNav === 'history' && <HistoryPage units={units} api={api} />}

        {activeNav === 'buildings' && overview && (
          <div className="page-shell">
            <section className="ov-card page-fill-card">
              <div className="ov-card-head">
                <div>
                  <h2>Campus buildings</h2>
                  <p>Structural coverage for the AC control domain</p>
                </div>
                <span className="ov-count">{overview.buildingStats.length}</span>
              </div>
              <div className="ov-table-wrap page-fill-list">
                <table className="ov-table">
                  <thead>
                    <tr>
                      <th>Building</th>
                      <th>Floors</th>
                      <th>Rooms</th>
                      <th>Units</th>
                      <th>Online</th>
                      <th>Alerts</th>
                      <th>Load</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.buildingStats.map((building) => (
                      <tr key={building.id}>
                        <td>
                          <strong>{building.name}</strong>
                          <span className="ov-table-sub">{building.campus ?? '—'}</span>
                        </td>
                        <td>{building.floors}</td>
                        <td>{building.rooms}</td>
                        <td>{building.unitCount}</td>
                        <td>
                          {building.onlineCount}/{building.unitCount}
                        </td>
                        <td>{building.openAlerts}</td>
                        <td className="ov-num">{Math.round(building.activePowerW)} W</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {activeNav === 'reports' && <ReportsPage api={api} />}

        {activeNav === 'profile' && (
          <ProfilePage
            user={user}
            userId={userId}
            apiOnline={apiOnline}
            onOpenSettings={() => openSettings()}
            onLogout={onLogout}
          />
        )}

        {activeNav === 'settings' && (
          <SettingsPage onSaved={(message) => setToast(message)} />
        )}
      </AppShell>

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </>
  );
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? '');

  function handleLogin(nextToken: string) {
    localStorage.setItem(TOKEN_KEY, nextToken);
    setToken(nextToken);
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken('');
  }

  return (
    <ThemeProvider>
      <PreferencesProvider>
        <SidebarProvider>
          {token ? (
            <AuthenticatedApp token={token} onLogout={handleLogout} />
          ) : (
            <LoginPage onSuccess={handleLogin} />
          )}
        </SidebarProvider>
      </PreferencesProvider>
    </ThemeProvider>
  );
}
