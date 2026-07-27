import { BadRequestException, Injectable } from '@nestjs/common';
import { AcPowerState, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TelemetryService {
  constructor(private readonly prisma: PrismaService) {}

  async history(
    acUnitId: string,
    query: { page: number; pageSize: number; from?: string; to?: string; powerState?: string },
  ) {
    const page = Number.isFinite(query.page) ? Math.max(1, Math.floor(query.page)) : 1;
    const pageSize = Number.isFinite(query.pageSize)
      ? Math.min(100, Math.max(1, Math.floor(query.pageSize)))
      : 10;
    const where: Prisma.TelemetryWhereInput = { acUnitId };

    if (query.powerState) {
      if (!Object.values(AcPowerState).includes(query.powerState as AcPowerState)) {
        throw new BadRequestException('powerState must be ON, OFF, or UNKNOWN');
      }
      where.powerState = query.powerState as AcPowerState;
    }

    if (query.from || query.to) {
      const from = query.from ? new Date(query.from) : undefined;
      const to = query.to ? new Date(query.to) : undefined;
      if ((from && Number.isNaN(from.valueOf())) || (to && Number.isNaN(to.valueOf()))) {
        throw new BadRequestException('from and to must be valid ISO dates');
      }
      if (from && to && from > to) {
        throw new BadRequestException('from must be before to');
      }
      where.recordedAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.telemetry.findMany({
        where,
        orderBy: { recordedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.telemetry.count({ where }),
    ]);

    return { items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
  }
}
