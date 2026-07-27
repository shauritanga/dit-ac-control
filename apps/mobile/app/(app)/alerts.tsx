import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertRow } from '../../src/components/AlertRow';
import { AppBar } from '../../src/components/AppBar';
import {
  EmptyState,
  ErrorBanner,
  LoadingBlock,
} from '../../src/components/ui';
import { useFacilityData } from '../../src/context/DataContext';
import { colors, spacing } from '../../src/theme/colors';

export default function AlertsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { alerts, units, loading, refreshing, error, refresh } =
    useFacilityData();
  const bottomPad = Math.max(insets.bottom, 8) + 72;

  const items =
    alerts.length > 0
      ? alerts
      : units.flatMap((u) =>
          (u.alerts ?? []).map((a) => ({
            ...a,
            acUnit: {
              id: u.id,
              name: u.name,
              assetTag: u.assetTag,
              room: { name: u.room.name, code: u.room.code },
            },
          })),
        );

  if (loading && items.length === 0) {
    return (
      <View style={styles.root}>
        <AppBar
          title="Notifications"
          subtitle="Alerts"
          showBack
          showNotifications={false}
          showAvatar={false}
        />
        <LoadingBlock label="Loading notifications…" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppBar
        title="Notifications"
        subtitle={
          items.length
            ? `${items.length} item${items.length === 1 ? '' : 's'}`
            : 'All clear'
        }
        showBack
        showNotifications={false}
        showAvatar={false}
      />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad }]}
        refreshing={refreshing}
        onRefresh={() => void refresh()}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<ErrorBanner message={error} />}
        renderItem={({ item }) => (
          <AlertRow
            alert={item}
            onPress={
              item.acUnit?.id
                ? () => router.push(`/(app)/unit/${item.acUnit!.id}`)
                : undefined
            }
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          <EmptyState
            icon="checkmark-circle"
            title="All clear"
            message="No open or recent alerts for this facility."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  list: {
    padding: spacing.lg,
    gap: 0,
  },
});
