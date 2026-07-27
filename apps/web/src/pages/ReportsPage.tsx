import { useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  FileBarChart2,
  Power,
  Printer,
  Thermometer,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';
import type { AcUnit, OverviewData } from '../types';
import { usePreferences } from '../context/PreferencesContext';
import {
  formatPower,
  formatRelativeTime,
  formatTemp,
  severityTone,
} from '../lib/format';

type ReportsPageProps = {
  data: OverviewData | null;
  units: AcUnit[];
  loading: boolean;
  error: string;
  onOpenOperations: (unitId?: string) => void;
};

export function ReportsPage({
  data,
  units,
  loading,
  error,
  onOpenOperations,
}: ReportsPageProps) {
  const { preferences } = usePreferences();
  const generatedAt = useMemo(() => new Date(), [data?.generatedAt]);

  const minW = preferences.powerThresholdMinW;
  const maxW = preferences.powerThresholdMaxW;

  if (loading && !data && units.length === 0) {
    return (
      <div className="reports-page">
        <div className="settings-card">
          <p className="muted">Loading report data…</p>
        </div>
      </div>
    );
  }

  if (error && !data && units.length === 0) {
    return (
      <div className="reports-page">
        <div className="error-box" role="alert">
          {error}
        </div>
      </div>
    );
  }

  const summary = data?.summary ?? null;
  const sortedUnits = [...units].sort((a, b) => a.name.localeCompare(b.name));

  function powerBandStatus(powerState: string, watts: number | undefined) {
    const w = watts ?? 0;
    if (watts == null && powerState === 'UNKNOWN') {
      return { label: 'No data', tone: 'info' as const };
    }
    if (powerState === 'ON' && w < minW) {
      return { label: 'Below min (fault risk)', tone: 'warning' as const };
    }
    if (w >= maxW && maxW > 0) {
      return { label: 'Above max (overload)', tone: 'critical' as const };
    }
    if (powerState === 'ON') {
      return { label: 'Within band', tone: 'success' as const };
    }
    if (powerState === 'OFF') {
      return { label: 'Powered off', tone: 'info' as const };
    }
    return { label: 'No data', tone: 'info' as const };
  }

  function tagClass(tone: 'success' | 'warning' | 'critical' | 'info') {
    if (tone === 'success') return 'ov-tag-good';
    if (tone === 'critical') return 'ov-tag-critical';
    if (tone === 'warning') return 'ov-tag-warning';
    return 'ov-tag-info';
  }

  return (
    <div className="reports-page">
      <header className="reports-hero">
        <div className="reports-hero-brand">
          <div>
            <p className="eyebrow">Fleet snapshot</p>
            <h2>Reports</h2>
            <p>
              Status report for the two prototype air conditioners — online state, power band, and
              incidents.
            </p>
          </div>
        </div>
        <div className="reports-hero-actions">
          <div className="reports-meta">
            <span>Generated</span>
            <strong>
              {generatedAt.toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </strong>
          </div>
          <button
            type="button"
            className="reports-print-btn no-print-hide"
            onClick={() => window.print()}
          >
            <Printer size={16} />
            Print / PDF
          </button>
        </div>
      </header>

      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}

      <section className="reports-kpis" aria-label="Summary">
        <div className="reports-kpi">
          <Wifi size={18} />
          <div>
            <span>Online</span>
            <strong>
              {summary ? `${summary.online}/${summary.total}` : `${sortedUnits.filter((u) => u.online).length}/${sortedUnits.length}`}
            </strong>
          </div>
        </div>
        <div className="reports-kpi">
          <Power size={18} />
          <div>
            <span>Running</span>
            <strong>
              {summary?.poweredOn ??
                sortedUnits.filter((u) => u.powerState === 'ON').length}
            </strong>
          </div>
        </div>
        <div className="reports-kpi">
          <Zap size={18} />
          <div>
            <span>Live load</span>
            <strong>
              {formatPower(
                summary?.activePowerW ??
                  sortedUnits.reduce(
                    (sum, u) => sum + (u.telemetry[0]?.activePowerW ?? 0),
                    0,
                  ),
              )}
            </strong>
          </div>
        </div>
        <div className="reports-kpi">
          <AlertTriangle size={18} />
          <div>
            <span>Open alerts</span>
            <strong>
              {summary?.openAlerts ??
                sortedUnits.reduce((sum, u) => sum + u.alerts.length, 0)}
            </strong>
          </div>
        </div>
        <div className="reports-kpi">
          <Activity size={18} />
          <div>
            <span>Power band</span>
            <strong>
              {minW}–{maxW} W
            </strong>
          </div>
        </div>
      </section>

      <section className="settings-card reports-section">
        <div className="settings-card-header">
          <div>
            <h3>Unit status report</h3>
            <p>Lab 1 AC (DIT-AC-001) and Lab 2 AC (DIT-AC-002).</p>
          </div>
          <span className="ov-count">{sortedUnits.length}</span>
        </div>

        {sortedUnits.length === 0 ? (
          <div className="reports-empty">
            <FileBarChart2 size={28} />
            <p>No AC units found. Seed the database with the two prototype units.</p>
          </div>
        ) : (
          <div className="ov-table-wrap">
            <table className="ov-table reports-table">
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Location</th>
                  <th>Link</th>
                  <th>Power</th>
                  <th>Ambient</th>
                  <th>Load</th>
                  <th>Power band</th>
                  <th>Alerts</th>
                  <th className="no-print-hide" />
                </tr>
              </thead>
              <tbody>
                {sortedUnits.map((unit) => {
                  const watts = unit.telemetry[0]?.activePowerW;
                  const ambient = unit.telemetry[0]?.ambientTempC;
                  const band = powerBandStatus(unit.powerState, watts);
                  return (
                    <tr key={unit.id}>
                      <td>
                        <strong>{unit.name}</strong>
                        <span className="ov-table-sub">{unit.assetTag}</span>
                      </td>
                      <td>
                        {unit.room.floor.building.name}
                        <span className="ov-table-sub">{unit.room.name}</span>
                      </td>
                      <td>
                        <span className={`ov-tag ${unit.online ? 'ov-tag-good' : 'ov-tag-critical'}`}>
                          {unit.online ? (
                            <>
                              <Wifi size={12} /> Online
                            </>
                          ) : (
                            <>
                              <WifiOff size={12} /> Offline
                            </>
                          )}
                        </span>
                      </td>
                      <td>{unit.powerState}</td>
                      <td>{formatTemp(ambient)}</td>
                      <td className="ov-num">{formatPower(watts)}</td>
                      <td>
                        <span className={`ov-tag ${tagClass(band.tone)}`}>{band.label}</span>
                      </td>
                      <td>{unit.alerts.length}</td>
                      <td className="no-print-hide">
                        <button
                          type="button"
                          className="text-btn"
                          onClick={() => onOpenOperations(unit.id)}
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="reports-two-col">
        <section className="settings-card reports-section">
          <div className="settings-card-header">
            <div>
              <h3>Open alerts</h3>
              <p>Unresolved incidents (malfunction, overload, faults).</p>
            </div>
          </div>
          {!data || data.recentAlerts.length === 0 ? (
            <p className="ov-empty">No open alerts.</p>
          ) : (
            <ul className="ov-list ov-list-compact">
              {data.recentAlerts.map((alert) => (
                <li key={alert.id} className="ov-feed-row">
                  <span className={`ov-dot ov-dot-${severityTone(alert.severity)}`} />
                  <div>
                    <div className="ov-list-top">
                      <strong>{alert.title}</strong>
                      <time>{formatRelativeTime(alert.createdAt)}</time>
                    </div>
                    <span className="ov-list-sub">{alert.message}</span>
                    <span className="ov-list-reasons">
                      {alert.acUnit.name} · {alert.acUnit.room.name}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="settings-card reports-section">
          <div className="settings-card-header">
            <div>
              <h3>Recent commands</h3>
              <p>Actions issued from Operations (and their results).</p>
            </div>
          </div>
          {!data || data.recentCommands.length === 0 ? (
            <p className="ov-empty">No commands recorded yet.</p>
          ) : (
            <ul className="ov-list ov-list-compact">
              {data.recentCommands.slice(0, 12).map((cmd) => (
                <li key={cmd.id} className="ov-feed-row">
                  <span
                    className={`ov-dot ov-dot-${
                      cmd.status === 'FAILED'
                        ? 'critical'
                        : cmd.status === 'ACKED'
                          ? 'success'
                          : 'warning'
                    }`}
                  />
                  <div>
                    <div className="ov-list-top">
                      <strong>
                        {cmd.type.replaceAll('_', ' ')} · {cmd.status}
                      </strong>
                      <time>{formatRelativeTime(cmd.createdAt)}</time>
                    </div>
                    <span className="ov-list-sub">
                      {cmd.acUnit.name}
                      {cmd.result ? ` · ${cmd.result}` : ''}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="settings-card reports-section">
        <div className="reports-footnote">
          <Thermometer size={16} />
          <p>
            Power band for this report: minimum <strong>{minW} W</strong>, maximum{' '}
            <strong>{maxW} W</strong> (from Settings). Change thresholds under Settings → Power
            thresholds.
          </p>
        </div>
      </section>
    </div>
  );
}
