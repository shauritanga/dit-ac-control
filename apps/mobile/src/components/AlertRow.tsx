import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AlertItem } from '../api/types';
import { formatRelativeTime, severityTone } from '../lib/format';
import { colors, radius, shadow, spacing, type } from '../theme/colors';

type Props = {
  alert: AlertItem;
  onPress?: () => void;
};

export function AlertRow({ alert, onPress }: Props) {
  const tone = severityTone(alert.severity);
  const icon =
    tone === 'critical'
      ? 'close-circle'
      : tone === 'warning'
        ? 'warning'
        : 'information-circle';
  const color =
    tone === 'critical'
      ? colors.danger
      : tone === 'warning'
        ? colors.warning
        : colors.info;
  const bg =
    tone === 'critical'
      ? colors.dangerSoft
      : tone === 'warning'
        ? colors.warningSoft
        : colors.infoBg;

  const body = (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {alert.title}
        </Text>
        <Text style={styles.message} numberOfLines={2}>
          {alert.acUnit
            ? `${alert.acUnit.name}${alert.message ? ` · ${alert.message}` : ''}`
            : alert.message || 'Facility alert'}
        </Text>
        <Text style={styles.time}>{formatRelativeTime(alert.createdAt)}</Text>
      </View>
      {onPress ? (
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        onPress={onPress}
      >
        {body}
      </Pressable>
    );
  }
  return <View style={styles.card}>{body}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },
  pressed: { opacity: 0.94 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2, minWidth: 0 },
  title: {
    fontWeight: '800',
    color: colors.text,
    fontSize: type.body,
  },
  message: {
    color: colors.textMuted,
    fontSize: type.caption,
    lineHeight: 18,
  },
  time: {
    marginTop: 4,
    color: colors.textSoft,
    fontSize: type.micro,
    fontWeight: '700',
  },
});
