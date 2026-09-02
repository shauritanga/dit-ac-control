import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { apiBaseUrl, isUsingProductionApi } from '../../src/api/config';
import { Screen } from '../../src/components/Screen';
import {
  Card,
  PrimaryButton,
  SecondaryButton,
} from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { useFacilityData } from '../../src/context/DataContext';
import { roleLabel } from '../../src/lib/format';
import { colors, radius, spacing, type } from '../../src/theme/colors';

export default function AccountScreen() {
  const { user, logout } = useAuth();
  const { refresh } = useFacilityData();
  const [busy, setBusy] = useState(false);

  const initials = (user?.name ?? 'DIT')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || 'D';

  async function handleLogout() {
    Alert.alert('Sign out', 'End this session on this device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await logout();
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  return (
    <Screen title="Profile" subtitle="Account & session" showNotifications={false}>
      <Card style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.profileText}>
          <Text style={styles.name}>{user?.name ?? 'Technician'}</Text>
          <Text style={styles.email}>{user?.email ?? '—'}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>
              {user?.role ? roleLabel(user.role) : 'User'}
            </Text>
          </View>
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.rowLabel}>API endpoint</Text>
        <Text style={styles.rowValue} selectable>
          {apiBaseUrl}
        </Text>
        <Text style={styles.rowLabel}>Environment</Text>
        <Text style={styles.rowValue}>
          {isUsingProductionApi
            ? 'Production server'
            : __DEV__
              ? 'Development'
              : 'Custom'}
        </Text>
        <Text style={styles.hint}>
          Field app connects to the live DIT AC Control API over your network.
        </Text>
      </Card>

      <SecondaryButton
        label="Refresh facility data"
        icon="refresh"
        onPress={() => void refresh()}
      />

      <PrimaryButton
        label="Sign out"
        icon="log-out-outline"
        onPress={() => void handleLogout()}
        loading={busy}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: colors.brandMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.brandDeep,
    fontWeight: '800',
    fontSize: 20,
  },
  profileText: { flex: 1, gap: 4 },
  name: {
    fontSize: type.title,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  email: {
    color: colors.textMuted,
    fontSize: type.caption,
  },
  rolePill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: colors.brandSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  roleText: {
    color: colors.brandDeep,
    fontWeight: '800',
    fontSize: type.micro,
  },
  card: { gap: 4 },
  rowLabel: {
    marginTop: 8,
    fontSize: type.micro,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  rowValue: {
    color: colors.text,
    fontSize: type.caption,
    lineHeight: 20,
    fontWeight: '600',
  },
  hint: {
    marginTop: 12,
    color: colors.textMuted,
    fontSize: type.caption,
    lineHeight: 18,
  },
});
