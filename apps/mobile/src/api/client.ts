import { apiBaseUrl } from './config';
import type {
  AcUnit,
  AuthUser,
  EnergyPeriod,
  EnergyReport,
  LoginResponse,
  OverviewData,
  Summary,
  TelemetryHistoryResponse,
  WorkspaceSettings,
} from './types';

export class ApiError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(body || `Request failed (${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function friendlyNetworkError(url: string): Error {
  return new Error(
    `Cannot reach API at ${url}. Check network, VPN, and that the server is online.`,
  );
}

async function parseError(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const json = JSON.parse(text) as { message?: string | string[] };
    if (Array.isArray(json.message)) return json.message.join(', ');
    if (typeof json.message === 'string') return json.message;
  } catch {
    // keep raw text
  }
  return text || `HTTP ${response.status}`;
}

export async function apiRequest<T>(
  path: string,
  token: string | null,
  options: RequestInit = {},
): Promise<T> {
  const url = `${apiBaseUrl}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw friendlyNetworkError(apiBaseUrl);
  }

  if (!response.ok) {
    throw new ApiError(response.status, await parseError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function loginRequest(
  email: string,
  password: string,
): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', null, {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password }),
  });
}

export async function fetchMe(token: string): Promise<AuthUser> {
  return apiRequest<AuthUser>('/auth/me', token);
}

export async function fetchSummary(token: string): Promise<Summary> {
  return apiRequest<Summary>('/dashboard/summary', token);
}

export async function fetchOverview(token: string): Promise<OverviewData> {
  return apiRequest<OverviewData>('/dashboard/overview', token);
}

export async function fetchUnits(
  token: string,
  params?: { q?: string; status?: string },
): Promise<AcUnit[]> {
  const search = new URLSearchParams();
  if (params?.q) search.set('q', params.q);
  if (params?.status && params.status !== 'all') search.set('status', params.status);
  const qs = search.toString();
  return apiRequest<AcUnit[]>(`/ac-units${qs ? `?${qs}` : ''}`, token);
}

export async function fetchUnit(token: string, id: string): Promise<AcUnit> {
  return apiRequest<AcUnit>(`/ac-units/${id}`, token);
}

export async function fetchTelemetryHistory(
  token: string,
  unitId: string,
  params?: {
    page?: number;
    pageSize?: number;
    powerState?: string;
    from?: string;
    to?: string;
  },
): Promise<TelemetryHistoryResponse> {
  const search = new URLSearchParams({
    page: String(params?.page ?? 1),
    pageSize: String(params?.pageSize ?? 10),
  });
  if (params?.powerState) search.set('powerState', params.powerState);
  if (params?.from) search.set('from', params.from);
  if (params?.to) search.set('to', params.to);
  return apiRequest<TelemetryHistoryResponse>(
    `/ac-units/${unitId}/telemetry?${search}`,
    token,
  );
}

export async function fetchSettings(token: string): Promise<WorkspaceSettings> {
  return apiRequest<WorkspaceSettings>('/settings', token);
}

export async function fetchEnergyReport(
  token: string,
  period: EnergyPeriod,
): Promise<EnergyReport> {
  return apiRequest<EnergyReport>(`/dashboard/energy-report?period=${period}`, token);
}

export async function issueCommand(
  token: string,
  unitId: string,
  type: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  return apiRequest(`/ac-units/${unitId}/commands`, token, {
    method: 'POST',
    body: JSON.stringify({ type, payload }),
  });
}
