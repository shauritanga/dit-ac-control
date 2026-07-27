import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CommandDto } from './dto';

@Injectable()
export class CommandsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway
  ) {}

  async issue(acUnitId: string, issuedById: string | null, dto: CommandDto) {
    const command = await this.prisma.command.create({
      data: {
        acUnitId,
        issuedById: issuedById ?? undefined,
        type: dto.type,
        payload: dto.payload as Prisma.InputJsonValue
      }
    });
    this.realtime.emitCommand(command);
    return command;
  }

  async nextForDevice(acUnitId: string) {
    const command = await this.prisma.command.findFirst({
      where: { acUnitId, status: 'PENDING' },
      orderBy: { createdAt: 'asc' }
    });
    if (!command) return null;
    const sent = await this.prisma.command.update({
      where: { id: command.id },
      data: { status: 'SENT', sentAt: new Date() }
    });
    this.realtime.emitCommand(sent);
    return sent;
  }

  async acknowledge(id: string, success: boolean, result?: string) {
    const command = await this.prisma.command.update({
      where: { id },
      data: {
        status: success ? 'ACKED' : 'FAILED',
        result,
        ackedAt: new Date()
      }
    });
    this.realtime.emitCommand(command);
    return command;
  }
}
