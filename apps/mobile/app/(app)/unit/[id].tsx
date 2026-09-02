import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchUnit, issueCommand } from '../../../src/api/client';
import type { AcUnit } from '../../../src/api/types';
import { AlertRow } from '../../../src/components/AlertRow';
import { AppBar } from '../../../src/components/AppBar';
import {
  ErrorBanner,
  LoadingBlock,
  PrimaryButton,
  SuccessBanner,
} from '../../../src/components/ui';
import { useAuth } from '../../../src/context/AuthContext';
import { useFacilityData } from '../../../src/context/DataContext';
import { formatRelativeTime, formatWatts } from '../../../src/lib/format';
import { colors, radius, shadow, spacing, type } from '../../../src/theme/colors';

export default function UnitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { units, refresh: refreshFleet } = useFacilityData();

  const cached = useMemo(
    () => units.find((u) => u.id === id) ?? null,
    [units, id],
  );

  const [unit, setUnit] = useState<AcUnit | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!token || !id) return;
      if (!opts?.silent) {
        if (!unit) setLoading(true);
        else setRefreshing(true);
      }
      try {
        const next = await fetchUnit(token, id);
        setUnit(next);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load unit.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, id, unit],
  );

  useEffect(() => {
    if (cached) setUnit(cached);
    void load({ silent: Boolean(cached) });
  }, [id, token]);

  async function runPowerCommand() {
    if (!token || !unit) return;
    const nextPower = unit.powerState === 'ON' ? 'OFF' : 'ON';
    const label = `Power ${nextPower === 'ON' ? 'on' : 'off'}`;

    Alert.alert('Confirm command', `Send POWER ${nextPower} to ${unit.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setBusy(true);
            setMessage('');
            setError('');
            try {
              await issueCommand(token, unit.id, 'POWER', { powerState: nextPower });
              setMessage(`${label} queued for device check-in.`);
              await load({ silent: true });
              void refreshFleet({ silent: true });
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Command failed.');
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);
  }

  if (loading && !unit) {
    return (
      <View style={styles.root}>
        <AppBar title="Unit" showBack showNotifications={false} />
        <LoadingBlock label="Loading unit…" />
      </View>
    );
  }

  if (!unit) {
    return (
      <View style={styles.root}>
        <AppBar title="Unit" showBack showNotifications={false} />
        <View style={styles.pad}>
          <ErrorBanner message={error || 'Unit not found.'} />
          <PrimaryButton label="Go back" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  const latest = unit.telemetry?.[0];
  const nextPower = unit.powerState === 'ON' ? 'OFF' : 'ON';
  const bottomPad = Math.max(insets.bottom, 12) + 24;

  return (
    <View style={styles.root}>
      <AppBar
        title={unit.name}
        subtitle={unit.assetTag}
        showBack
        showNotifications
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load()}
            tintColor={colors.brand}
          />
        }
      >
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>
                {unit.assetTag} · {unit.room.code}
              </Text>
              <Text style={styles.loc}>
                {unit.room.floor.building.name} · {unit.room.floor.name} ·{' '}
                {unit.room.name}
              </Text>
              <Text style={styles.seen}>
                Last seen {formatRelativeTime(unit.lastSeenAt ?? latest?.recordedAt)}
              </Text>
            </View>
            <StatusPill online={unit.online} />
          </View>
        </View>

        <ErrorBanner message={error} />
        <SuccessBanner message={message} />

        <Text style={styles.section}>Controls</Text>
        <View style={styles.actions}>
          <ActionButton
            icon="power"
            label={`Power ${nextPower === 'ON' ? 'on' : 'off'}`}
            busy={busy}
            onPress={() => void runPowerCommand()}
          />
        </View>

        <Text style={styles.section}>Live readings</Text>
        <View style={styles.readings}>
          <Reading label="Setpoint" value={`${unit.setpointC}°C`} />
          <Reading label="Power" value={formatWatts(latest?.activePowerW)} />
          <Reading label="Mode" value={unit.mode} />
          <Reading label="Fan" value={unit.fanSpeed} />
        </View>

        <Text style={styles.section}>Alerts on this unit</Text>
        {(unit.alerts?.length ?? 0) === 0 ? (
          <Text style={styles.emptyAlerts}>No unresolved alerts.</Text>
        ) : (
          <View style={styles.alertList}>
            {unit.alerts.map((alert) => (
              <AlertRow key={alert.id} alert={alert} />
            ))}
          </View>
        )}

        {!unit.online ? (
          <View style={styles.offlineNote}>
            <Ionicons name="cloud-offline" size={18} color={colors.warning} />
            <Text style={styles.offlineText}>
              Unit is offline. Commands stay queued until the controller checks in.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function StatusPill({ online }: { online: boolean }) {
  return (
    <View style={[styles.statusPill, online ? styles.statusOnline : styles.statusOffline]}>
      <View style={[styles.statusDot, online ? styles.dotOnline : styles.dotOffline]} />
      <Text style={styles.statusText}>{online ? 'Online' : 'Offline'}</Text>
    </View>
  );
}

function Reading({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reading}>
      <Text style={styles.readingLabel}>{label}</Text>
      <Text style={styles.readingValue}>{value}</Text>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  busy,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  busy?: boolean;
}) {
  return (
    <Pressable
      style={[styles.actionBtn, busy && styles.actionBusy]}
      onPress={onPress}
      disabled={busy}
    >
      <Ionicons name={icon} size={18} color={colors.white} />
      <Text style={styles.actionText}>{busy ? 'Sending…' : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: 12 },
  content: {
    padding: spacing.lg,
    gap: 14,
  },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: type.micro,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  loc: {
    marginTop: 4,
    color: colors.text,
    fontSize: type.body,
    fontWeight: '700',
  },
  seen: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: type.caption,
    fontWeight: '600',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  statusOnline: { backgroundColor: colors.successSoft },
  statusOffline: { backgroundColor: colors.surfaceMuted },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotOnline: { backgroundColor: colors.success },
  dotOffline: { backgroundColor: colors.textMuted },
  statusText: {
    fontSize: type.micro,
    fontWeight: '800',
    color: colors.textSoft,
  },
  readings: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  reading: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },
  readingLabel: {
    color: colors.textMuted,
    fontSize: type.micro,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  readingValue: {
    marginTop: 6,
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  section: {
    marginTop: 4,
    fontSize: type.micro,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    minHeight: 50,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionBusy: { opacity: 0.6 },
  actionText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: type.caption,
  },
  emptyAlerts: {
    color: colors.textMuted,
    fontSize: type.caption,
    fontWeight: '600',
  },
  alertList: { gap: 10 },
  offlineNote: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: colors.warningBg,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: 4,
  },
  offlineText: {
    flex: 1,
    color: colors.warning,
    fontSize: type.caption,
    lineHeight: 18,
    fontWeight: '600',
  },
});
