export const colors = {
  bg: '#F0F4F8',
  bgElevated: '#F7FAFC',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  surfaceTint: '#E6F4F2',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  text: '#0F172A',
  textMuted: '#64748B',
  textSoft: '#475569',
  textInverse: '#FFFFFF',
  brand: '#0D9488',
  brandSoft: '#CCFBF1',
  brandMuted: '#99F6E4',
  brandDark: '#0F766E',
  brandDeep: '#115E59',
  ink: '#0F172A',
  inkSoft: '#1E293B',
  danger: '#DC2626',
  dangerBg: '#FEF2F2',
  dangerBorder: '#FECACA',
  dangerSoft: '#FEE2E2',
  success: '#059669',
  successBg: '#ECFDF5',
  successSoft: '#D1FAE5',
  warning: '#D97706',
  warningBg: '#FFFBEB',
  warningSoft: '#FEF3C7',
  info: '#0284C7',
  infoBg: '#F0F9FF',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(15, 23, 42, 0.48)',
  tabInactive: '#94A3B8',
  shadow: 'rgba(15, 23, 42, 0.08)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const type = {
  display: 28,
  title: 22,
  heading: 17,
  body: 15,
  caption: 13,
  micro: 11,
} as const;

export const shadow = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  bar: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 12,
  },
  soft: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;
