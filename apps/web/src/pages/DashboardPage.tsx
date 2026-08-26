import {
  AlertTriangle,
  Gauge,
  Power,
  Search,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { AcUnit, OverviewDailyEnergyTrend, Summary } from '../types';
import { DailyEnergyChart, energyColorsForTheme } from '../components/DailyEnergyChart';
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
  dailyEnergyTrend: OverviewDailyEnergyTrend;
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
  dailyEnergyTrend,
}: DashboardPageProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const energyColors = energyColorsForTheme(isDark);
  const selectedTrendIndex = selected
    ? dailyEnergyTrend.units.findIndex((unit) => unit.id === selected.id)
    : -1;
  const selectedColor =
    energyColors[(selectedTrendIndex >= 0 ? selectedTrendIndex : 0) % energyColors.length];

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
                  <div className="ops-chart-head">
                    <div>
                      <h3>Daily energy</h3>
                      <p>Consumption · last 7 days</p>
                    </div>
                    <span className="ov-legend">
                      <span>
                        <i
                          className="ov-legend-swatch ov-legend-line"
                          style={{ background: selectedColor }}
                        />
                        {selected.name}
                      </span>
                    </span>
                  </div>
                  <div className="ops-chart">
                    <DailyEnergyChart
                      trend={dailyEnergyTrend}
                      unitId={selected.id}
                    />
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
