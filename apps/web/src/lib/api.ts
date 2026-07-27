// Dev: hit Nest directly. Production: same-origin /v1 via nginx (never localhost).
const API_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? 'http://localhost:3001/v1' : '/v1');

export { API_URL };

// Socket.IO namespace `/realtime` on the API host (or same origin in production).
export const SOCKET_URL = API_URL.startsWith('http')
  ? API_URL.replace(/\/v1\/?$/, '/realtime')
  : '/realtime';

export async function apiRequest<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}
