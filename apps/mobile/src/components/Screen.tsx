import type { ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme/colors';
import { AppBar } from './AppBar';

type ScreenProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  showNotifications?: boolean;
  /** Left avatar — home only */
  showAvatar?: boolean;
  appBarRight?: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  padded?: boolean;
};

export function Screen({
  children,
  title,
  subtitle,
  showBack,
  onBack,
  showNotifications = true,
  showAvatar = false,
  appBarRight,
  scroll = true,
  refreshing = false,
  onRefresh,
  contentStyle,
  padded = true,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  // Tab bar height (~56 content) + safe bottom inset + breathing room
  const bottomPad = Math.max(insets.bottom, 8) + 72;

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        padded && styles.pad,
        { paddingBottom: bottomPad },
        contentStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.flex,
        padded && styles.pad,
        { paddingBottom: bottomPad },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <View style={styles.root}>
      <AppBar
        title={title}
        subtitle={subtitle}
        showBack={showBack}
        onBack={onBack}
        showNotifications={showNotifications}
        showAvatar={showAvatar}
        rightSlot={appBarRight}
      />
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: { flex: 1 },
  pad: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
});
