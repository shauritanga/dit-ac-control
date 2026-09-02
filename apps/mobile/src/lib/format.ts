export function formatRelativeTime(iso?: string | null): string {
  if (!iso) return 'No signal';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'Unknown';
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 45) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export function formatWatts(w?: number | null): string {
  if (w == null || Number.isNaN(w)) return '—';
  if (w >= 1000) return `${(w / 1000).toFixed(1)} kW`;
  return `${Math.round(w)} W`;
}

export function formatTemp(c?: number | null): string {
  if (c == null || Number.isNaN(Number(c))) return '—';
  return `${Number(c).toFixed(1)}°C`;
}

export function formatHumidity(h?: number | null): string {
  if (h == null || Number.isNaN(Number(h))) return '—';
  return `${Math.round(Number(h))}%`;
}

export function severityTone(severity: string): 'critical' | 'warning' | 'info' {
  const s = severity.toLowerCase();
  if (s.includes('crit') || s.includes('error') || s === 'high') return 'critical';
  if (s.includes('warn') || s === 'medium') return 'warning';
  return 'info';
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function roleLabel(role: string): string {
  return role
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatKwh(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} kWh`;
}

export function formatTzs(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `TZS ${Math.round(value).toLocaleString('en-US')}`;
}

export const TARIFF_TZS_PER_KWH = 750;

export function costFromKwh(
  energyKwh: number | null | undefined,
  tariffTzsPerKwh = TARIFF_TZS_PER_KWH,
): number | null {
  if (energyKwh == null || Number.isNaN(energyKwh)) return null;
  return Math.round(energyKwh * tariffTzsPerKwh);
}
