import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Filter, History } from 'lucide-react';
import type { AcUnit, TelemetryHistoryResponse, TelemetryRecord } from '../types';
import { costFromKwh, formatKwh, formatPower, formatTzs } from '../lib/format';

type HistoryPageProps = {
  units: AcUnit[];
  api: <T>(path: string, options?: RequestInit) => Promise<T>;
};

const PAGE_SIZE = 10;

function value(value: string | number | null | undefined, suffix = '') {
  return value == null || value === '' ? '—' : `${value}${suffix}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(value));
}

function StatePill({ state }: { state: TelemetryRecord['powerState'] }) {
  return <span className={`history-state history-state-${state.toLowerCase()}`}>{state}</span>;
}

export function HistoryPage({ units, api }: HistoryPageProps) {
  const [unitId, setUnitId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [powerState, setPowerState] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<TelemetryHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!unitId && units[0]) setUnitId(units[0].id);
  }, [unitId, units]);

  useEffect(() => {
    if (!unitId) return;
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (from) params.set('from', new Date(`${from}T00:00:00`).toISOString());
    if (to) params.set('to', new Date(`${to}T23:59:59.999`).toISOString());
    if (powerState) params.set('powerState', powerState);
    let active = true;
    setLoading(true);
    setError('');
    void api<TelemetryHistoryResponse>(`/ac-units/${unitId}/telemetry?${params}`)
      .then((response) => active && setData(response))
      .catch((err) => active && setError(err instanceof Error ? err.message : 'Unable to load history.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [api, from, page, powerState, to, unitId]);

  const unit = useMemo(() => units.find((item) => item.id === unitId), [unitId, units]);
  const start = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const end = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  function resetFilters() {
    setFrom('');
    setTo('');
    setPowerState('');
    setPage(1);
  }

  return (
    <div className="history-page">
      <section className="history-hero panel">
        <div className="history-hero-icon"><History size={22} /></div>
        <div>
          <h2>Device telemetry history</h2>
          <p>Audit every reading received from an AC controller.</p>
        </div>
      </section>

      <section className="history-controls panel" aria-label="History filters">
        <label className="history-field history-device-field">
          <span>Device</span>
          <select value={unitId} onChange={(event) => { setUnitId(event.target.value); setPage(1); }}>
            {units.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.assetTag} · {item.room.code}
              </option>
            ))}
          </select>
        </label>
        <label className="history-field">
          <span>From</span>
          <input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} />
        </label>
        <label className="history-field">
          <span>To</span>
          <input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} />
        </label>
        <label className="history-field">
          <span>Power state</span>
          <select value={powerState} onChange={(event) => { setPowerState(event.target.value); setPage(1); }}>
            <option value="">All states</option>
            <option value="ON">ON</option>
            <option value="OFF">OFF</option>
            <option value="UNKNOWN">UNKNOWN</option>
          </select>
        </label>
        <button type="button" className="history-clear" onClick={resetFilters} disabled={!from && !to && !powerState}>
          <Filter size={16} /> Clear filters
        </button>
      </section>

      {unit && (
        <section className="history-device-summary panel">
          <div>
            <p className="eyebrow">Selected controller</p>
            <h3>{unit.name}</h3>
            <p>{unit.room.floor.building.name} · {unit.room.name} · {unit.assetTag}</p>
          </div>
          <div className="history-summary-stat">
            <strong>{data?.total ?? '—'}</strong>
            <span>matching readings</span>
          </div>
        </section>
      )}

      <section className="history-table-panel panel">
        <div className="history-table-head">
          <div>
            <h3>Received parameters</h3>
            <p>{data ? (data.total ? `Showing ${start}–${end} of ${data.total}` : 'No readings match these filters.') : 'Loading readings…'}</p>
          </div>
        </div>
        {error ? <div className="error-box" role="alert">{error}</div> : (
          <div className="history-table-wrap">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Received at</th>
                  <th>Power</th>
                  <th>Mode</th>
                  <th>Voltage</th>
                  <th>Current</th>
                  <th>Active power</th>
                  <th>Energy</th>
                  <th>Cost</th>
                  <th>Error</th>
                  <th>RSSI</th>
                </tr>
              </thead>
              <tbody>
                {loading && !data ? (
                  <tr>
                    <td colSpan={10} className="history-message">
                      Loading device history…
                    </td>
                  </tr>
                ) : null}
                {!loading && data?.items.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="history-message">
                      No telemetry readings found.
                    </td>
                  </tr>
                ) : null}
                {data?.items.map((row) => (
                  <tr key={row.id}>
                    <td className="history-time">{formatDate(row.recordedAt)}</td>
                    <td>
                      <StatePill state={row.powerState} />
                    </td>
                    <td>{value(row.mode)}</td>
                    <td>{value(row.voltage, ' V')}</td>
                    <td>{value(row.current, ' A')}</td>
                    <td>{formatPower(row.activePowerW)}</td>
                    <td>{formatKwh(row.energyKwh)}</td>
                    <td>{formatTzs(costFromKwh(row.energyKwh))}</td>
                    <td>{value(row.errorCode)}</td>
                    <td>{value(row.rssi, ' dBm')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.totalPages > 1 && (
          <div className="history-pagination">
            <button type="button" onClick={() => setPage((current) => current - 1)} disabled={page === 1}><ChevronLeft size={16} /> Previous</button>
            <span>Page {data.page} of {data.totalPages}</span>
            <button type="button" onClick={() => setPage((current) => current + 1)} disabled={page >= data.totalPages}>Next <ChevronRight size={16} /></button>
          </div>
        )}
      </section>
    </div>
  );
}
