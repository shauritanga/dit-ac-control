import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchTelemetryHistory, fetchUnit } from '../../../../src/api/client';
import type { AcUnit, TelemetryRecord } from '../../../../src/api/types';
import { AppBar } from '../../../../src/components/AppBar';
import {
  Card,
  Chip,
  EmptyState,
  ErrorBanner,
  LoadingBlock,
} from '../../../../src/components/ui';
import { useAuth } from '../../../../src/context/AuthContext';
import { formatDateTime, formatHumidity, formatTemp, formatWatts } from '../../../../src/lib/format';
import { colors, radius, shadow, spacing, type } from '../../../../src/theme/colors';

const PAGE_SIZE = 15;
const POWER_FILTERS = ['ALL', 'ON', 'OFF', 'UNKNOWN'] as const;

function fieldValue(value: string | number | null | undefined, suffix = '') {
  return value == null || value === '' ? '—' : `${value}${suffix}`;
}

export default function UnitHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [unit, setUnit] = useState<AcUnit | null>(null);
  const [powerState, setPowerState] = useState<(typeof POWER_FILTERS)[number]>('ALL');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<TelemetryRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !id) return;
    fetchUnit(token, id).then(setUnit).catch(() => {});
  }, [token, id]);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!token || !id) return;
      if (!opts?.silent) setLoading(true);
      else setRefreshing(true);
      try {
        const response = await fetchTelemetryHistory(token, id, {
          page,
          pageSize: PAGE_SIZE,
          powerState: powerState === 'ALL' ? undefined : powerState,
        });
        setItems(response.items);
        setTotal(response.total);
        setTotalPages(response.totalPages);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load history.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, id, page, powerState],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const bottomPad = Math.max(insets.bottom, 12) + 24;
  const rangeLabel = useMemo(() => {
    if (!total) return 'No readings match these filters.';
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, total);
    return `Showing ${start}–${end} of ${total}`;
  }, [page, total]);

  return (
    <View style={styles.root}>
      <AppBar
        title="History"
        subtitle={unit ? unit.name : undefined}
        showBack
        showNotifications={false}
      />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load({ silent: true })}
            tintColor={colors.brand}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <ErrorBanner message={error} />
            <View style={styles.filterRow}>
              {POWER_FILTERS.map((option) => (
                <Chip
                  key={option}
                  label={option === 'ALL' ? 'All states' : option}
                  active={powerState === option}
                  onPress={() => {
                    setPowerState(option);
                    setPage(1);
                  }}
                />
              ))}
            </View>
            <Text style={styles.rangeLabel}>{loading ? 'Loading readings…' : rangeLabel}</Text>
          </View>
        }
        renderItem={({ item }) => <HistoryRow record={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          loading ? (
            <LoadingBlock label="Loading readings…" />
          ) : (
            <EmptyState
              icon="time-outline"
              title="No readings"
              message="No telemetry readings match these filters."
            />
          )
        }
        ListFooterComponent={
          totalPages > 1 ? (
            <View style={styles.pagination}>
              <Pressable
                style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <Ionicons name="chevron-back" size={16} color={page === 1 ? colors.textMuted : colors.text} />
                <Text style={[styles.pageBtnText, page === 1 && styles.pageBtnTextDisabled]}>Prev</Text>
              </Pressable>
              <Text style={styles.pageLabel}>
                Page {page} of {totalPages}
              </Text>
              <Pressable
                style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <Text
                  style={[styles.pageBtnText, page >= totalPages && styles.pageBtnTextDisabled]}
                >
                  Next
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={page >= totalPages ? colors.textMuted : colors.text}
                />
              </Pressable>
            </View>
          ) : null
        }
      />
    </View>
  );
}

function HistoryRow({ record }: { record: TelemetryRecord }) {
  return (
    <Card style={styles.row}>
      <View style={styles.rowTop}>
        <Text style={styles.rowTime}>{formatDateTime(record.recordedAt)}</Text>
        <View
          style={[
            styles.statePill,
            record.powerState === 'ON'
              ? styles.stateOn
              : record.powerState === 'OFF'
                ? styles.stateOff
                : styles.stateUnknown,
          ]}
        >
          <Text style={styles.statePillText}>{record.powerState}</Text>
        </View>
      </View>
      <View style={styles.rowGrid}>
        <Field label="Mode" value={fieldValue(record.mode)} />
        <Field label="Ambient" value={formatTemp(record.ambientTempC)} />
        <Field label="Coil" value={formatTemp(record.coilTempC)} />
        <Field label="Humidity" value={formatHumidity(record.humidityPct)} />
        <Field label="Setpoint" value={fieldValue(record.setpointC, '°C')} />
        <Field label="Fan" value={fieldValue(record.fanSpeed)} />
        <Field label="Power" value={formatWatts(record.activePowerW)} />
        <Field label="Energy" value={fieldValue(record.energyKwh, ' kWh')} />
        <Field label="RSSI" value={fieldValue(record.rssi, ' dBm')} />
      </View>
      {record.errorCode ? (
        <Text style={styles.errorCode}>Error: {record.errorCode}</Text>
      ) : null}
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: 0 },
  header: { gap: 12, marginBottom: 12 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rangeLabel: {
    color: colors.textMuted,
    fontSize: type.caption,
    fontWeight: '600',
  },
  row: { gap: 10 },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowTime: {
    color: colors.text,
    fontWeight: '700',
    fontSize: type.caption,
  },
  statePill: {
    paddingHorizontal: 10,
    height: 22,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateOn: { backgroundColor: colors.successSoft },
  stateOff: { backgroundColor: colors.dangerSoft },
  stateUnknown: { backgroundColor: colors.surfaceMuted },
  statePillText: {
    fontSize: type.micro,
    fontWeight: '800',
    color: colors.textSoft,
  },
  rowGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  field: { width: '30%' },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: type.micro,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  fieldValue: {
    marginTop: 2,
    color: colors.text,
    fontSize: type.caption,
    fontWeight: '700',
  },
  errorCode: {
    color: colors.danger,
    fontSize: type.caption,
    fontWeight: '700',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    ...shadow.soft,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: type.caption,
  },
  pageBtnTextDisabled: { color: colors.textMuted },
  pageLabel: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: type.caption,
  },
});
