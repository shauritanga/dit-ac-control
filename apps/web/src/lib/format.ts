export function formatPower(watts: number | null | undefined) {
  const value = watts ?? 0;
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 1 : 2)} kW`;
  }
  return `${Math.round(value)} W`;
}

export function formatNumber(value: number | null | undefined, digits = 0) {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export function formatTemp(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—';
  return `${formatNumber(value, 1)}°C`;
}

export function formatPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—';
  return `${formatNumber(value, value % 1 === 0 ? 0 : 1)}%`;
}

export function formatRelativeTime(input: string | Date | null | undefined) {
  if (!input) return 'Never';
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return '—';

  const deltaSec = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(deltaSec);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  if (abs < 60) return rtf.format(deltaSec, 'second');
  if (abs < 3600) return rtf.format(Math.round(deltaSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(deltaSec / 3600), 'hour');
  return rtf.format(Math.round(deltaSec / 86400), 'day');
}

export function severityTone(severity: string) {
  const value = severity.toLowerCase();
  if (['critical', 'error', 'high', 'failed'].includes(value)) return 'critical';
  if (['warning', 'medium', 'pending', 'sent'].includes(value)) return 'warning';
  if (['success', 'acked', 'online', 'on'].includes(value)) return 'success';
  return 'info';
}
