import { IsOptional, IsString, MinLength } from 'class-validator';

export class ProvisionIotDeviceDto {
  /** Unique controller serial, e.g. ESP32-DIT-LAB01-A */
  @IsString()
  @MinLength(3)
  serial!: string;

  /** Existing AC unit id to attach this controller to */
  @IsString()
  acUnitId!: string;

  @IsOptional()
  @IsString()
  firmware?: string;

  /**
   * Optional plain device token. If omitted, the API generates a secure token.
   * The plain token is returned only once in the provision response.
   */
  @IsOptional()
  @IsString()
  @MinLength(16)
  token?: string;
}

export class RotateIotDeviceTokenDto {
  @IsOptional()
  @IsString()
  @MinLength(16)
  token?: string;
}
