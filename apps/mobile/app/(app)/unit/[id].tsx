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
  SectionHeader,
  StatusBadge,
  SuccessBanner,
} from '../../../src/components/ui';
import { useAuth } from '../../../src/context/AuthContext';
import { useFacilityData } from '../../../src/context/DataContext';
import {
  formatHumidity,
  formatRelativeTime,
  formatTemp,
  formatWatts,
} from '../../../src/lib/format';
import { colors, radius, shadow, spacing, type } from '../../../src/theme/colors';

const MODES = ['COOL', 'HEAT', 'DRY', 'FAN', 'AUTO'] as const;
const FANS = ['AUTO', 'LOW', 'MEDIUM', 'HIGH'] as const;

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
  const [busy, setBusy] = useState<string | null>(null);

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

  async function runCommand(
    type: string,
    payload: Record<string, unknown>,
    label: string,
    confirm?: string,
  ) {
    if (!token || !unit) return;

    const execute = async () => {
      setBusy(label);
      setMessage('');
      setError('');
      try {
        await issueCommand(token, unit.id, type, payload);
        setMessage(`${label} queued for device check-in.`);
        await load({ silent: true });
        void refreshFleet({ silent: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Command failed.');
      } finally {
        setBusy(null);
      }
    };

    if (confirm) {
      Alert.alert('Confirm command', confirm, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', style: 'destructive', onPress: () => void execute() },
      ]);
      return;
    }
    await execute();
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
              <Text style={styles.loc}>
                {unit.room.floor.building.name} · {unit.room.name}
              </Text>
              <Text style={styles.seen}>
                Last seen {formatRelativeTime(unit.lastSeenAt ?? latest?.recordedAt)}
              </Text>
            </View>
            <StatusBadge online={unit.online} />
          </View>
        </View>

        <ErrorBanner message={error} />
        <SuccessBanner message={message} />

        <SectionHeader
          title="Latest reading"
          actionLabel="View history"
          onAction={() => router.push(`/(app)/unit/${unit.id}/history`)}
        />
        <View style={styles.readings}>
          <Reading label="Ambient" value={formatTemp(latest?.ambientTempC)} />
          <Reading label="Humidity" value={formatHumidity(latest?.humidityPct)} />
          <Reading label="Power" value={formatWatts(latest?.activePowerW)} />
          <Reading label="Setpoint" value={`${unit.setpointC}°C`} />
          <Reading label="Mode" value={unit.mode} />
          <Reading label="Fan" value={unit.fanSpeed} />
        </View>

        <Text style={styles.section}>Power</Text>
        <View style={styles.actions}>
          <ActionButton
            icon="power"
            label={`Turn ${nextPower}`}
            busy={busy === `Turn ${nextPower}`}
            onPress={() =>
              void runCommand(
                'POWER',
                { powerState: nextPower },
                `Turn ${nextPower}`,
                `Send POWER ${nextPower} to ${unit.name}?`,
              )
            }
          />
        </View>

        <Text style={styles.section}>Setpoint</Text>
        <View style={styles.actions}>
          <ActionButton
            icon="remove"
            label="Cooler"
            busy={busy === 'Cooler'}
            onPress={() =>
              void runCommand(
                'SETPOINT',
                { setpointC: Math.max(16, unit.setpointC - 1) },
                'Cooler',
              )
            }
          />
          <ActionButton
            icon="add"
            label="Warmer"
            busy={busy === 'Warmer'}
            onPress={() =>
              void runCommand(
                'SETPOINT',
                { setpointC: Math.min(30, unit.setpointC + 1) },
                'Warmer',
              )
            }
          />
        </View>

        <Text style={styles.section}>Mode</Text>
        <View style={styles.chipRow}>
          {MODES.map((mode) => (
            <Pressable
              key={mode}
              style={[styles.chip, unit.mode === mode && styles.chipActive]}
              disabled={Boolean(busy)}
              onPress={() => void runCommand('MODE', { mode }, `Mode ${mode}`)}
            >
              <Text
                style={[
                  styles.chipText,
                  unit.mode === mode && styles.chipTextActive,
                ]}
              >
                {mode}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>Fan speed</Text>
        <View style={styles.chipRow}>
          {FANS.map((fan) => (
            <Pressable
              key={fan}
              style={[styles.chip, unit.fanSpeed === fan && styles.chipActive]}
              disabled={Boolean(busy)}
              onPress={() =>
                void runCommand('FAN_SPEED', { fanSpeed: fan }, `Fan ${fan}`)
              }
            >
              <Text
                style={[
                  styles.chipText,
                  unit.fanSpeed === fan && styles.chipTextActive,
                ]}
              >
                {fan}
              </Text>
            </Pressable>
          ))}
        </View>

        {(unit.alerts?.length ?? 0) > 0 ? (
          <>
            <Text style={styles.section}>Open alerts</Text>
            <View style={styles.alertList}>
              {unit.alerts.map((alert) => (
                <AlertRow key={alert.id} alert={alert} />
              ))}
            </View>
          </>
        ) : null}

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
  loc: {
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  chipText: {
    fontWeight: '700',
    fontSize: type.caption,
    color: colors.textSoft,
  },
  chipTextActive: {
    color: colors.white,
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
