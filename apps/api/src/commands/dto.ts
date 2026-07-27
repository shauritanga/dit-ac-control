import { CommandType } from '@prisma/client';
import { IsEnum, IsObject } from 'class-validator';

export class CommandDto {
  @IsEnum(CommandType)
  type!: CommandType;

  @IsObject()
  payload!: Record<string, unknown>;
}
