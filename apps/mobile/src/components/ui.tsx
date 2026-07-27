import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { colors, radius, shadow, spacing, type } from '../theme/colors';

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={10} style={styles.sectionActionBtn}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.brand} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <View style={styles.errorBanner}>
      <View style={styles.errorIcon}>
        <Ionicons name="alert-circle" size={18} color={colors.danger} />
      </View>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function SuccessBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <View style={styles.successBanner}>
      <Ionicons name="checkmark-circle" size={18} color={colors.success} />
      <Text style={styles.successText}>{message}</Text>
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  icon,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.primaryBtn,
        (disabled || loading) && styles.btnDisabled,
        pressed && !disabled && styles.btnPressed,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <View style={styles.btnInner}>
          {icon ? <Ionicons name={icon} size={18} color={colors.white} /> : null}
          <Text style={styles.primaryBtnText}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  danger,
  icon,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.secondaryBtn,
        danger && styles.secondaryDanger,
        pressed && styles.btnPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.btnInner}>
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={danger ? colors.danger : colors.text}
          />
        ) : null}
        <Text
          style={[styles.secondaryBtnText, danger && { color: colors.danger }]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <View style={styles.loadingOrb}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
      <Text style={styles.loadingLabel}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  message,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={26} color={colors.brand} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
    </View>
  );
}

export function StatusBadge({ online }: { online: boolean }) {
  return (
    <View style={[styles.badge, online ? styles.badgeOnline : styles.badgeOffline]}>
      <View style={[styles.badgeDot, online ? styles.dotOnline : styles.dotOffline]} />
      <Text style={[styles.badgeText, online ? styles.badgeTextOn : styles.badgeTextOff]}>
        {online ? 'Online' : 'Offline'}
      </Text>
    </View>
  );
}

export function MetricTile({
  icon,
  label,
  value,
  tone = 'default',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tone?: 'default' | 'danger' | 'success' | 'warning';
}) {
  const palette = {
    default: { bg: colors.brandSoft, icon: colors.brandDark },
    danger: { bg: colors.dangerSoft, icon: colors.danger },
    success: { bg: colors.successSoft, icon: colors.success },
    warning: { bg: colors.warningSoft, icon: colors.warning },
  }[tone];

  return (
    <View style={styles.metric}>
      <View style={[styles.metricIcon, { backgroundColor: palette.bg }]}>
        <Ionicons name={icon} size={18} color={palette.icon} />
      </View>
      <Text style={styles.metricValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function Muted({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: type.heading,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.2,
  },
  sectionActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  sectionAction: {
    color: colors.brand,
    fontWeight: '700',
    fontSize: type.caption,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorIcon: {
    marginTop: 1,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    lineHeight: 20,
    fontSize: type.caption,
    fontWeight: '600',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.successBg,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  successText: {
    flex: 1,
    color: colors.success,
    lineHeight: 20,
    fontSize: type.caption,
    fontWeight: '600',
  },
  primaryBtn: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    ...shadow.soft,
  },
  primaryBtnText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: type.body,
  },
  secondaryBtn: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  secondaryDanger: {
    borderColor: colors.dangerBorder,
    backgroundColor: colors.dangerBg,
  },
  secondaryBtnText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: type.body,
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnDisabled: { opacity: 0.55 },
  btnPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: 48,
  },
  loadingOrb: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingLabel: {
    color: colors.textMuted,
    fontSize: type.body,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: type.heading,
    fontWeight: '800',
    color: colors.text,
  },
  emptyMessage: {
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: type.caption,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: radius.pill,
  },
  badgeOnline: { backgroundColor: colors.successSoft },
  badgeOffline: { backgroundColor: colors.dangerSoft },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotOnline: { backgroundColor: colors.success },
  dotOffline: { backgroundColor: colors.danger },
  badgeText: {
    fontWeight: '800',
    fontSize: type.micro,
  },
  badgeTextOn: { color: colors.success },
  badgeTextOff: { color: colors.danger },
  metric: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
    ...shadow.soft,
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.4,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: type.caption,
    fontWeight: '600',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
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
    color: colors.textSoft,
    fontWeight: '700',
    fontSize: type.caption,
  },
  chipTextActive: {
    color: colors.white,
  },
  muted: {
    color: colors.textMuted,
    fontSize: type.caption,
    lineHeight: 20,
  },
});
