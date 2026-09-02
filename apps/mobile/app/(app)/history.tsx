import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchSettings, fetchTelemetryHistory } from '../../src/api/client';
import type { TelemetryRecord } from '../../src/api/types';
import { AppBar } from '../../src/components/AppBar';
import {
  Card,
  Chip,
  EmptyState,
  ErrorBanner,
  LoadingBlock,
} from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { useFacilityData } from '../../src/context/DataContext';
import {
  TARIFF_TZS_PER_KWH,
  costFromKwh,
  formatDateTime,
  formatKwh,
  formatTzs,
  formatWatts,
} from '../../src/lib/format';
import { colors, radius, shadow, spacing, type } from '../../src/theme/colors';

const PAGE_SIZE = 10;
const POWER_FILTERS = ['', 'ON', 'OFF', 'UNKNOWN'] as const;

function fieldValue(value: string | number | null | undefined, suffix = '') {
  return value == null || value === '' ? '—' : `${value}${suffix}`;
}

export default function HistoryScreen() {
  const { unitId: initialUnitId } = useLocalSearchParams<{ unitId?: string }>();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { units, loading: unitsLoading } = useFacilityData();

  const [unitId, setUnitId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [powerState, setPowerState] = useState<(typeof POWER_FILTERS)[number]>('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<TelemetryRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tariffTzsPerKwh, setTariffTzsPerKwh] = useState(TARIFF_TZS_PER_KWH);
  const [showUnitPicker, setShowUnitPicker] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchSettings(token)
      .then((settings) => {
        if (Number.isFinite(settings.tariffTzsPerKwh)) {
          setTariffTzsPerKwh(settings.tariffTzsPerKwh);
        }
      })
      .catch(() => {
        /* keep default */
      });
  }, [token]);

  useEffect(() => {
    if (unitId || units.length === 0) return;
    const preferred = initialUnitId && units.some((u) => u.id === initialUnitId)
      ? initialUnitId
      : units[0].id;
    setUnitId(preferred);
  }, [unitId, units, initialUnitId]);

  const selectedUnit = useMemo(
    () => units.find((item) => item.id === unitId) ?? null,
    [units, unitId],
  );

  const load = useCallback(async () => {
    if (!token || !unitId) return;
    setLoading(true);
    setError('');
    try {
      const fromIso = from ? new Date(`${from}T00:00:00`).toISOString() : undefined;
      const toIso = to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined;
      const response = await fetchTelemetryHistory(token, unitId, {
        page,
        pageSize: PAGE_SIZE,
        powerState: powerState || undefined,
        from: fromIso,
        to: toIso,
      });
      setItems(response.items);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load history.');
    } finally {
      setLoading(false);
    }
  }, [token, unitId, page, powerState, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  function resetFilters() {
    setFrom('');
    setTo('');
    setPowerState('');
    setPage(1);
  }

  const bottomPad = Math.max(insets.bottom, 8) + 72;
  const start = total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const end = Math.min(page * PAGE_SIZE, total);
  const rangeLabel = total
    ? `Showing ${start}–${end} of ${total}`
    : 'No readings match these filters.';

  if (unitsLoading && units.length === 0) {
    return (
      <View style={styles.root}>
        <AppBar title="History" subtitle="Device telemetry" />
        <LoadingBlock label="Loading devices…" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppBar title="History" subtitle="Device telemetry history" />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Card style={styles.hero}>
              <View style={styles.heroIcon}>
                <Ionicons name="time" size={22} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>Device telemetry history</Text>
                <Text style={styles.heroSub}>
                  Audit every reading received from an AC controller.
                </Text>
              </View>
            </Card>

            <Card style={styles.filters}>
              <Text style={styles.filterLabel}>Device</Text>
              <Pressable
                style={styles.devicePicker}
                onPress={() => setShowUnitPicker((open) => !open)}
              >
                <Text style={styles.devicePickerText} numberOfLines={1}>
                  {selectedUnit
                    ? `${selectedUnit.name} · ${selectedUnit.assetTag} · ${selectedUnit.room.code}`
                    : 'Select device'}
                </Text>
                <Ionicons
                  name={showUnitPicker ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.textMuted}
                />
              </Pressable>
              {showUnitPicker ? (
                <View style={styles.unitList}>
                  {units.map((unit) => (
                    <Pressable
                      key={unit.id}
                      style={[
                        styles.unitOption,
                        unit.id === unitId && styles.unitOptionActive,
                      ]}
                      onPress={() => {
                        setUnitId(unit.id);
                        setPage(1);
                        setShowUnitPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.unitOptionText,
                          unit.id === unitId && styles.unitOptionTextActive,
                        ]}
                      >
                        {unit.name} · {unit.assetTag} · {unit.room.code}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <Text style={styles.filterLabel}>From</Text>
                  <TextInput
                    style={styles.dateInput}
                    value={from}
                    onChangeText={(value) => {
                      setFrom(value);
                      setPage(1);
                    }}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textMuted}
                    autoCorrect={false}
                  />
                </View>
                <View style={styles.dateField}>
                  <Text style={styles.filterLabel}>To</Text>
                  <TextInput
                    style={styles.dateInput}
                    value={to}
                    onChangeText={(value) => {
                      setTo(value);
                      setPage(1);
                    }}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textMuted}
                    autoCorrect={false}
                  />
                </View>
              </View>

              <Text style={styles.filterLabel}>Power state</Text>
              <View style={styles.chipRow}>
                {POWER_FILTERS.map((option) => (
                  <Chip
                    key={option || 'all'}
                    label={option === '' ? 'All states' : option}
                    active={powerState === option}
                    onPress={() => {
                      setPowerState(option);
                      setPage(1);
                    }}
                  />
                ))}
              </View>

              <Pressable
                style={[styles.clearBtn, !from && !to && !powerState && styles.clearBtnDisabled]}
                onPress={resetFilters}
                disabled={!from && !to && !powerState}
              >
                <Ionicons name="filter" size={16} color={colors.textSoft} />
                <Text style={styles.clearBtnText}>Clear filters</Text>
              </Pressable>
            </Card>

            {selectedUnit ? (
              <Card style={styles.summary}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryEyebrow}>Selected controller</Text>
                  <Text style={styles.summaryTitle}>{selectedUnit.name}</Text>
                  <Text style={styles.summarySub}>
                    {selectedUnit.room.floor.building.name} · {selectedUnit.room.name} ·{' '}
                    {selectedUnit.assetTag}
                  </Text>
                </View>
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryStatValue}>{total || '—'}</Text>
                  <Text style={styles.summaryStatLabel}>matching readings</Text>
                </View>
              </Card>
            ) : null}

            <ErrorBanner message={error} />
            <Text style={styles.rangeLabel}>
              {loading ? 'Loading readings…' : rangeLabel}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <HistoryRow record={item} tariffTzsPerKwh={tariffTzsPerKwh} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          loading ? (
            <LoadingBlock label="Loading device history…" />
          ) : (
            <EmptyState
              icon="time-outline"
              title="No readings"
              message="No telemetry readings found."
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
                <Ionicons
                  name="chevron-back"
                  size={16}
                  color={page === 1 ? colors.textMuted : colors.text}
                />
                <Text style={[styles.pageBtnText, page === 1 && styles.pageBtnTextDisabled]}>
                  Previous
                </Text>
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

function HistoryRow({
  record,
  tariffTzsPerKwh,
}: {
  record: TelemetryRecord;
  tariffTzsPerKwh: number;
}) {
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
        <Field label="Voltage" value={fieldValue(record.voltage, ' V')} />
        <Field label="Current" value={fieldValue(record.current, ' A')} />
        <Field label="Active power" value={formatWatts(record.activePowerW)} />
        <Field label="Energy" value={formatKwh(record.energyKwh)} />
        <Field
          label="Cost"
          value={formatTzs(costFromKwh(record.energyKwh, tariffTzsPerKwh))}
        />
        <Field label="Error" value={fieldValue(record.errorCode)} />
        <Field label="RSSI" value={fieldValue(record.rssi, ' dBm')} />
      </View>
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
  content: { padding: spacing.lg },
  header: { gap: 12, marginBottom: 12 },
  hero: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: '800',
  },
  heroSub: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: type.caption,
    lineHeight: 18,
  },
  filters: { gap: 10 },
  filterLabel: {
    color: colors.textMuted,
    fontSize: type.micro,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  devicePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.surfaceMuted,
  },
  devicePickerText: {
    flex: 1,
    color: colors.text,
    fontSize: type.caption,
    fontWeight: '600',
  },
  unitList: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  unitOption: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  unitOptionActive: {
    backgroundColor: colors.brandSoft,
  },
  unitOptionText: {
    color: colors.textSoft,
    fontSize: type.caption,
    fontWeight: '600',
  },
  unitOptionTextActive: {
    color: colors.brandDark,
    fontWeight: '800',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateField: {
    flex: 1,
    gap: 6,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.text,
    fontSize: type.caption,
    fontWeight: '600',
    backgroundColor: colors.surfaceMuted,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  clearBtnDisabled: { opacity: 0.4 },
  clearBtnText: {
    color: colors.textSoft,
    fontSize: type.caption,
    fontWeight: '700',
  },
  summary: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  summaryEyebrow: {
    color: colors.textMuted,
    fontSize: type.micro,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  summaryTitle: {
    marginTop: 4,
    color: colors.text,
    fontSize: type.body,
    fontWeight: '800',
  },
  summarySub: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: type.caption,
  },
  summaryStat: {
    alignItems: 'flex-end',
  },
  summaryStatValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  summaryStatLabel: {
    color: colors.textMuted,
    fontSize: type.micro,
    fontWeight: '600',
    textAlign: 'right',
  },
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
  field: { width: '46%' },
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
