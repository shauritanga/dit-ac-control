import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';

export class UpdateSettingsDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100000)
  tariffTzsPerKwh!: number;
}
