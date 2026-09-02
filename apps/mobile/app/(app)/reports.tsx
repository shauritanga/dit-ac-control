import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fetchEnergyReport } from '../../src/api/client';
import type { EnergyPeriod, EnergyReport } from '../../src/api/types';
import { Screen } from '../../src/components/Screen';
import {
  Card,
  Chip,
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  MetricTile,
  SectionHeader,
} from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { formatKwh, formatTzs } from '../../src/lib/format';
import { colors, radius, spacing, type } from '../../src/theme/colors';

const PERIODS: { id: EnergyPeriod; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
];

export default function ReportsScreen() {
  const { token } = useAuth();
  const [period, setPeriod] = useState<EnergyPeriod>('today');
  const [report, setReport] = useState<EnergyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    let active = true;
    setLoading(true);
    setError('');
    void fetchEnergyReport(token, period)
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
  }, [token, period]);

  const units = report?.units ?? [];
  const year = new Date().getFullYear();

  if (loading && !report) {
    return (
      <Screen title="Reports" subtitle="Energy consumption and cost" scroll={false}>
        <LoadingBlock label="Loading energy report…" />
      </Screen>
    );
  }

  return (
    <Screen title="Reports" subtitle="Energy consumption and cost">
      <ErrorBanner message={error} />

      <Card style={styles.intro}>
        <Text style={styles.introTitle}>Energy reports</Text>
        <Text style={styles.introSub}>View energy consumption and cost reports.</Text>
      </Card>

      <View style={styles.periodRow}>
        {PERIODS.map((option) => (
          <Chip
            key={option.id}
            label={option.label}
            active={period === option.id}
            onPress={() => setPeriod(option.id)}
          />
        ))}
      </View>

      <View style={styles.metrics}>
        <MetricTile
          icon="flash"
          label="Total energy"
          value={loading && !report ? '—' : formatKwh(report?.totalEnergyKwh ?? 0)}
        />
        <MetricTile
          icon="wallet"
          label="Total cost"
          value={loading && !report ? '—' : formatTzs(report?.totalCostTzs ?? 0)}
          tone="warning"
        />
        <MetricTile
          icon="trending-up"
          label="Highest usage AC"
          value={
            report?.highestUsage &&
            (report.highestUsage.energyKwh > 0 || units.length > 0)
              ? report.highestUsage.assetTag
              : '—'
          }
          tone="default"
        />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Energy consumption report" />
        {loading && !report ? (
          <Card>
            <Text style={styles.loadingText}>Loading energy report…</Text>
          </Card>
        ) : units.length === 0 ? (
          <EmptyState
            icon="bar-chart-outline"
            title="No AC units"
            message="The table lists only units registered in the system."
          />
        ) : (
          <View style={styles.table}>
            {units.map((unit) => (
              <Card key={unit.id} style={styles.tableRow}>
                <View style={styles.tableTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.assetTag}>{unit.assetTag}</Text>
                    <Text style={styles.unitName}>{unit.name}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      unit.status === 'High' ? styles.statusHigh : styles.statusNormal,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        unit.status === 'High' ? styles.statusTextHigh : styles.statusTextNormal,
                      ]}
                    >
                      {unit.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.location}>{unit.location}</Text>
                <View style={styles.tableMeta}>
                  <Meta label="Energy" value={`${formatNumber(unit.energyKwh)} kWh`} />
                  <Meta label="Cost" value={formatTzs(unit.costTzs)} />
                </View>
              </Card>
            ))}
          </View>
        )}
      </View>

      <Text style={styles.copy}>© {year} DIT — All rights reserved</Text>
    </Screen>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.meta}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function formatNumber(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const styles = StyleSheet.create({
  intro: { gap: 4 },
  introTitle: {
    fontSize: type.heading,
    fontWeight: '800',
    color: colors.text,
  },
  introSub: {
    color: colors.textMuted,
    fontSize: type.caption,
    lineHeight: 18,
  },
  periodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  section: { gap: spacing.md },
  loadingText: {
    color: colors.textMuted,
    fontSize: type.caption,
    fontWeight: '600',
  },
  table: { gap: 12 },
  tableRow: { gap: 8 },
  tableTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  assetTag: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: '800',
  },
  unitName: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: type.caption,
    fontWeight: '600',
  },
  location: {
    color: colors.textSoft,
    fontSize: type.caption,
    fontWeight: '600',
  },
  tableMeta: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  meta: { gap: 2 },
  metaLabel: {
    color: colors.textMuted,
    fontSize: type.micro,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metaValue: {
    color: colors.text,
    fontSize: type.caption,
    fontWeight: '800',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusHigh: { backgroundColor: colors.dangerSoft },
  statusNormal: { backgroundColor: colors.successSoft },
  statusText: {
    fontSize: type.micro,
    fontWeight: '800',
  },
  statusTextHigh: { color: colors.danger },
  statusTextNormal: { color: colors.success },
  copy: {
    marginTop: 8,
    color: colors.textMuted,
    fontSize: type.micro,
    fontWeight: '600',
    textAlign: 'center',
  },
});
