import { useEffect, useState } from 'react';
import {
  CalendarDays,
  Download,
  FileBarChart2,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';
import type { EnergyPeriod, EnergyReport } from '../types';
import { formatKwh, formatTzs } from '../lib/format';

type ReportsPageProps = {
  api: <T>(path: string, options?: RequestInit) => Promise<T>;
};

const PERIODS: { id: EnergyPeriod; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
];

export function ReportsPage({ api }: ReportsPageProps) {
  const [period, setPeriod] = useState<EnergyPeriod>('today');
  const [report, setReport] = useState<EnergyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void api<EnergyReport>(`/dashboard/energy-report?period=${period}`)
      .then((data) => {
        if (!active) return;
        setReport(data);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load energy report.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api, period]);

  const units = report?.units ?? [];
  const year = new Date().getFullYear();

  return (
    <div className="reports-page">
      <header className="reports-hero">
        <div>
          <h2>Reports</h2>
          <p>View energy consumption and cost reports.</p>
        </div>
        <div className="reports-hero-actions">
          <label className="reports-period">
            <CalendarDays size={16} aria-hidden="true" />
            <span className="sr-only">Report period</span>
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as EnergyPeriod)}
            >
              {PERIODS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="reports-export no-print-hide"
            onClick={() => window.print()}
          >
            <Download size={16} aria-hidden="true" />
            Export PDF
          </button>
        </div>
      </header>

      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}

      <section className="reports-kpis" aria-label="Energy summary">
        <article className="reports-kpi">
          <span className="reports-kpi-icon is-energy" aria-hidden="true">
            <Zap size={18} />
          </span>
          <div>
            <strong>{loading && !report ? '—' : formatKwh(report?.totalEnergyKwh ?? 0)}</strong>
            <span className="reports-kpi-title">Total Energy</span>
            <span className="reports-kpi-hint">Total energy consumption</span>
          </div>
        </article>
        <article className="reports-kpi">
          <span className="reports-kpi-icon is-cost" aria-hidden="true">
            <Wallet size={18} />
          </span>
          <div>
            <strong>{loading && !report ? '—' : formatTzs(report?.totalCostTzs ?? 0)}</strong>
            <span className="reports-kpi-title">Total Cost</span>
            <span className="reports-kpi-hint">Estimated total cost</span>
          </div>
        </article>
        <article className="reports-kpi">
          <span className="reports-kpi-icon is-peak" aria-hidden="true">
            <TrendingUp size={18} />
          </span>
          <div>
            <strong>
              {report?.highestUsage && (report.highestUsage.energyKwh > 0 || units.length > 0)
                ? report.highestUsage.assetTag
                : '—'}
            </strong>
            <span className="reports-kpi-title">Highest Usage AC</span>
            <span className="reports-kpi-hint">
              {report?.highestUsage ? formatKwh(report.highestUsage.energyKwh) : 'No usage yet'}
            </span>
          </div>
        </article>
      </section>

      <section className="reports-panel">
        <h3>Energy consumption report</h3>

        {loading && !report ? (
          <div className="reports-empty">
            <p>Loading energy report…</p>
          </div>
        ) : units.length === 0 ? (
          <div className="reports-empty">
            <FileBarChart2 size={28} />
            <p>No AC units found. The table lists only units registered in the system.</p>
          </div>
        ) : (
          <div className="ov-table-wrap">
            <table className="ov-table reports-table">
              <thead>
                <tr>
                  <th>AC unit</th>
                  <th>Location</th>
                  <th>Energy (kWh)</th>
                  <th>Cost (TZS)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {units.map((unit) => (
                  <tr key={unit.id}>
                    <td>
                      <strong>{unit.assetTag}</strong>
                      <span className="ov-table-sub">{unit.name}</span>
                    </td>
                    <td>{unit.location}</td>
                    <td className="ov-num">{formatNumberFixed(unit.energyKwh)}</td>
                    <td className="ov-num">{Math.round(unit.costTzs).toLocaleString('en-US')}</td>
                    <td>
                      <span
                        className={`reports-status ${unit.status === 'High' ? 'is-high' : 'is-normal'}`}
                      >
                        {unit.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="reports-copy">© {year} DIT — All rights reserved</p>
    </div>
  );
}

function formatNumberFixed(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}
