import type { ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  Building2,
  Cpu,
  Power,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { DailyEnergyChart, energyColorsForTheme } from '../components/DailyEnergyChart';
import type { OverviewData } from '../types';
import { useTheme } from '../context/ThemeContext';
import {
  formatPercent,
  formatPower,
  formatRelativeTime,
  formatTemp,
  severityTone,
} from '../lib/format';

type OverviewPageProps = {
  data: OverviewData | null;
  loading: boolean;
  error: string;
  onOpenOperations: (unitId?: string) => void;
  onOpenAlerts: () => void;
};

export function OverviewPage({
  data,
  loading,
  error,
  onOpenOperations,
  onOpenAlerts,
}: OverviewPageProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (loading && !data) {
    return (
      <div className="ov">
        <div className="ov-loading">
          <div className="ov-skeleton ov-skeleton-lg" />
          <div className="ov-skeleton-row">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="ov-skeleton" />
            ))}
          </div>
          <div className="ov-skeleton ov-skeleton-lg" />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="ov">
        <div className="error-box" role="alert">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary } = data;
  const energyTrend = data.dailyEnergyTrend ?? { units: [], points: [] };
  const energyColors = energyColorsForTheme(isDark);

  const healthTone =
    (summary.onlinePct ?? 0) >= 90 ? 'good' : (summary.onlinePct ?? 0) >= 70 ? 'watch' : 'bad';

  const healthLabel =
    healthTone === 'good' ? 'Fleet healthy' : healthTone === 'watch' ? 'Needs monitoring' : 'Action required';

  const offlineDevices = data.deviceHealth.filter((d) => !d.online).length;

  return (
    <div className="ov">
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}

      {/* Row 1 — status + primary KPIs */}
      <header className="ov-status">
        <div className={`ov-health ov-health-${healthTone}`}>
          <span className="ov-health-dot" aria-hidden="true" />
          <div>
            <strong>{healthLabel}</strong>
            <span>
              {formatPercent(summary.onlinePct)} online · updated {formatRelativeTime(data.generatedAt)}
            </span>
          </div>
        </div>
        <div className="ov-status-meta">
          <span>
            <Building2 size={14} /> {summary.totalBuildings ?? 0} buildings
          </span>
          <span>
            <Cpu size={14} /> {summary.devicesOnline ?? 0}/{summary.totalDevices ?? 0} controllers
          </span>
          <span>
            <Activity size={14} /> {summary.commands24h ?? 0} commands / 24h
          </span>
        </div>
      </header>

      <section className="ov-kpis" aria-label="Key metrics">
        <Kpi
          icon={<Wifi size={18} />}
          label="Online"
          value={`${summary.online}`}
          hint={`of ${summary.total} units`}
          tone="good"
        />
        <Kpi
          icon={<WifiOff size={18} />}
          label="Offline"
          value={`${summary.offline}`}
          hint={summary.offline > 0 ? 'needs check' : 'none'}
          tone={summary.offline > 0 ? 'bad' : 'neutral'}
        />
        <Kpi
          icon={<Power size={18} />}
          label="Running"
          value={`${summary.poweredOn}`}
          hint={`${summary.poweredOff ?? 0} powered off`}
          tone="neutral"
        />
        <Kpi
          icon={<AlertTriangle size={18} />}
          label="Open alerts"
          value={`${summary.openAlerts}`}
          hint={`${summary.criticalAlerts ?? 0} critical`}
          tone={summary.openAlerts > 0 ? 'watch' : 'good'}
          onClick={onOpenAlerts}
        />
      </section>

      {/* Row 2 — actionable left, trend right */}
      <section className="ov-main">
        <div className="ov-col">
          <article className="ov-card">
            <div className="ov-card-head">
              <div>
                <h2>Needs attention</h2>
                <p>Offline, alerts, high temperature, stale data</p>
              </div>
              <span className="ov-count">{data.attentionUnits.length}</span>
            </div>
            {data.attentionUnits.length === 0 ? (
              <p className="ov-empty">All units look healthy.</p>
            ) : (
              <ul className="ov-list">
                {data.attentionUnits.slice(0, 6).map((unit) => (
                  <li key={unit.id}>
                    <button
                      type="button"
                      className="ov-list-btn"
                      onClick={() => onOpenOperations(unit.id)}
                    >
                      <div className="ov-list-top">
                        <strong>{unit.name}</strong>
                        <span className={`ov-tag ov-tag-${unit.severity}`}>{unit.severity}</span>
                      </div>
                      <span className="ov-list-sub">
                        {unit.building} · {unit.room}
                        {unit.ambientTempC != null ? ` · ${formatTemp(unit.ambientTempC)}` : ''}
                      </span>
                      <span className="ov-list-reasons">{unit.reasons.slice(0, 2).join(' · ')}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="ov-card">
            <div className="ov-card-head">
              <div>
                <h2>Open alerts</h2>
                <p>
                  {summary.criticalAlerts ?? 0} critical · {summary.warningAlerts ?? 0} warning
                </p>
              </div>
            </div>
            {data.recentAlerts.length === 0 ? (
              <p className="ov-empty">No unresolved alerts.</p>
            ) : (
              <ul className="ov-list ov-list-compact">
                {data.recentAlerts.slice(0, 5).map((alert) => (
                  <li key={alert.id} className="ov-feed-row">
                    <span className={`ov-dot ov-dot-${severityTone(alert.severity)}`} />
                    <div>
                      <div className="ov-list-top">
                        <strong>{alert.title}</strong>
                        <time>{formatRelativeTime(alert.createdAt)}</time>
                      </div>
                      <span className="ov-list-sub">
                        {alert.acUnit.name} · {alert.acUnit.room.name}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>

        <div className="ov-col">
          <article className="ov-card ov-card-fill">
            <div className="ov-card-head">
              <div>
                <h2>Daily energy</h2>
                <p>Consumption for all AC units · last 7 days</p>
              </div>
              {energyTrend.units.length > 0 ? (
                <div className="ov-legend">
                  {energyTrend.units.map((unit, i) => (
                    <span key={unit.id}>
                      <i
                        className="ov-legend-swatch ov-legend-line"
                        style={{
                          background: energyColors[i % energyColors.length],
                        }}
                      />
                      {unit.name}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="ov-chart">
              <DailyEnergyChart trend={energyTrend} />
            </div>
          </article>

          <article className="ov-card">
            <div className="ov-card-head">
              <div>
                <h2>Recent activity</h2>
                <p>
                  Pending {summary.pendingCommands} · failed 24h {summary.failedCommands24h ?? 0}
                </p>
              </div>
            </div>
            {data.recentActivity.length === 0 ? (
              <p className="ov-empty">No recent activity.</p>
            ) : (
              <ul className="ov-list ov-list-compact">
                {data.recentActivity.slice(0, 6).map((item) => (
                  <li key={item.id} className="ov-feed-row">
                    <span className={`ov-kind ${item.kind === 'alert' ? 'is-alert' : 'is-cmd'}`}>
                      {item.kind === 'alert' ? <AlertTriangle size={12} /> : <Activity size={12} />}
                    </span>
                    <div>
                      <div className="ov-list-top">
                        <strong>{item.title}</strong>
                        <time>{formatRelativeTime(item.createdAt)}</time>
                      </div>
                      <span className="ov-list-sub">
                        {item.unitName} · {item.room}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      </section>

      {/* Row 3 — three equal cards, no empty side gaps */}
      <section className="ov-secondary">
        <article className="ov-card ov-card-stretch">
          <div className="ov-card-head">
            <div>
              <h2>Buildings</h2>
              <p>Coverage and live load</p>
            </div>
          </div>
          {data.buildingStats.length === 0 ? (
            <p className="ov-empty">No buildings configured.</p>
          ) : (
            <div className="ov-table-wrap">
              <table className="ov-table">
                <thead>
                  <tr>
                    <th>Building</th>
                    <th>Units</th>
                    <th>Online</th>
                    <th>Running</th>
                    <th>Alerts</th>
                    <th>Load</th>
                  </tr>
                </thead>
                <tbody>
                  {data.buildingStats.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <strong>{b.name}</strong>
                        <span className="ov-table-sub">
                          {b.floors} floors · {b.rooms} rooms
                        </span>
                      </td>
                      <td>{b.unitCount}</td>
                      <td>
                        {b.onlineCount}/{b.unitCount}
                      </td>
                      <td>{b.poweredOnCount}</td>
                      <td>
                        <span className={`ov-tag ${b.openAlerts > 0 ? 'ov-tag-warning' : 'ov-tag-good'}`}>
                          {b.openAlerts}
                        </span>
                      </td>
                      <td className="ov-num">{formatPower(b.activePowerW)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="ov-card ov-card-stretch">
          <div className="ov-card-head">
            <div>
              <h2>Top load</h2>
              <p>Highest live power</p>
            </div>
          </div>
          {data.topConsumers.length === 0 ? (
            <p className="ov-empty">No running load.</p>
          ) : (
            <ul className="ov-list ov-list-compact ov-list-grow">
              {data.topConsumers.slice(0, 5).map((unit, i) => {
                const max = data.topConsumers[0]?.activePowerW || 1;
                const pct = Math.max(6, Math.round((unit.activePowerW / max) * 100));
                return (
                  <li key={unit.id}>
                    <button
                      type="button"
                      className="ov-consumer"
                      onClick={() => onOpenOperations(unit.id)}
                    >
                      <div className="ov-list-top">
                        <span className="ov-rank">{i + 1}</span>
                        <strong>{unit.name}</strong>
                        <span className="ov-num">{formatPower(unit.activePowerW)}</span>
                      </div>
                      <span className="ov-list-sub">
                        {unit.building} · {unit.room}
                      </span>
                      <span className="ov-bar" aria-hidden="true">
                        <i style={{ width: `${pct}%` }} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </article>

        <article className="ov-card ov-card-stretch">
          <div className="ov-card-head">
            <div>
              <h2>Controllers</h2>
              <p>
                {offlineDevices > 0
                  ? `${offlineDevices} stale / offline`
                  : 'All reporting recently'}
              </p>
            </div>
            <span className="ov-count">{data.deviceHealth.length}</span>
          </div>
          <ul className="ov-device-mini ov-list-grow">
            {data.deviceHealth.slice(0, 6).map((d) => (
              <li key={d.id} className={d.online ? '' : 'is-off'}>
                <span className={`ov-dot ${d.online ? 'ov-dot-success' : 'ov-dot-critical'}`} />
                <div>
                  <strong>{d.serial}</strong>
                  <span>{d.acUnit?.name ?? 'Unassigned'}</span>
                </div>
                <time>{formatRelativeTime(d.lastSeenAt)}</time>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
  tone = 'neutral',
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
  tone?: 'neutral' | 'good' | 'watch' | 'bad';
  onClick?: () => void;
}) {
  const className = `ov-kpi ov-kpi-${tone}${onClick ? ' is-clickable' : ''}`;
  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        <span className="ov-kpi-icon">{icon}</span>
        <span className="ov-kpi-label">{label}</span>
        <strong className="ov-kpi-value">{value}</strong>
        <span className="ov-kpi-hint">{hint}</span>
      </button>
    );
  }
  return (
    <div className={className}>
      <span className="ov-kpi-icon">{icon}</span>
      <span className="ov-kpi-label">{label}</span>
      <strong className="ov-kpi-value">{value}</strong>
      <span className="ov-kpi-hint">{hint}</span>
    </div>
  );
}
