export type UserRole = 'ADMIN' | 'FACILITIES_MANAGER' | 'TECHNICIAN' | 'VIEWER';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type LoginResponse = {
  accessToken: string;
  user?: AuthUser;
};

export type Summary = {
  total: number;
  online: number;
  offline: number;
  poweredOn: number;
  openAlerts: number;
  activePowerW: number;
  pendingCommands?: number;
  avgAmbientTempC?: number | null;
  avgHumidityPct?: number | null;
  energyKwh24h?: number | null;
  commands24h?: number;
};

export type TelemetryReading = {
  ambientTempC?: number | null;
  humidityPct?: number | null;
  activePowerW?: number | null;
  recordedAt: string;
};

export type AlertItem = {
  id: string;
  title: string;
  message?: string;
  severity: string;
  resolved?: boolean;
  createdAt?: string;
  acUnit?: {
    id: string;
    name: string;
    assetTag?: string;
    room?: { name: string; code?: string };
  };
};

export type AcUnit = {
  id: string;
  name: string;
  assetTag: string;
  powerState: 'ON' | 'OFF' | 'UNKNOWN';
  mode: string;
  setpointC: number;
  fanSpeed: string;
  online: boolean;
  lastSeenAt?: string | null;
  room: {
    name: string;
    code: string;
    floor: {
      name: string;
      building: { name: string; campus?: string | null };
    };
  };
  telemetry: TelemetryReading[];
  alerts: AlertItem[];
};

export type OverviewData = {
  summary: Summary;
  attentionUnits?: AcUnit[];
  recentAlerts?: AlertItem[];
  recentCommands?: Array<{
    id: string;
    type: string;
    status: string;
    createdAt: string;
    acUnit: { id: string; name: string };
  }>;
};

export type CommandType = 'POWER' | 'SETPOINT' | 'MODE' | 'FAN_SPEED' | 'SWING' | 'FULL_STATE';

export type TelemetryRecord = {
  id: string;
  powerState: 'ON' | 'OFF' | 'UNKNOWN';
  mode: string;
  ambientTempC: number | null;
  coilTempC: number | null;
  humidityPct: number | null;
  setpointC: number | null;
  fanSpeed: string | null;
  swingEnabled: boolean | null;
  voltage: number | null;
  current: number | null;
  activePowerW: number | null;
  energyKwh: number | null;
  errorCode: string | null;
  rssi: number | null;
  recordedAt: string;
};

export type TelemetryHistoryResponse = {
  items: TelemetryRecord[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
