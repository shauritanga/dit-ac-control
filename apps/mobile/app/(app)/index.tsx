import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertRow } from '../../src/components/AlertRow';
import { Screen } from '../../src/components/Screen';
import { UnitCard } from '../../src/components/UnitCard';
import {
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  MetricTile,
  SectionHeader,
} from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { useFacilityData } from '../../src/context/DataContext';
import { formatWatts } from '../../src/lib/format';
import { colors, radius, shadow, spacing, type } from '../../src/theme/colors';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { summary, units, alerts, loading, refreshing, error, refresh } =
    useFacilityData();

  const attention = units
    .filter((u) => !u.online || (u.alerts?.length ?? 0) > 0)
    .slice(0, 4);
  const recentAlerts = alerts.slice(0, 3);
  const healthPct =
    summary && summary.total > 0
      ? Math.round((summary.online / summary.total) * 100)
      : 0;

  if (loading && !summary) {
    return (
      <Screen
        title="Home"
        subtitle="Facility overview"
        showAvatar
        scroll={false}
        padded={false}
      >
        <LoadingBlock label="Loading facility status…" />
      </Screen>
    );
  }

  const firstName = user?.name?.split(/\s+/)[0] ?? 'there';

  return (
    <Screen
      title="Home"
      subtitle="Live facility operations"
      showAvatar
      refreshing={refreshing}
      onRefresh={() => void refresh()}
    >
      <ErrorBanner message={error} />

      {/* Greeting + health hero */}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroText}>
            <Text style={styles.hello}>Good day, {firstName}</Text>
            <Text style={styles.helloSub}>
              {summary?.openAlerts
                ? `${summary.openAlerts} alert${summary.openAlerts === 1 ? '' : 's'} need review`
                : 'All monitored systems look stable'}
            </Text>
          </View>
          <Pressable
            style={styles.refreshChip}
            onPress={() => void refresh()}
            accessibilityLabel="Refresh"
          >
            <Ionicons name="refresh" size={16} color={colors.brandDark} />
          </Pressable>
        </View>

        <View style={styles.healthRow}>
          <View style={styles.healthRing}>
            <Text style={styles.healthPct}>{healthPct}%</Text>
            <Text style={styles.healthLabel}>online</Text>
          </View>
          <View style={styles.healthStats}>
            <HealthLine
              label="Units online"
              value={`${summary?.online ?? 0} of ${summary?.total ?? 0}`}
            />
            <HealthLine
              label="Currently running"
              value={`${summary?.poweredOn ?? 0}`}
            />
            <HealthLine
              label="Site load"
              value={formatWatts(summary?.activePowerW)}
            />
          </View>
        </View>
      </View>

      <View style={styles.metrics}>
        <MetricTile
          icon="wifi"
          label="Online"
          value={`${summary?.online ?? 0}/${summary?.total ?? 0}`}
          tone="success"
        />
        <MetricTile
          icon="power"
          label="Running"
          value={`${summary?.poweredOn ?? 0}`}
        />
        <MetricTile
          icon="warning"
          label="Alerts"
          value={`${summary?.openAlerts ?? 0}`}
          tone={(summary?.openAlerts ?? 0) > 0 ? 'danger' : 'default'}
        />
        <MetricTile
          icon="flash"
          label="Load"
          value={formatWatts(summary?.activePowerW)}
          tone="warning"
        />
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Needs attention"
          actionLabel="All units"
          onAction={() => router.push('/(app)/units')}
        />
        {attention.length === 0 ? (
          <View style={styles.healthyCard}>
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            <Text style={styles.healthyText}>All units look healthy right now.</Text>
          </View>
        ) : (
          <View style={styles.stack}>
            {attention.map((unit) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                onPress={() => router.push(`/(app)/unit/${unit.id}`)}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Recent alerts"
          actionLabel="See all"
          onAction={() => router.push('/(app)/alerts')}
        />
        {recentAlerts.length === 0 ? (
          <EmptyState
            icon="notifications-off-outline"
            title="No recent alerts"
            message="New facility alerts will show up here."
          />
        ) : (
          <View style={styles.stack}>
            {recentAlerts.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                onPress={
                  alert.acUnit?.id
                    ? () => router.push(`/(app)/unit/${alert.acUnit!.id}`)
                    : () => router.push('/(app)/alerts')
                }
              />
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

function HealthLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.healthLine}>
      <Text style={styles.healthLineLabel}>{label}</Text>
      <Text style={styles.healthLineValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.ink,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.xl,
    ...shadow.card,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  heroText: { flex: 1, gap: 4 },
  hello: {
    color: colors.white,
    fontSize: type.title,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  helloSub: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: type.caption,
    lineHeight: 18,
    fontWeight: '500',
  },
  refreshChip: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  healthRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 5,
    borderColor: colors.brand,
    backgroundColor: 'rgba(13, 148, 136, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthPct: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  healthLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  healthStats: { flex: 1, gap: 8 },
  healthLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  healthLineLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: type.caption,
    fontWeight: '500',
  },
  healthLineValue: {
    color: colors.white,
    fontSize: type.caption,
    fontWeight: '800',
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  section: { gap: spacing.md },
  stack: { gap: 12 },
  healthyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.successBg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.successSoft,
  },
  healthyText: {
    flex: 1,
    color: colors.success,
    fontWeight: '700',
    fontSize: type.caption,
  },
});
