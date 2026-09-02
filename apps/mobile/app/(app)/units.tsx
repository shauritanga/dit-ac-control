import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  FlatList,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBar } from '../../src/components/AppBar';
import { UnitCard } from '../../src/components/UnitCard';
import {
  Chip,
  EmptyState,
  ErrorBanner,
  LoadingBlock,
} from '../../src/components/ui';
import { useFacilityData } from '../../src/context/DataContext';
import { colors, radius, spacing, type } from '../../src/theme/colors';

type Filter = 'all' | 'online' | 'offline' | 'on' | 'off';

export default function UnitsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { units, loading, refreshing, error, refresh } = useFacilityData();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const bottomPad = Math.max(insets.bottom, 8) + 72;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return units.filter((unit) => {
      if (filter === 'online' && !unit.online) return false;
      if (filter === 'offline' && unit.online) return false;
      if (filter === 'on' && unit.powerState !== 'ON') return false;
      if (filter === 'off' && unit.powerState !== 'OFF') return false;
      if (!q) return true;
      const hay = [
        unit.name,
        unit.assetTag,
        unit.room.name,
        unit.room.code,
        unit.room.floor.building.name,
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [units, query, filter]);

  if (loading && units.length === 0) {
    return (
      <View style={styles.root}>
        <AppBar title="Units" subtitle="AC fleet" />
        <LoadingBlock label="Loading units…" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppBar title="Units" subtitle={`${units.length} controllers`} />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad }]}
        refreshing={refreshing}
        onRefresh={() => void refresh()}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.searchWrap}>
              <TextInput
                style={styles.search}
                value={query}
                onChangeText={setQuery}
                placeholder="Search name, room, asset…"
                placeholderTextColor={colors.textMuted}
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
            </View>
            <View style={styles.chips}>
              {(
                [
                  ['all', 'All'],
                  ['online', 'Online'],
                  ['offline', 'Offline'],
                  ['on', 'On'],
                  ['off', 'Off'],
                ] as const
              ).map(([id, label]) => (
                <Chip
                  key={id}
                  label={label}
                  active={filter === id}
                  onPress={() => setFilter(id)}
                />
              ))}
            </View>
            <ErrorBanner message={error} />
          </View>
        }
        renderItem={({ item }) => (
          <UnitCard
            unit={item}
            onPress={() => router.push(`/(app)/unit/${item.id}`)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          <EmptyState
            icon="search"
            title="No units match"
            message="Try another search or filter."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  header: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  searchWrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  search: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: type.body,
    color: colors.text,
    fontWeight: '500',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
