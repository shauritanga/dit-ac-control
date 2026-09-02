import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useFacilityData } from '../context/DataContext';
import { colors, radius, shadow, spacing, type } from '../theme/colors';

type AppBarProps = {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  /** Bell → notifications screen. Default true. */
  showNotifications?: boolean;
  /** Avatar on the LEFT only (home). Default false. */
  showAvatar?: boolean;
  rightSlot?: ReactNode;
  transparent?: boolean;
};

export function AppBar({
  title = 'DIT AC Control',
  subtitle,
  showBack = false,
  onBack,
  showNotifications = true,
  showAvatar = false,
  rightSlot,
  transparent = false,
}: AppBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { summary, alerts } = useFacilityData();
  const unread =
    summary?.openAlerts ??
    alerts.filter((a) => !a.resolved).length ??
    0;

  const initials =
    (user?.name ?? 'DIT')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || 'D';

  return (
    <View
      style={[
        styles.wrap,
        !transparent && styles.solid,
        { paddingTop: Math.max(insets.top, 12) },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          {showBack ? (
            <Pressable
              style={styles.iconBtn}
              onPress={onBack ?? (() => router.back())}
              hitSlop={10}
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
          ) : showAvatar ? (
            <Pressable
              style={styles.avatar}
              onPress={() => router.push('/(app)/account')}
              accessibilityLabel="Profile"
            >
              <Text style={styles.avatarText}>{initials}</Text>
            </Pressable>
          ) : (
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>DIT</Text>
            </View>
          )}
          <View style={styles.titles}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.right}>
          {rightSlot}
          {showNotifications ? (
            <Pressable
              style={styles.iconBtn}
              onPress={() => router.push('/(app)/alerts')}
              accessibilityLabel={
                unread > 0
                  ? `Notifications, ${unread} open alerts`
                  : 'Notifications'
              }
            >
              <Ionicons
                name={unread > 0 ? 'notifications' : 'notifications-outline'}
                size={22}
                color={colors.inkSoft}
              />
              {unread > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unread > 9 ? '9+' : unread}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    zIndex: 20,
  },
  solid: {
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    ...shadow.soft,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minWidth: 0,
  },
  titles: { flex: 1, minWidth: 0 },
  title: {
    fontSize: type.heading,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 1,
    fontSize: type.micro,
    fontWeight: '600',
    color: colors.textMuted,
  },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.4,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: spacing.sm,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  badgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: colors.brandMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.brandDeep,
    fontWeight: '800',
    fontSize: 13,
  },
});
