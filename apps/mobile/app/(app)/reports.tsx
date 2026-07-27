import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { UnitCard } from '../../src/components/UnitCard';
import {
  Card,
  ErrorBanner,
  LoadingBlock,
  MetricTile,
  SectionHeader,
} from '../../src/components/ui';
import { useFacilityData } from '../../src/context/DataContext';
import { formatTemp, formatWatts } from '../../src/lib/format';
import { colors, radius, spacing, type } from '../../src/theme/colors';

export default function ReportsScreen() {
  const router = useRouter();
  const { summary, units, overview, loading, refreshing, error, refresh } =
    useFacilityData();

  if (loading && !summary) {
    return (
      <Screen title="Reports" subtitle="Facility snapshot" scroll={false}>
        <LoadingBlock label="Loading reports…" />
      </Screen>
    );
  }

  const onlinePct =
    summary && summary.total > 0
      ? Math.round((summary.online / summary.total) * 100)
      : 0;

  const topLoad = [...units]
    .map((u) => ({
      unit: u,
      watts: u.telemetry?.[0]?.activePowerW ?? 0,
    }))
    .sort((a, b) => b.watts - a.watts)
    .slice(0, 5);

  const generated =
    overview && 'generatedAt' in overview && typeof (overview as { generatedAt?: string }).generatedAt === 'string'
      ? new Date((overview as { generatedAt: string }).generatedAt)
      : new Date();

  return (
    <Screen
      title="Reports"
      subtitle="Operations snapshot"
      refreshing={refreshing}
      onRefresh={() => void refresh()}
    >
      <ErrorBanner message={error} />

      <Card style={styles.metaCard}>
        <Text style={styles.metaLabel}>Generated</Text>
        <Text style={styles.metaValue}>
          {generated.toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </Text>
        <Text style={styles.metaHint}>
          Live roll-up from units, telemetry, and open alerts.
        </Text>
      </Card>

      <View style={styles.metrics}>
        <MetricTile
          icon="wifi"
          label="Online rate"
          value={`${onlinePct}%`}
          tone="success"
        />
        <MetricTile
          icon="power"
          label="Running"
          value={`${summary?.poweredOn ?? 0}`}
        />
        <MetricTile
          icon="warning"
          label="Open alerts"
          value={`${summary?.openAlerts ?? 0}`}
          tone={(summary?.openAlerts ?? 0) > 0 ? 'danger' : 'default'}
        />
        <MetricTile
          icon="flash"
          label="Site load"
          value={formatWatts(summary?.activePowerW)}
          tone="warning"
        />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Fleet summary" />
        <Card style={styles.tableCard}>
          <Row label="Total units" value={`${summary?.total ?? units.length}`} />
          <Row label="Online" value={`${summary?.online ?? 0}`} />
          <Row label="Offline" value={`${summary?.offline ?? 0}`} />
          <Row
            label="Avg ambient"
            value={
              summary?.avgAmbientTempC != null
                ? formatTemp(summary.avgAmbientTempC)
                : '—'
            }
          />
          <Row
            label="Energy (24h est.)"
            value={
              summary?.energyKwh24h != null
                ? `${Number(summary.energyKwh24h).toFixed(2)} kWh`
                : '—'
            }
            last
          />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Highest load"
          actionLabel="All units"
          onAction={() => router.push('/(app)/units')}
        />
        {topLoad.length === 0 ? (
          <Card>
            <Text style={styles.empty}>No unit power data yet.</Text>
          </Card>
        ) : (
          <View style={styles.stack}>
            {topLoad.map(({ unit, watts }) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                onPress={() => router.push(`/(app)/unit/${unit.id}`)}
              />
            ))}
            {topLoad[0] ? (
              <Text style={styles.footnote}>
                Peak in this list: {formatWatts(topLoad[0].watts)}
              </Text>
            ) : null}
          </View>
        )}
      </View>
    </Screen>
  );
}

function Row({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  metaCard: { gap: 4 },
  metaLabel: {
    fontSize: type.micro,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metaValue: {
    fontSize: type.heading,
    fontWeight: '800',
    color: colors.text,
  },
  metaHint: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: type.caption,
    lineHeight: 18,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  section: { gap: spacing.md },
  tableCard: { paddingVertical: spacing.sm, gap: 0 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    color: colors.textMuted,
    fontSize: type.caption,
    fontWeight: '600',
  },
  rowValue: {
    color: colors.text,
    fontSize: type.caption,
    fontWeight: '800',
  },
  stack: { gap: 12 },
  empty: {
    color: colors.textMuted,
    fontSize: type.caption,
    fontWeight: '600',
  },
  footnote: {
    color: colors.textMuted,
    fontSize: type.micro,
    fontWeight: '600',
    textAlign: 'center',
  },
});
