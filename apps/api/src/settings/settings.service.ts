import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const DEFAULT_TARIFF_TZS_PER_KWH = 750;
const SETTINGS_ID = 'default';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const row = await this.ensure();
    return this.toDto(row);
  }

  async getTariffTzsPerKwh() {
    const row = await this.ensure();
    return Number(row.tariffTzsPerKwh);
  }

  async update(tariffTzsPerKwh: number) {
    const rounded = Math.round(tariffTzsPerKwh * 100) / 100;
    const row = await this.prisma.workspaceSettings.upsert({
      where: { id: SETTINGS_ID },
      update: { tariffTzsPerKwh: new Prisma.Decimal(rounded) },
      create: {
        id: SETTINGS_ID,
        tariffTzsPerKwh: new Prisma.Decimal(rounded),
      },
    });
    return this.toDto(row);
  }

  private async ensure() {
    const existing = await this.prisma.workspaceSettings.findUnique({
      where: { id: SETTINGS_ID },
    });
    if (existing) return existing;
    return this.prisma.workspaceSettings.create({
      data: {
        id: SETTINGS_ID,
        tariffTzsPerKwh: DEFAULT_TARIFF_TZS_PER_KWH,
      },
    });
  }

  private toDto(row: { tariffTzsPerKwh: Prisma.Decimal; updatedAt: Date }) {
    return {
      tariffTzsPerKwh: Number(row.tariffTzsPerKwh),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
