import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ProvisionIotDeviceDto, RotateIotDeviceTokenDto } from './dto';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filters: { q?: string; status?: string }) {
    const where: Prisma.AcUnitWhereInput = {};
    if (filters.q) {
      where.OR = [
        { name: { contains: filters.q, mode: 'insensitive' } },
        { assetTag: { contains: filters.q, mode: 'insensitive' } },
        { room: { name: { contains: filters.q, mode: 'insensitive' } } }
      ];
    }
    if (filters.status === 'on') where.powerState = 'ON';
    if (filters.status === 'off') where.powerState = 'OFF';

    const offlineThreshold = new Date(Date.now() - 15 * 60 * 1000);
    const units = await this.prisma.acUnit.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        room: { include: { floor: { include: { building: true } } } },
        telemetry: { orderBy: { recordedAt: 'desc' }, take: 1 },
        alerts: { where: { resolved: false }, orderBy: { createdAt: 'desc' }, take: 3 }
      }
    });

    const withLiveStatus = units.map((unit) => ({
      ...unit,
      online: Boolean(unit.lastSeenAt && unit.lastSeenAt >= offlineThreshold),
    }));

    if (filters.status === 'online') return withLiveStatus.filter((unit) => unit.online);
    if (filters.status === 'offline') return withLiveStatus.filter((unit) => !unit.online);
    return withLiveStatus;
  }

  async detail(id: string) {
    const unit = await this.prisma.acUnit.findUniqueOrThrow({
      where: { id },
      include: {
        room: { include: { floor: { include: { building: true } } } },
        device: true,
        telemetry: { orderBy: { recordedAt: 'desc' }, take: 60 },
        commands: { orderBy: { createdAt: 'desc' }, take: 20 },
        alerts: { orderBy: { createdAt: 'desc' }, take: 20 }
      }
    });
    const offlineThreshold = new Date(Date.now() - 15 * 60 * 1000);
    return {
      ...unit,
      online: Boolean(unit.lastSeenAt && unit.lastSeenAt >= offlineThreshold),
    };
  }

  async listIotDevices() {
    const offlineThreshold = new Date(Date.now() - 15 * 60 * 1000);
    const devices = await this.prisma.iotDevice.findMany({
      orderBy: { serial: 'asc' },
      select: {
        id: true,
        serial: true,
        firmware: true,
        ipAddress: true,
        rssi: true,
        createdAt: true,
        lastSeenAt: true,
        acUnit: {
          select: {
            id: true,
            name: true,
            assetTag: true,
            online: true,
            lastSeenAt: true,
            room: {
              select: {
                name: true,
                code: true,
                floor: {
                  select: {
                    name: true,
                    building: { select: { name: true, campus: true } }
                  }
                }
              }
            }
          }
        }
      }
    });

    return devices.map((device) => ({
      ...device,
      online: Boolean(device.lastSeenAt && device.lastSeenAt >= offlineThreshold),
      acUnit: device.acUnit
        ? {
            ...device.acUnit,
            online: Boolean(
              device.acUnit.lastSeenAt &&
                device.acUnit.lastSeenAt >= offlineThreshold,
            ),
          }
        : null,
    }));
  }

  /**
   * Registers an ESP32 controller against an AC unit and returns a one-time plain token.
   * Store the plain token only in the firmware / secure vault — it is not readable again.
   */
  async provisionIotDevice(dto: ProvisionIotDeviceDto) {
    const acUnit = await this.prisma.acUnit.findUnique({
      where: { id: dto.acUnitId },
      include: {
        device: true,
        room: { include: { floor: { include: { building: true } } } }
      }
    });
    if (!acUnit) {
      throw new NotFoundException(`AC unit not found: ${dto.acUnitId}`);
    }
    if (acUnit.device) {
      throw new ConflictException(
        `AC unit ${acUnit.assetTag} already has controller ${acUnit.device.serial}. Rotate token or remove it first.`
      );
    }

    const existingSerial = await this.prisma.iotDevice.findUnique({
      where: { serial: dto.serial }
    });
    if (existingSerial) {
      throw new ConflictException(`Serial already registered: ${dto.serial}`);
    }

    const plainToken = dto.token?.trim() || this.generateDeviceToken();
    if (plainToken.length < 16) {
      throw new BadRequestException('Device token must be at least 16 characters');
    }

    const tokenHash = await hash(plainToken, 10);
    const device = await this.prisma.iotDevice.create({
      data: {
        serial: dto.serial.trim(),
        tokenHash,
        firmware: dto.firmware,
        acUnitId: acUnit.id
      },
      select: {
        id: true,
        serial: true,
        firmware: true,
        createdAt: true,
        acUnitId: true
      }
    });

    return {
      device,
      credentials: {
        serial: device.serial,
        /** Plain device token — show once, then store only in firmware. */
        token: plainToken,
        header: {
          'x-device-token': plainToken,
          'Content-Type': 'application/json'
        }
      },
      acUnit: {
        id: acUnit.id,
        name: acUnit.name,
        assetTag: acUnit.assetTag,
        room: acUnit.room.name,
        building: acUnit.room.floor.building.name
      },
      warning:
        'Save the device token now. It is stored hashed and cannot be retrieved later. Use rotate-token if lost.'
    };
  }

  async rotateIotDeviceToken(deviceId: string, dto: RotateIotDeviceTokenDto = {}) {
    const existing = await this.prisma.iotDevice.findUnique({
      where: { id: deviceId },
      include: {
        acUnit: {
          select: { id: true, name: true, assetTag: true }
        }
      }
    });
    if (!existing) {
      throw new NotFoundException(`IoT device not found: ${deviceId}`);
    }

    const plainToken = dto.token?.trim() || this.generateDeviceToken();
    if (plainToken.length < 16) {
      throw new BadRequestException('Device token must be at least 16 characters');
    }

    const tokenHash = await hash(plainToken, 10);
    const device = await this.prisma.iotDevice.update({
      where: { id: deviceId },
      data: { tokenHash },
      select: { id: true, serial: true, firmware: true, acUnitId: true }
    });

    return {
      device,
      credentials: {
        serial: device.serial,
        token: plainToken,
        header: {
          'x-device-token': plainToken,
          'Content-Type': 'application/json'
        }
      },
      acUnit: existing.acUnit,
      warning:
        'Previous token is invalid. Update firmware config with the new token immediately.'
    };
  }

  private generateDeviceToken() {
    // 32 bytes → 64 hex chars, high entropy for device auth
    return randomBytes(32).toString('hex');
  }
}
