import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AcMode, AcPowerState } from '@prisma/client';
import { hash } from 'bcryptjs';
import { randomBytes } from 'crypto';
import { CommandsService } from '../commands/commands.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CommandAckDto, DeviceCheckinDto, TelemetryIngestDto } from './iot.dto';

/**
 * Prototype IoT service — no device authentication.
 * Accepts firmware field names (device_id, ac_id, power_w, …).
 */
@Injectable()
export class IotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commands: CommandsService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async checkin(dto: DeviceCheckinDto) {
    const { acUnitId, deviceId } = await this.resolveAcUnit(dto);
    const rssi = dto.wifi_rssi;

    if (deviceId) {
      await this.prisma.iotDevice.update({
        where: { id: deviceId },
        data: {
          firmware: dto.firmware,
          ipAddress: dto.ip_address,
          rssi,
          lastSeenAt: new Date(),
        },
      });
    }

    const online = this.isOnlineStatus(dto.device_status) ?? true;

    await this.prisma.acUnit.update({
      where: { id: acUnitId },
      data: { online, lastSeenAt: new Date() },
    });

    const command = await this.commands.nextForDevice(acUnitId);
    return {
      serverTime: new Date().toISOString(),
      acUnitId,
      command,
    };
  }

  async ingestTelemetry(dto: TelemetryIngestDto) {
    const { acUnitId, deviceId } = await this.resolveAcUnit(dto);

    const powerState = dto.ac_state;
    const mode: AcMode = dto.mode ?? 'AUTO';
    const activePowerW = dto.power_w;
    const voltage = dto.voltage_v;
    const current = dto.current_a;
    const energyKwh = dto.energy_kwh;
    const ambientTempC = dto.temperature_c;
    const humidityPct = dto.humidity_percent;
    const coilTempC = dto.coil_temp_c;
    const setpointC = dto.setpoint_c;
    const fanSpeed = dto.fan_speed;
    const swingEnabled = dto.swing_enabled;
    const errorCode = dto.error_code;
    const rssi = dto.wifi_rssi;
    const recordedAt = dto.timestamp ? new Date(dto.timestamp) : new Date();
    const online = this.isOnlineStatus(dto.device_status) ?? true;

    if (deviceId) {
      await this.prisma.iotDevice.update({
        where: { id: deviceId },
        data: {
          firmware: dto.firmware,
          ipAddress: dto.ip_address,
          rssi,
          lastSeenAt: new Date(),
        },
      });
    }

    const telemetry = await this.prisma.telemetry.create({
      data: {
        acUnitId,
        powerState,
        mode,
        ambientTempC,
        coilTempC,
        humidityPct,
        setpointC,
        fanSpeed,
        swingEnabled,
        voltage,
        current,
        activePowerW,
        energyKwh,
        errorCode,
        rssi,
        recordedAt: Number.isNaN(recordedAt.getTime()) ? new Date() : recordedAt,
      },
    });

    const acUnit = await this.prisma.acUnit.update({
      where: { id: acUnitId },
      data: {
        powerState,
        mode,
        setpointC: setpointC ?? undefined,
        fanSpeed: fanSpeed ?? undefined,
        swingEnabled: swingEnabled ?? undefined,
        online,
        lastSeenAt: new Date(),
      },
      include: { room: true },
    });

    if (errorCode) {
      const alert = await this.prisma.alert.create({
        data: {
          acUnitId,
          severity: 'HIGH',
          title: `AC fault ${errorCode}`,
          message: `${acUnit.name} reported fault code ${errorCode}.`,
        },
      });
      this.realtime.emitAlert(alert);
    }

    // Power band alerts (env: POWER_ALERT_MIN_W / POWER_ALERT_MAX_W)
    if (typeof activePowerW === 'number' && Number.isFinite(activePowerW)) {
      const minW = Number(process.env.POWER_ALERT_MIN_W ?? 200);
      const maxW = Number(process.env.POWER_ALERT_MAX_W ?? 1500);
      const watts = activePowerW;

      if (powerState === 'ON' && watts >= 0 && watts < minW) {
        const existing = await this.prisma.alert.findFirst({
          where: {
            acUnitId,
            resolved: false,
            title: { contains: 'malfunction' },
          },
        });
        if (!existing) {
          const alert = await this.prisma.alert.create({
            data: {
              acUnitId,
              severity: 'warning',
              title: 'Possible malfunction',
              message: `${acUnit.name} is ON but only ${Math.round(watts)} W (minimum expected ${minW} W). Unit may not be working correctly.`,
            },
          });
          this.realtime.emitAlert(alert);
        }
      }

      if (watts >= maxW) {
        const existing = await this.prisma.alert.findFirst({
          where: {
            acUnitId,
            resolved: false,
            title: { startsWith: 'High power' },
          },
        });
        if (!existing) {
          const alert = await this.prisma.alert.create({
            data: {
              acUnitId,
              severity: 'warning',
              title: 'High power draw',
              message: `${acUnit.name} reported ${Math.round(watts)} W (maximum ${maxW} W).`,
            },
          });
          this.realtime.emitAlert(alert);
        }
      }
    }

    this.realtime.emitTelemetry({ acUnit, telemetry });
    return {
      accepted: true,
      telemetryId: telemetry.id,
      acUnitId,
      ac_id: acUnit.assetTag,
      device_id: dto.device_id ?? null,
      name: acUnit.name,
    };
  }

  async acknowledge(commandId: string, dto: CommandAckDto) {
    return this.commands.acknowledge(commandId, dto.success, dto.result);
  }

  private isOnlineStatus(status?: string): boolean | null {
    if (!status) return null;
    const s = status.trim().toUpperCase();
    if (s === 'ONLINE' || s === 'ON') return true;
    if (s === 'OFFLINE' || s === 'OFF') return false;
    return null;
  }

  /**
   * Resolve AC unit from ac_id (asset tag) and/or device_id (serial).
   */
  private async resolveAcUnit(dto: {
    ac_id?: string;
    device_id?: string;
    firmware?: string;
  }) {
    const assetTag = dto.ac_id?.trim();
    const serial = dto.device_id?.trim();

    if (!assetTag && !serial) {
      throw new BadRequestException(
        'Provide ac_id (e.g. DIT-AC-001) and/or device_id so we know which unit this is.',
      );
    }

    if (assetTag) {
      const unit = await this.prisma.acUnit.findUnique({
        where: { assetTag },
        include: { device: true },
      });
      if (!unit) {
        throw new NotFoundException(
          `Unknown ac_id "${assetTag}". Seeded units are DIT-AC-001 and DIT-AC-002.`,
        );
      }
      const deviceId = await this.ensureDevice(
        unit.id,
        serial ?? `OPEN-${assetTag}`,
        dto.firmware,
      );
      return { acUnitId: unit.id, deviceId };
    }

    if (serial) {
      const device = await this.prisma.iotDevice.findUnique({ where: { serial } });
      if (device) {
        return { acUnitId: device.acUnitId, deviceId: device.id };
      }

      const unitByTag = await this.prisma.acUnit.findUnique({
        where: { assetTag: serial },
      });
      if (unitByTag) {
        const deviceId = await this.ensureDevice(unitByTag.id, serial, dto.firmware);
        return { acUnitId: unitByTag.id, deviceId };
      }

      const match = serial.match(/DIT-AC-\d+/i);
      if (match) {
        const tag = match[0].toUpperCase();
        const unit = await this.prisma.acUnit.findUnique({ where: { assetTag: tag } });
        if (unit) {
          const deviceId = await this.ensureDevice(unit.id, serial, dto.firmware);
          return { acUnitId: unit.id, deviceId };
        }
      }
    }

    throw new NotFoundException(
      'Could not match device. Use ac_id "DIT-AC-001" or "DIT-AC-002" (or device_id containing that tag).',
    );
  }

  private async ensureDevice(acUnitId: string, serial: string, firmware?: string) {
    const existingBySerial = await this.prisma.iotDevice.findUnique({ where: { serial } });
    if (existingBySerial) {
      if (existingBySerial.acUnitId !== acUnitId) {
        throw new BadRequestException(
          `device_id "${serial}" is already linked to another AC unit.`,
        );
      }
      return existingBySerial.id;
    }

    const existingOnUnit = await this.prisma.iotDevice.findUnique({ where: { acUnitId } });
    if (existingOnUnit) {
      return existingOnUnit.id;
    }

    const tokenHash = await hash(randomBytes(16).toString('hex'), 8);
    const created = await this.prisma.iotDevice.create({
      data: {
        serial,
        tokenHash,
        firmware,
        acUnitId,
        lastSeenAt: new Date(),
      },
    });
    return created.id;
  }
}
