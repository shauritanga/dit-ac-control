import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AcUnit } from '../api/types';
import { formatTemp, formatWatts } from '../lib/format';
import { colors, radius, shadow, spacing, type } from '../theme/colors';
import { StatusBadge } from './ui';

type Props = {
  unit: AcUnit;
  onPress: () => void;
};

export function UnitCard({ unit, onPress }: Props) {
  const latest = unit.telemetry?.[0];
  const alertCount = unit.alerts?.length ?? 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.top}>
        <View style={styles.iconWrap}>
          <Ionicons
            name={unit.powerState === 'ON' ? 'snow' : 'snow-outline'}
            size={20}
            color={unit.online ? colors.brandDark : colors.textMuted}
          />
        </View>
        <View style={styles.titles}>
          <Text style={styles.name} numberOfLines={1}>
            {unit.name}
          </Text>
          <Text style={styles.room} numberOfLines={1}>
            {unit.room.floor.building.name} · {unit.room.name}
          </Text>
        </View>
        <StatusBadge online={unit.online} />
      </View>

      <View style={styles.metaRow}>
        <Meta
          icon="power"
          label={unit.powerState}
          emphasis={unit.powerState === 'ON'}
        />
        <Meta icon="thermometer-outline" label={formatTemp(latest?.ambientTempC)} />
        <Meta icon="flash-outline" label={formatWatts(latest?.activePowerW)} />
        <Meta icon="options-outline" label={`${unit.setpointC}°`} />
      </View>

      {alertCount > 0 ? (
        <View style={styles.alertRow}>
          <Ionicons name="warning" size={14} color={colors.warning} />
          <Text style={styles.alertText}>
            {alertCount} open alert{alertCount === 1 ? '' : 's'}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={styles.chevron} />
        </View>
      ) : (
        <View style={styles.footer}>
          <Text style={styles.asset}>{unit.assetTag}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      )}
    </Pressable>
  );
}

function Meta({
  icon,
  label,
  emphasis,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  emphasis?: boolean;
}) {
  return (
    <View style={[styles.meta, emphasis && styles.metaOn]}>
      <Ionicons
        name={icon}
        size={13}
        color={emphasis ? colors.brandDark : colors.textMuted}
      />
      <Text style={[styles.metaText, emphasis && styles.metaTextOn]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadow.card,
  },
  pressed: { opacity: 0.94, transform: [{ scale: 0.995 }] },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: { flex: 1, minWidth: 0, gap: 2 },
  name: {
    fontSize: type.body,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.2,
  },
  room: {
    color: colors.textMuted,
    fontSize: type.caption,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  metaOn: {
    backgroundColor: colors.brandSoft,
  },
  metaText: {
    fontSize: type.micro,
    fontWeight: '700',
    color: colors.textSoft,
  },
  metaTextOn: {
    color: colors.brandDeep,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.warningBg,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  alertText: {
    flex: 1,
    color: colors.warning,
    fontWeight: '700',
    fontSize: type.caption,
  },
  chevron: { marginLeft: 'auto' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  asset: {
    color: colors.textMuted,
    fontSize: type.micro,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
