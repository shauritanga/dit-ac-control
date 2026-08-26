import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { OverviewDailyEnergyTrend } from '../types';
import { useTheme } from '../context/ThemeContext';
import { formatKwh } from '../lib/format';

export const ENERGY_COLORS_LIGHT = [
  '#0f766e',
  '#2563eb',
  '#d97706',
  '#7c3aed',
  '#db2777',
  '#0891b2',
  '#65a30d',
  '#ea580c',
];
export const ENERGY_COLORS_DARK = [
  '#2dd4bf',
  '#60a5fa',
  '#fbbf24',
  '#a78bfa',
  '#f472b6',
  '#22d3ee',
  '#a3e635',
  '#fb923c',
];

export function energyColorsForTheme(isDark: boolean) {
  return isDark ? ENERGY_COLORS_DARK : ENERGY_COLORS_LIGHT;
}

type DailyEnergyChartProps = {
  trend: OverviewDailyEnergyTrend;
  unitId?: string;
};

export function DailyEnergyChart({ trend, unitId }: DailyEnergyChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const energyColors = energyColorsForTheme(isDark);
  const units = unitId
    ? trend.units.filter((unit) => unit.id === unitId)
    : trend.units;
  const data = trend.points.map((point) => {
    const totalKwh = units.reduce(
      (sum, unit) => sum + (point.values[unit.id] ?? 0),
      0,
    );
    return {
      label: point.label,
      totalKwh,
      ...point.values,
    };
  });
  const empty =
    units.length === 0 ||
    data.length === 0 ||
    data.every((point) => point.totalKwh === 0);

  if (empty) {
    return <p className="ov-empty">No energy data in the last 7 days.</p>;
  }

  const gridStroke = isDark ? '#2a3548' : '#e8ecf1';
  const axisStroke = isDark ? '#8b9bb3' : '#64748b';
  const tooltipStyle = {
    background: isDark ? '#121a2a' : '#fff',
    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
    borderRadius: 8,
    color: isDark ? '#e8eef7' : '#0f172a',
    fontSize: 12,
  };
  const showFleetTotal = units.length > 1;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
        <XAxis dataKey="label" stroke={axisStroke} fontSize={11} />
        <YAxis
          stroke={axisStroke}
          fontSize={11}
          width={40}
          tickFormatter={(value: number) =>
            Number(value) >= 10 || Number.isInteger(value)
              ? `${Math.round(value)}`
              : value.toFixed(1)
          }
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, name) => [
            formatKwh(typeof value === 'number' ? value : Number(value)),
            String(name),
          ]}
          labelFormatter={(label, payload) => {
            const total = payload?.[0]?.payload?.totalKwh as number | undefined;
            if (total == null) return String(label);
            return showFleetTotal
              ? `${label} · ${formatKwh(total)} total`
              : `${label} · ${formatKwh(total)}`;
          }}
        />
        {units.map((unit) => {
          const index = trend.units.findIndex((item) => item.id === unit.id);
          const color = energyColors[(index >= 0 ? index : 0) % energyColors.length];
          return (
            <Line
              key={unit.id}
              type="monotone"
              dataKey={unit.id}
              name={unit.name}
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3.5, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}
