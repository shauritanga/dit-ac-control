export type AcUnit = {
  id: string;
  name: string;
  assetTag: string;
  powerState: 'ON' | 'OFF' | 'UNKNOWN';
  mode: string;
  setpointC: number;
  fanSpeed: string;
  online: boolean;
  lastSeenAt?: string;
  room: {
    name: string;
    code: string;
    floor: { name: string; building: { name: string } };
  };
  telemetry: Array<{
    ambientTempC?: number;
    activePowerW?: number;
    humidityPct?: number;
    recordedAt: string;
  }>;
  alerts: Array<{ id: string; severity: string; title: string; message: string }>;
};

export type Summary = {
  total: number;
  online: number;
  offline: number;
  poweredOn: number;
  poweredOff?: number;
  unknownPower?: number;
  openAlerts: number;
  criticalAlerts?: number;
  warningAlerts?: number;
  pendingCommands: number;
  failedCommands24h?: number;
  ackedCommands24h?: number;
  commands24h?: number;
  activePowerW: number;
  avgAmbientTempC?: number | null;
  avgHumidityPct?: number | null;
  avgSetpointC?: number | null;
  energyKwh24h?: number;
  totalBuildings?: number;
  totalRooms?: number;
  totalDevices?: number;
  devicesOnline?: number;
  onlinePct?: number;
};

export type OverviewBreakdown = {
  key: string;
  count: number;
};

export type OverviewBuilding = {
  id: string;
  name: string;
  campus: string | null;
  floors: number;
  rooms: number;
  unitCount: number;
  onlineCount: number;
  poweredOnCount: number;
  openAlerts: number;
  activePowerW: number;
};

export type OverviewAttentionUnit = {
  id: string;
  name: string;
  assetTag: string;
  online: boolean;
  powerState: string;
  mode: string;
  setpointC: number;
  ambientTempC: number | null;
  activePowerW: number | null;
  lastSeenAt: string | null;
  building: string;
  room: string;
  roomCode: string;
  openAlerts: number;
  reasons: string[];
  severity: 'critical' | 'warning';
};

export type OverviewConsumer = {
  id: string;
  name: string;
  assetTag: string;
  building: string;
  room: string;
  powerState: string;
  online: boolean;
  activePowerW: number;
};

export type OverviewAlert = {
  id: string;
  severity: string;
  title: string;
  message: string;
  createdAt: string;
  acUnit: {
    id: string;
    name: string;
    assetTag: string;
    room: { name: string; code: string };
  };
};

export type OverviewCommand = {
  id: string;
  type: string;
  status: string;
  payload: unknown;
  result: string | null;
  createdAt: string;
  sentAt: string | null;
  ackedAt: string | null;
  acUnit: {
    id: string;
    name: string;
    assetTag: string;
    room: { name: string; code: string };
  };
  issuedBy: { name: string; email: string } | null;
};

export type OverviewActivity = {
  id: string;
  kind: 'alert' | 'command';
  title: string;
  detail: string;
  status: string;
  createdAt: string;
  unitName: string;
  room: string;
};

export type OverviewLoadPoint = {
  time: string;
  label: string;
  powerW: number;
  tempC: number | null;
  humidityPct: number | null;
};

export type OverviewDevice = {
  id: string;
  serial: string;
  firmware: string | null;
  rssi: number | null;
  ipAddress: string | null;
  lastSeenAt: string | null;
  online: boolean;
  acUnit: {
    id: string;
    name: string;
    assetTag: string;
    online: boolean;
  } | null;
};

export type OverviewData = {
  generatedAt: string;
  summary: Summary;
  modeBreakdown: OverviewBreakdown[];
  powerBreakdown: OverviewBreakdown[];
  buildingStats: OverviewBuilding[];
  attentionUnits: OverviewAttentionUnit[];
  topConsumers: OverviewConsumer[];
  recentAlerts: OverviewAlert[];
  recentActivity: OverviewActivity[];
  recentCommands: OverviewCommand[];
  loadTrend: OverviewLoadPoint[];
  deviceHealth: OverviewDevice[];
};

export type UserProfile = {
  name: string;
  email: string;
  role: string;
  initials: string;
};

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  severity: 'info' | 'warning' | 'critical' | 'success';
};

export type NavItem = {
  id: string;
  label: string;
  icon:
    | 'overview'
    | 'operations'
    | 'buildings'
    | 'devices'
    | 'history'
    | 'reports'
    | 'settings';
};

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
