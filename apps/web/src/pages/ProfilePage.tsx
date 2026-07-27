import {
  Activity,
  ArrowRight,
  Building2,
  Mail,
  Settings,
  Shield,
  UserRound,
} from 'lucide-react';
import type { UserProfile } from '../types';

type ProfilePageProps = {
  user: UserProfile;
  userId?: string | null;
  apiOnline: boolean | null;
  onOpenSettings: () => void;
  onLogout: () => void;
};

const ROLE_META: Record<
  string,
  { label: string; summary: string; permissions: string[] }
> = {
  ADMIN: {
    label: 'Administrator',
    summary: 'Full access to fleet monitoring, commands, and workspace administration.',
    permissions: [
      'View campus overview and live telemetry',
      'Issue power, setpoint, and fan commands',
      'Review devices, alerts, and buildings',
      'Manage personal workspace preferences',
    ],
  },
  FACILITIES_MANAGER: {
    label: 'Facilities manager',
    summary: 'Operational control of buildings and AC units across campus.',
    permissions: [
      'View fleet health and load trends',
      'Issue operational commands',
      'Track open alerts and controllers',
      'Configure personal preferences',
    ],
  },
  TECHNICIAN: {
    label: 'Technician',
    summary: 'Field access for diagnosing units and executing control commands.',
    permissions: [
      'Inspect unit status and telemetry',
      'Send recovery and setpoint commands',
      'Review device connectivity',
      'Update personal preferences',
    ],
  },
  VIEWER: {
    label: 'Viewer',
    summary: 'Read-only visibility into campus AC operations.',
    permissions: [
      'View overview and unit status',
      'Inspect alerts and device health',
      'Browse buildings and controllers',
      'Update personal display preferences',
    ],
  },
  Administrator: {
    label: 'Administrator',
    summary: 'Full access to fleet monitoring, commands, and workspace administration.',
    permissions: [
      'View campus overview and live telemetry',
      'Issue power, setpoint, and fan commands',
      'Review devices, alerts, and buildings',
      'Manage personal workspace preferences',
    ],
  },
};

function resolveRole(role: string) {
  return (
    ROLE_META[role] ?? {
      label: role.replaceAll('_', ' '),
      summary: 'Facilities workspace access.',
      permissions: ['Access assigned dashboard features'],
    }
  );
}

export function ProfilePage({
  user,
  userId,
  apiOnline,
  onOpenSettings,
  onLogout,
}: ProfilePageProps) {
  const role = resolveRole(user.role);

  return (
    <div className="profile">
      <section className="profile-hero">
        <div className="profile-hero-main">
          <span className="avatar profile-avatar" aria-hidden="true">
            {user.initials}
          </span>
          <div className="profile-hero-copy">
            <p className="eyebrow">Your profile</p>
            <h2>{user.name}</h2>
            <p className="profile-email">
              <Mail size={14} />
              {user.email}
            </p>
            <div className="profile-hero-tags">
              <span className="profile-tag">
                <Shield size={13} />
                {role.label}
              </span>
              <span
                className={`profile-tag ${
                  apiOnline === null ? '' : apiOnline ? 'is-online' : 'is-offline'
                }`}
              >
                <Activity size={13} />
                {apiOnline === null
                  ? 'Checking session…'
                  : apiOnline
                    ? 'Session active'
                    : 'API offline'}
              </span>
            </div>
          </div>
        </div>

        <div className="profile-hero-actions">
          <button type="button" className="profile-btn primary" onClick={onOpenSettings}>
            <Settings size={16} />
            Open settings
          </button>
          <button type="button" className="profile-btn ghost" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </section>

      <div className="profile-grid">
        <section className="profile-card">
          <header className="profile-card-head">
            <span className="profile-card-icon">
              <UserRound size={16} />
            </span>
            <div>
              <h3>Account details</h3>
              <p>Identity returned by the authentication service</p>
            </div>
          </header>

          <div className="profile-detail-list">
            <div className="profile-detail">
              <span>Full name</span>
              <strong>{user.name}</strong>
            </div>
            <div className="profile-detail">
              <span>Email</span>
              <strong>{user.email}</strong>
            </div>
            <div className="profile-detail">
              <span>Role</span>
              <strong>{role.label}</strong>
            </div>
            <div className="profile-detail">
              <span>User ID</span>
              <strong className="profile-mono">{userId ?? '—'}</strong>
            </div>
            <div className="profile-detail">
              <span>Organization</span>
              <strong>Dar es Salaam Institute of Technology</strong>
            </div>
            <div className="profile-detail">
              <span>Workspace</span>
              <strong>AC Control · Facilities Ops</strong>
            </div>
          </div>
        </section>

        <section className="profile-card">
          <header className="profile-card-head">
            <span className="profile-card-icon">
              <Shield size={16} />
            </span>
            <div>
              <h3>Access & role</h3>
              <p>{role.summary}</p>
            </div>
          </header>

          <ul className="profile-permissions">
            {role.permissions.map((item) => (
              <li key={item}>
                <span className="profile-check" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="profile-card profile-card-span">
          <header className="profile-card-head">
            <span className="profile-card-icon">
              <Building2 size={16} />
            </span>
            <div>
              <h3>Quick links</h3>
              <p>Jump to common facilities tools</p>
            </div>
          </header>

          <div className="profile-links">
            <button type="button" className="profile-link" onClick={onOpenSettings}>
              <span>
                <strong>Workspace settings</strong>
                <small>Theme, notifications, operations defaults</small>
              </span>
              <ArrowRight size={16} />
            </button>
            <a className="profile-link" href="#main-content" onClick={(e) => e.preventDefault()}>
              <span>
                <strong>Support</strong>
                <small>Contact campus ICT / facilities for account changes</small>
              </span>
              <ArrowRight size={16} />
            </a>
          </div>

          <p className="profile-footnote">
            Name, email, and role are managed by the facilities directory. Use Settings for
            browser-local preferences only.
          </p>
        </section>
      </div>
    </div>
  );
}
