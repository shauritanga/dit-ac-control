import { Platform } from 'react-native';

/**
 * Production dashboard/API (nginx → Nest).
 * Override anytime with EXPO_PUBLIC_API_URL.
 */
export const PRODUCTION_API_URL = 'http://139.59.139.30:8080/v1';

const devHost = Platform.select({
  android: '10.0.2.2',
  ios: 'localhost',
  default: 'localhost',
});

const devApiUrl = `http://${devHost}:3001/v1`;

export const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_URL ??
  (__DEV__ ? devApiUrl : PRODUCTION_API_URL);

/** Socket.IO namespace used by Nest RealtimeGateway */
export const socketUrl = apiBaseUrl.startsWith('http')
  ? apiBaseUrl.replace(/\/v1\/?$/, '/realtime')
  : '/realtime';

export const isUsingProductionApi =
  apiBaseUrl.includes('139.59.139.30') ||
  (!__DEV__ && !process.env.EXPO_PUBLIC_API_URL?.includes('localhost'));
