import { Redirect } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiBaseUrl } from '../src/api/config';
import { ApiError } from '../src/api/client';
import { useAuth } from '../src/context/AuthContext';
import {
  ErrorBanner,
  PrimaryButton,
} from '../src/components/ui';
import { colors, radius, shadow, spacing, type } from '../src/theme/colors';

const ditLogo = require('../../../dit-logo.png');

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { token, login } = useAuth();
  const [email, setEmail] = useState('admin@dit.ac.tz');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (token) {
    return <Redirect href="/(app)" />;
  }

  async function handleLogin() {
    setError('');
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Invalid email or password.');
      } else {
        setError(err instanceof Error ? err.message : 'Login failed.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 },
      ]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.wrap}>
          <View style={styles.hero}>
            <Image
              source={ditLogo}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="DIT logo"
            />
            <Text style={styles.kicker}>Facilities · Field ops</Text>
            <Text style={styles.title}>AC Control</Text>
            <Text style={styles.subtitle}>
              Technician access for live unit status, alerts, and commands.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="username"
              placeholder="you@dit.ac.tz"
              placeholderTextColor={colors.textMuted}
              editable={!loading}
            />

            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                textContentType="password"
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                editable={!loading}
                onSubmitEditing={() => void handleLogin()}
              />
              <Pressable
                style={styles.showBtn}
                onPress={() => setShowPassword((v) => !v)}
              >
                <Text style={styles.showText}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </Pressable>
            </View>

            <ErrorBanner message={error} />

            <PrimaryButton
              label="Sign in"
              onPress={() => void handleLogin()}
              loading={loading}
              icon="log-in-outline"
            />
          </View>

          <Text style={styles.apiHint} numberOfLines={2}>
            Connected to {apiBaseUrl}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: { flex: 1 },
  wrap: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xl,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
    maxWidth: 380,
  },
  logo: {
    width: 104,
    height: 104,
    marginBottom: spacing.sm,
  },
  kicker: {
    color: colors.brand,
    fontWeight: '800',
    fontSize: type.micro,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: type.body,
    lineHeight: 22,
    maxWidth: 320,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...shadow.card,
  },
  label: {
    fontSize: type.caption,
    fontWeight: '700',
    color: colors.textSoft,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: colors.white,
    color: colors.text,
    fontSize: type.body,
    fontWeight: '500',
  },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 64 },
  showBtn: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  showText: {
    color: colors.brand,
    fontWeight: '800',
    fontSize: type.caption,
  },
  apiHint: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: type.micro,
    fontWeight: '600',
  },
});
