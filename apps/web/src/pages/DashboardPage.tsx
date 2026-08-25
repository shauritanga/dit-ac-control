import { useMemo } from 'react';
import {
  AlertTriangle,
  Gauge,
  Power,
  Search,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AcUnit, Summary } from '../types';
import { useTheme } from '../context/ThemeContext';
import { formatPower, formatTemp } from '../lib/format';

type DashboardPageProps = {
  summary: Summary | null;
  units: AcUnit[];
  selected: AcUnit | null;
  onSelect: (unit: AcUnit) => void;
  query: string;
  onQueryChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  notice: string;
  error: string;
  onIssue: (type: string, payload: Record<string, unknown>) => void;
};

export function DashboardPage({
  summary,
  units,
  selected,
  onSelect,
  query,
  onQueryChange,
  status,
  onStatusChange,
  notice,
  error,
  onIssue,
}: DashboardPageProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const chartData = useMemo(
    () =>
      [...(selected?.telemetry ?? [])].reverse().map((row, index) => ({
        name: `${index + 1}`,
        temp: row.ambientTempC ?? 0,
        power: row.activePowerW ?? 0,
      })),
    [selected],
  );

  const gridStroke = isDark ? '#2a3548' : '#e8ecf1';
  const axisStroke = isDark ? '#8b9bb3' : '#64748b';
  const tooltipStyle = {
    background: isDark ? '#121a2a' : '#fff',
    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
    borderRadius: 8,
    color: isDark ? '#e8eef7' : '#0f172a',
    fontSize: 12,
  };

  return (
    <div className="ops">
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}

      <div className="ops-strip" aria-label="Fleet summary">
        <div className="ops-strip-item">
          <span>Online</span>
          <strong>
            {summary?.online ?? 0}/{summary?.total ?? 0}
          </strong>
        </div>
        <div className="ops-strip-item">
          <span>Running</span>
          <strong>{summary?.poweredOn ?? 0}</strong>
        </div>
        <div className="ops-strip-item">
          <span>Alerts</span>
          <strong className={(summary?.openAlerts ?? 0) > 0 ? 'is-warn' : ''}>
            {summary?.openAlerts ?? 0}
          </strong>
        </div>
        <div className="ops-strip-item">
          <span>Load</span>
          <strong>{formatPower(summary?.activePowerW)}</strong>
        </div>
        <div className="ops-strip-item">
          <span>Pending cmds</span>
          <strong>{summary?.pendingCommands ?? 0}</strong>
        </div>
      </div>

      <section className="ops-workspace">
        <aside className="ops-list panel">
          <div className="ops-list-head">
            <h2>Units</h2>
            <span className="ov-count">{units.length}</span>
          </div>

          <div className="ops-filters">
            <label className="ops-search">
              <Search size={15} aria-hidden="true" />
              <span className="sr-only">Filter units</span>
              <input
                placeholder="Search room or asset"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
              />
            </label>
            <select
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="all">All</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="on">On</option>
              <option value="off">Off</option>
            </select>
          </div>

          <div className="ops-unit-list" role="listbox" aria-label="AC unit list">
            {units.length === 0 ? (
              <p className="ov-empty">No units match filters.</p>
            ) : (
              units.map((unit) => {
                const active = selected?.id === unit.id;
                return (
                  <button
                    key={unit.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`ops-unit ${active ? 'is-active' : ''}`}
                    onClick={() => onSelect(unit)}
                  >
                    <span className="ops-unit-top">
                      <strong>{unit.name}</strong>
                      <span className={`ops-dot ${unit.online ? 'on' : 'off'}`} />
                    </span>
                    <span className="ops-unit-sub">
                      {unit.room.floor.building.name} · {unit.room.name}
                    </span>
                    <span className="ops-unit-meta">
                      {unit.online ? <Wifi size={13} /> : <WifiOff size={13} />}
                      {unit.powerState}
                      <span>·</span>
                      {formatTemp(unit.telemetry[0]?.ambientTempC)}
                      <span>·</span>
                      {formatPower(unit.telemetry[0]?.activePowerW)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <div className="ops-detail panel">
          {selected ? (
            <>
              <header className="ops-detail-head">
                <div>
                  <p className="eyebrow">
                    {selected.assetTag} · {selected.room.code}
                  </p>
                  <h2>{selected.name}</h2>
                  <p className="ops-detail-loc">
                    {selected.room.floor.building.name} · {selected.room.floor.name} ·{' '}
                    {selected.room.name}
                  </p>
                </div>
                <span className={`status-pill ${selected.online ? 'online' : 'offline'}`}>
                  <span className="status-pip" aria-hidden="true" />
                  {selected.online ? 'Online' : 'Offline'}
                </span>
              </header>

              <div className="ops-detail-body">
                <section className="ops-section">
                  <h3>Controls</h3>
                  <div className="ops-controls">
                    <button
                      type="button"
                      className="ops-ctrl"
                      onClick={() =>
                        onIssue('POWER', {
                          powerState: selected.powerState === 'ON' ? 'OFF' : 'ON',
                        })
                      }
                    >
                      <Power size={16} />
                      Power {selected.powerState === 'ON' ? 'off' : 'on'}
                    </button>
                  </div>
                  {notice && <p className="notice">{notice}</p>}
                </section>

                <section className="ops-section">
                  <h3>Live readings</h3>
                  <div className="ops-readings">
                    <div>
                      <span>Setpoint</span>
                      <strong>{selected.setpointC}°C</strong>
                    </div>
                    <div>
                      <span>Ambient</span>
                      <strong>{formatTemp(selected.telemetry[0]?.ambientTempC)}</strong>
                    </div>
                    <div>
                      <span>Humidity</span>
                      <strong>
                        {selected.telemetry[0]?.humidityPct != null
                          ? `${selected.telemetry[0].humidityPct}%`
                          : '—'}
                      </strong>
                    </div>
                    <div>
                      <span>Power</span>
                      <strong>{formatPower(selected.telemetry[0]?.activePowerW)}</strong>
                    </div>
                    <div>
                      <span>Mode</span>
                      <strong>{selected.mode}</strong>
                    </div>
                    <div>
                      <span>Fan</span>
                      <strong>{selected.fanSpeed}</strong>
                    </div>
                  </div>
                </section>

                <section className="ops-section ops-chart-section">
                  <h3>Trend</h3>
                  <div className="ops-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                        <XAxis dataKey="name" stroke={axisStroke} fontSize={11} />
                        <YAxis stroke={axisStroke} fontSize={11} width={40} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Area
                          type="monotone"
                          dataKey="power"
                          name="Power"
                          stroke={isDark ? '#38bdf8' : '#0f766e'}
                          fill={isDark ? 'rgba(56,189,248,0.12)' : '#ccfbf1'}
                        />
                        <Area
                          type="monotone"
                          dataKey="temp"
                          name="Temp"
                          stroke={isDark ? '#34d399' : '#059669'}
                          fill={isDark ? 'rgba(52,211,153,0.1)' : '#d1fae5'}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                <section className="ops-section">
                  <h3>Alerts on this unit</h3>
                  {selected.alerts.length === 0 ? (
                    <p className="ov-empty">No unresolved alerts.</p>
                  ) : (
                    <ul className="ops-alerts">
                      {selected.alerts.map((alert) => (
                        <li key={alert.id}>
                          <AlertTriangle size={15} />
                          <div>
                            <strong>{alert.title}</strong>
                            {alert.message && <span>{alert.message}</span>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </>
          ) : (
            <div className="ops-empty-detail">
              <Gauge size={28} />
              <h2>Select a unit</h2>
              <p>Choose an AC unit from the list to view status and issue commands.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
