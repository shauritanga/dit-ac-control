import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type EnergyPeriod = 'today' | 'week' | 'month';

/** Blended TANESCO-style tariff used for estimated cost (TZS / kWh). */
const TARIFF_TZS_PER_KWH = 750;
/** Live load at or above this is flagged High on the energy report. */
const HIGH_POWER_W = 1500;
const TZ = 'Africa/Dar_es_Salaam';
const ONLINE_MS = 15 * 60 * 1000;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const overview = await this.overview();
    return overview.summary;
  }

  async overview() {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const offlineThreshold = new Date(Date.now() - 15 * 60 * 1000);
    const isOnline = (lastSeenAt: Date | null | undefined) =>
      Boolean(lastSeenAt && lastSeenAt >= offlineThreshold);

    const [
      units,
      openAlerts,
      recentAlerts,
      pendingCommands,
      recentCommands,
      commandStatusGroups,
      devices,
      buildings,
      telemetry24h,
    ] = await Promise.all([
      this.prisma.acUnit.findMany({
        include: {
          room: { include: { floor: { include: { building: true } } } },
          device: true,
          telemetry: { orderBy: { recordedAt: 'desc' }, take: 1 },
          alerts: {
            where: { resolved: false },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.alert.findMany({
        where: { resolved: false },
        include: {
          acUnit: {
            select: {
              id: true,
              name: true,
              assetTag: true,
              room: { select: { name: true, code: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.alert.findMany({
        where: { createdAt: { gte: since24h } },
        include: {
          acUnit: {
            select: {
              id: true,
              name: true,
              assetTag: true,
              room: { select: { name: true, code: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 12,
      }),
      this.prisma.command.count({
        where: { status: { in: ['PENDING', 'SENT'] } },
      }),
      this.prisma.command.findMany({
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: {
          acUnit: {
            select: {
              id: true,
              name: true,
              assetTag: true,
              room: { select: { name: true, code: true } },
            },
          },
          issuedBy: { select: { name: true, email: true } },
        },
      }),
      this.prisma.command.groupBy({
        by: ['status'],
        where: { createdAt: { gte: since24h } },
        _count: { _all: true },
      }),
      this.prisma.iotDevice.findMany({
        include: {
          acUnit: {
            select: {
              id: true,
              name: true,
              online: true,
              lastSeenAt: true,
              assetTag: true,
            },
          },
        },
        orderBy: { serial: 'asc' },
      }),
      this.prisma.building.findMany({
        include: {
          floors: {
            include: {
              rooms: {
                include: {
                  acUnits: {
                    include: {
                      telemetry: { orderBy: { recordedAt: 'desc' }, take: 1 },
                      alerts: { where: { resolved: false } },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.telemetry.findMany({
        where: { recordedAt: { gte: since24h } },
        orderBy: { recordedAt: 'asc' },
        select: {
          recordedAt: true,
          activePowerW: true,
          ambientTempC: true,
          humidityPct: true,
          energyKwh: true,
        },
      }),
    ]);

    const total = units.length;
    const online = units.filter((u) => isOnline(u.lastSeenAt)).length;
    const offline = total - online;
    const poweredOn = units.filter((u) => u.powerState === 'ON').length;
    const poweredOff = units.filter((u) => u.powerState === 'OFF').length;
    const unknownPower = units.filter((u) => u.powerState === 'UNKNOWN').length;

    const latestTelemetry = units
      .map((u) => u.telemetry[0])
      .filter(Boolean);

    const activePowerW = latestTelemetry.reduce(
      (sum, row) => sum + (row?.activePowerW ?? 0),
      0,
    );

    const temps = latestTelemetry
      .map((row) => row?.ambientTempC)
      .filter((v): v is number => typeof v === 'number');
    const humidities = latestTelemetry
      .map((row) => row?.humidityPct)
      .filter((v): v is number => typeof v === 'number');
    const setpoints = units
      .map((u) => u.setpointC)
      .filter((v): v is number => typeof v === 'number');

    const avg = (values: number[]) =>
      values.length === 0
        ? null
        : Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;

    const criticalAlerts = openAlerts.filter((a) =>
      ['critical', 'CRITICAL', 'error', 'ERROR', 'high', 'HIGH'].includes(a.severity),
    ).length;
    const warningAlerts = openAlerts.filter((a) =>
      ['warning', 'WARNING', 'medium', 'MEDIUM'].includes(a.severity),
    ).length;

    const commandStatusMap = Object.fromEntries(
      commandStatusGroups.map((row) => [row.status, row._count._all]),
    ) as Record<string, number>;

    const failedCommands24h = commandStatusMap.FAILED ?? 0;
    const ackedCommands24h = commandStatusMap.ACKED ?? 0;
    const commands24h = commandStatusGroups.reduce((sum, row) => sum + row._count._all, 0);

    const devicesOnline = devices.filter((d) => {
      return isOnline(d.lastSeenAt);
    }).length;

    const rooms = buildings.flatMap((b) => b.floors.flatMap((f) => f.rooms));

    const modeBreakdown = this.countBy(
      units.map((u) => u.mode),
    );

    const powerBreakdown = this.countBy(
      units.map((u) => u.powerState),
    );

    const buildingStats = buildings.map((building) => {
      const buildingUnits = building.floors.flatMap((f) =>
        f.rooms.flatMap((r) => r.acUnits),
      );
      const buildingPower = buildingUnits.reduce(
        (sum, unit) => sum + (unit.telemetry[0]?.activePowerW ?? 0),
        0,
      );
      const buildingAlerts = buildingUnits.reduce(
        (sum, unit) => sum + unit.alerts.length,
        0,
      );
      return {
        id: building.id,
        name: building.name,
        campus: building.campus,
        floors: building.floors.length,
        rooms: building.floors.reduce((sum, f) => sum + f.rooms.length, 0),
        unitCount: buildingUnits.length,
        onlineCount: buildingUnits.filter((u) => isOnline(u.lastSeenAt)).length,
        poweredOnCount: buildingUnits.filter((u) => u.powerState === 'ON').length,
        openAlerts: buildingAlerts,
        activePowerW: Math.round(buildingPower),
      };
    });

    const attentionUnits = units
      .map((unit) => {
        const latest = unit.telemetry[0];
        const reasons: string[] = [];
        const unitOnline = isOnline(unit.lastSeenAt);
        if (!unitOnline) reasons.push('Offline');
        if (unit.alerts.length > 0) reasons.push(`${unit.alerts.length} open alert(s)`);
        if (typeof latest?.ambientTempC === 'number' && latest.ambientTempC >= 28) {
          reasons.push(`High ambient ${latest.ambientTempC.toFixed(1)}°C`);
        }
        if (unit.powerState === 'UNKNOWN') reasons.push('Unknown power state');
        if (!unit.device) reasons.push('No IoT controller');

        if (reasons.length === 0) return null;

        return {
          id: unit.id,
          name: unit.name,
          assetTag: unit.assetTag,
          online: unitOnline,
          powerState: unit.powerState,
          mode: unit.mode,
          setpointC: unit.setpointC,
          ambientTempC: latest?.ambientTempC ?? null,
          activePowerW: latest?.activePowerW ?? null,
          lastSeenAt: unit.lastSeenAt,
          building: unit.room.floor.building.name,
          room: unit.room.name,
          roomCode: unit.room.code,
          openAlerts: unit.alerts.length,
          reasons,
          severity: !unitOnline || unit.alerts.some((a) =>
            ['critical', 'CRITICAL', 'error', 'ERROR', 'high', 'HIGH'].includes(a.severity),
          )
            ? 'critical'
            : 'warning',
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort((a, b) => {
        if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
        return b.openAlerts - a.openAlerts;
      })
      .slice(0, 10);

    const topConsumers = units
      .map((unit) => {
        const latest = unit.telemetry[0];
        return {
          id: unit.id,
          name: unit.name,
          assetTag: unit.assetTag,
          building: unit.room.floor.building.name,
          room: unit.room.name,
          powerState: unit.powerState,
          online: isOnline(unit.lastSeenAt),
          activePowerW: latest?.activePowerW ?? 0,
        };
      })
      .filter((u) => u.activePowerW > 0)
      .sort((a, b) => b.activePowerW - a.activePowerW)
      .slice(0, 8);

    const loadTrend = this.bucketTelemetry(telemetry24h);

    const energyKwh24h = this.estimateEnergyKwh(telemetry24h);

    const deviceHealth = devices.map((device) => ({
      id: device.id,
      serial: device.serial,
      firmware: device.firmware,
      rssi: device.rssi,
      ipAddress: device.ipAddress,
      lastSeenAt: device.lastSeenAt,
      online: isOnline(device.lastSeenAt),
      acUnit: device.acUnit
        ? {
            id: device.acUnit.id,
            name: device.acUnit.name,
            assetTag: device.acUnit.assetTag,
            online: isOnline(device.acUnit.lastSeenAt),
          }
        : null,
    }));

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        total,
        online,
        offline,
        poweredOn,
        poweredOff,
        unknownPower,
        openAlerts: openAlerts.length,
        criticalAlerts,
        warningAlerts,
        pendingCommands,
        failedCommands24h,
        ackedCommands24h,
        commands24h,
        activePowerW: Math.round(activePowerW),
        avgAmbientTempC: avg(temps),
        avgHumidityPct: avg(humidities),
        avgSetpointC: avg(setpoints),
        energyKwh24h,
        totalBuildings: buildings.length,
        totalRooms: rooms.length,
        totalDevices: devices.length,
        devicesOnline,
        onlinePct: total === 0 ? 0 : Math.round((online / total) * 1000) / 10,
      },
      modeBreakdown,
      powerBreakdown,
      buildingStats,
      attentionUnits,
      topConsumers,
      recentAlerts: openAlerts.slice(0, 10).map((alert) => ({
        id: alert.id,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        createdAt: alert.createdAt,
        acUnit: alert.acUnit,
      })),
      recentActivity: this.buildActivityFeed(recentAlerts, recentCommands),
      recentCommands: recentCommands.map((cmd) => ({
        id: cmd.id,
        type: cmd.type,
        status: cmd.status,
        payload: cmd.payload,
        result: cmd.result,
        createdAt: cmd.createdAt,
        sentAt: cmd.sentAt,
        ackedAt: cmd.ackedAt,
        acUnit: cmd.acUnit,
        issuedBy: cmd.issuedBy,
      })),
      loadTrend,
      deviceHealth,
    };
  }

  async energyReport(period: EnergyPeriod) {
    const { from, to } = periodBounds(period);
    const now = new Date();

    const [units, periodTelemetry] = await Promise.all([
      this.prisma.acUnit.findMany({
        include: {
          room: { include: { floor: { include: { building: true } } } },
          telemetry: { orderBy: { recordedAt: 'desc' }, take: 1 },
        },
        orderBy: [{ assetTag: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.telemetry.findMany({
        where: { recordedAt: { gte: from, lte: to } },
        select: {
          acUnitId: true,
          recordedAt: true,
          activePowerW: true,
          energyKwh: true,
        },
        orderBy: { recordedAt: 'asc' },
      }),
    ]);

    const samplesByUnit = new Map<string, typeof periodTelemetry>();
    for (const row of periodTelemetry) {
      const list = samplesByUnit.get(row.acUnitId) ?? [];
      list.push(row);
      samplesByUnit.set(row.acUnitId, list);
    }

    const baselines = await Promise.all(
      units.map((unit) =>
        this.prisma.telemetry.findFirst({
          where: {
            acUnitId: unit.id,
            recordedAt: { lt: from },
            energyKwh: { not: null },
          },
          orderBy: { recordedAt: 'desc' },
          select: { energyKwh: true },
        }),
      ),
    );

    const rows = units.map((unit, index) => {
      const energyKwh = round2(
        energyFromSamples(
          samplesByUnit.get(unit.id) ?? [],
          baselines[index]?.energyKwh ?? null,
          from,
          to,
          now,
        ),
      );
      const latest = unit.telemetry[0];
      const activePowerW = latest?.activePowerW ?? 0;
      return {
        id: unit.id,
        name: unit.name,
        assetTag: unit.assetTag,
        location: unit.room.name,
        building: unit.room.floor.building.name,
        energyKwh,
        costTzs: Math.round(energyKwh * TARIFF_TZS_PER_KWH),
        activePowerW,
        status: 'Normal' as 'Normal' | 'High',
      };
    });

    const withEnergy = rows.filter((row) => row.energyKwh > 0);
    const avgEnergy =
      withEnergy.length === 0
        ? 0
        : withEnergy.reduce((sum, row) => sum + row.energyKwh, 0) / withEnergy.length;

    for (const row of rows) {
      const highLoad = row.activePowerW >= HIGH_POWER_W;
      const highShare = avgEnergy > 0 && row.energyKwh >= avgEnergy * 1.5;
      if (highLoad || highShare) row.status = 'High';
    }

    const totalEnergyKwh = round2(rows.reduce((sum, row) => sum + row.energyKwh, 0));
    const totalCostTzs = rows.reduce((sum, row) => sum + row.costTzs, 0);
    const highest = [...rows].sort((a, b) => b.energyKwh - a.energyKwh)[0] ?? null;

    return {
      period,
      from: from.toISOString(),
      to: to.toISOString(),
      tariffTzsPerKwh: TARIFF_TZS_PER_KWH,
      totalEnergyKwh,
      totalCostTzs,
      highestUsage: highest
        ? {
            id: highest.id,
            name: highest.name,
            assetTag: highest.assetTag,
            energyKwh: highest.energyKwh,
          }
        : null,
      units: rows.map((row) => ({
        id: row.id,
        name: row.name,
        assetTag: row.assetTag,
        location: row.location,
        building: row.building,
        energyKwh: row.energyKwh,
        costTzs: row.costTzs,
        status: row.status,
      })),
    };
  }

  private countBy(values: string[]) {
    const map = new Map<string, number>();
    for (const value of values) {
      map.set(value, (map.get(value) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);
  }

  private bucketTelemetry(
    rows: Array<{
      recordedAt: Date;
      activePowerW: number | null;
      ambientTempC: number | null;
      humidityPct: number | null;
    }>,
  ) {
    const buckets = new Map<
      string,
      { powerSum: number; powerN: number; tempSum: number; tempN: number; humiditySum: number; humidityN: number }
    >();

    for (const row of rows) {
      const hour = new Date(row.recordedAt);
      hour.setMinutes(0, 0, 0);
      const key = hour.toISOString();
      const bucket = buckets.get(key) ?? {
        powerSum: 0,
        powerN: 0,
        tempSum: 0,
        tempN: 0,
        humiditySum: 0,
        humidityN: 0,
      };

      if (typeof row.activePowerW === 'number') {
        bucket.powerSum += row.activePowerW;
        bucket.powerN += 1;
      }
      if (typeof row.ambientTempC === 'number') {
        bucket.tempSum += row.ambientTempC;
        bucket.tempN += 1;
      }
      if (typeof row.humidityPct === 'number') {
        bucket.humiditySum += row.humidityPct;
        bucket.humidityN += 1;
      }
      buckets.set(key, bucket);
    }

    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([time, bucket]) => ({
        time,
        label: new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        powerW:
          bucket.powerN === 0
            ? 0
            : Math.round(bucket.powerSum / bucket.powerN),
        tempC:
          bucket.tempN === 0
            ? null
            : Math.round((bucket.tempSum / bucket.tempN) * 10) / 10,
        humidityPct:
          bucket.humidityN === 0
            ? null
            : Math.round((bucket.humiditySum / bucket.humidityN) * 10) / 10,
      }));
  }

  private estimateEnergyKwh(
    rows: Array<{ activePowerW: number | null; energyKwh: number | null }>,
  ) {
    const energySamples = rows
      .map((r) => r.energyKwh)
      .filter((v): v is number => typeof v === 'number');

    if (energySamples.length >= 2) {
      const min = Math.min(...energySamples);
      const max = Math.max(...energySamples);
      const delta = max - min;
      if (delta >= 0) return Math.round(delta * 100) / 100;
    }

    // Fallback: average power × 24h if only instantaneous samples exist
    const powers = rows
      .map((r) => r.activePowerW)
      .filter((v): v is number => typeof v === 'number');
    if (powers.length === 0) return 0;
    const avgPower =
      powers.reduce((a, b) => a + b, 0) / powers.length;
    return Math.round((avgPower / 1000) * 24 * 100) / 100;
  }

  private buildActivityFeed(
    alerts: Array<{
      id: string;
      severity: string;
      title: string;
      message: string;
      createdAt: Date;
      acUnit: { id: string; name: string; assetTag: string; room: { name: string; code: string } };
    }>,
    commands: Array<{
      id: string;
      type: string;
      status: string;
      createdAt: Date;
      acUnit: { id: string; name: string; assetTag: string; room: { name: string; code: string } };
      issuedBy: { name: string; email: string } | null;
    }>,
  ) {
    const alertItems = alerts.map((alert) => ({
      id: `alert-${alert.id}`,
      kind: 'alert' as const,
      title: alert.title,
      detail: alert.message,
      status: alert.severity,
      createdAt: alert.createdAt,
      unitName: alert.acUnit.name,
      room: alert.acUnit.room.name,
    }));

    const commandItems = commands.map((cmd) => ({
      id: `cmd-${cmd.id}`,
      kind: 'command' as const,
      title: `${cmd.type.replaceAll('_', ' ')} · ${cmd.status}`,
      detail: cmd.issuedBy
        ? `Issued by ${cmd.issuedBy.name}`
        : 'System / IoT workflow',
      status: cmd.status,
      createdAt: cmd.createdAt,
      unitName: cmd.acUnit.name,
      room: cmd.acUnit.room.name,
    }));

    return [...alertItems, ...commandItems]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 14);
  }
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function zonedYmd(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const num = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  return { y: num('year'), m: num('month'), d: num('day') };
}

/** Midnight in Africa/Dar_es_Salaam as a UTC Date (EAT is UTC+3, no DST). */
function eatMidnight(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m - 1, d, -3, 0, 0, 0));
}

function periodBounds(period: EnergyPeriod) {
  const now = new Date();
  const { y, m, d } = zonedYmd(now);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const mondayOffset = (weekday + 6) % 7;

  let from: Date;
  if (period === 'week') {
    from = eatMidnight(y, m, d - mondayOffset);
  } else if (period === 'month') {
    from = eatMidnight(y, m, 1);
  } else {
    from = eatMidnight(y, m, d);
  }

  return { from, to: now };
}

function energyFromSamples(
  samples: Array<{
    recordedAt: Date;
    activePowerW: number | null;
    energyKwh: number | null;
  }>,
  baselineKwh: number | null,
  from: Date,
  to: Date,
  now: Date,
) {
  const sorted = [...samples].sort(
    (a, b) => a.recordedAt.getTime() - b.recordedAt.getTime(),
  );

  const lastMeter = [...sorted]
    .reverse()
    .find((row) => typeof row.energyKwh === 'number')?.energyKwh;
  if (typeof lastMeter === 'number' && typeof baselineKwh === 'number') {
    const delta = lastMeter - baselineKwh;
    if (delta >= 0) return delta;
  }

  const meters = sorted
    .map((row) => row.energyKwh)
    .filter((value): value is number => typeof value === 'number');
  if (meters.length >= 2) {
    const delta = meters[meters.length - 1] - meters[0];
    if (delta >= 0) return delta;
  }

  let kwh = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const hours =
      (cur.recordedAt.getTime() - prev.recordedAt.getTime()) / 3_600_000;
    if (hours <= 0 || hours > 6) continue;
    const p1 = prev.activePowerW ?? 0;
    const p2 = cur.activePowerW ?? 0;
    kwh += ((p1 + p2) / 2 / 1000) * hours;
  }

  const last = sorted[sorted.length - 1];
  const end = Math.min(to.getTime(), now.getTime());
  if (last && typeof last.activePowerW === 'number' && end > last.recordedAt.getTime()) {
    const stale = now.getTime() - last.recordedAt.getTime() > ONLINE_MS;
    if (!stale) {
      kwh += (last.activePowerW / 1000) * ((end - last.recordedAt.getTime()) / 3_600_000);
    }
  } else if (sorted.length === 0) {
    return 0;
  } else if (sorted.length === 1 && typeof sorted[0].activePowerW === 'number') {
    const sample = sorted[0];
    const powerW = sample.activePowerW;
    const stale = now.getTime() - sample.recordedAt.getTime() > ONLINE_MS;
    if (!stale && typeof powerW === 'number') {
      const start = Math.max(from.getTime(), sample.recordedAt.getTime());
      kwh += (powerW / 1000) * ((end - start) / 3_600_000);
    }
  }

  return Math.max(0, kwh);
}
