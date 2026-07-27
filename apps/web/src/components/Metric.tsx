import type { ReactNode } from 'react';

type MetricProps = {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  tone?: 'default' | 'warning' | 'success' | 'danger' | 'info';
};

export function Metric({ icon, label, value, tone = 'default' }: MetricProps) {
  return (
    <div className={`metric tone-${tone}`}>
      <span className="metric-icon" aria-hidden="true">
        {icon}
      </span>
      <div className="metric-body">
        <p className="metric-label">{label}</p>
        <strong className="metric-value">{value}</strong>
      </div>
    </div>
  );
}
