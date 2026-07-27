import { AcMode, AcPowerState } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/**
 * Device field names match the firmware payload exactly.
 * Example:
 * {
 *   "device_id": "RAFIC-DEMO-NODE-001",
 *   "ac_id": "DIT-AC-001",
 *   "timestamp": "2026-06-19T22:30:00Z",
 *   "voltage_v": 5.05,
 *   "current_a": 0.95,
 *   "power_w": 4.79,
 *   "energy_kwh": 0.0008,
 *   "temperature_c": 27.5,
 *   "humidity_percent": 62,
 *   "ac_state": "ON",
 *   "relay_state": "ON",
 *   "device_status": "ONLINE",
 *   "wifi_rssi": -58
 * }
 */
export class DeviceCheckinDto {
  /** Controller / node id (serial) */
  @IsOptional()
  @IsString()
  device_id?: string;

  /** AC asset tag, e.g. DIT-AC-001 or DIT-AC-002 */
  @IsOptional()
  @IsString()
  ac_id?: string;

  @IsOptional()
  @IsString()
  firmware?: string;

  @IsOptional()
  @IsString()
  ip_address?: string;

  @IsOptional()
  @IsInt()
  wifi_rssi?: number;

  @IsOptional()
  @IsString()
  device_status?: string;
}

export class TelemetryIngestDto extends DeviceCheckinDto {
  /** ISO-8601 time from the device (optional; server time used if missing) */
  @IsOptional()
  @IsISO8601()
  timestamp?: string;

  @IsOptional()
  @IsNumber()
  voltage_v?: number;

  @IsOptional()
  @IsNumber()
  current_a?: number;

  @IsOptional()
  @IsNumber()
  power_w?: number;

  @IsOptional()
  @IsNumber()
  energy_kwh?: number;

  @IsOptional()
  @IsNumber()
  temperature_c?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  humidity_percent?: number;

  /** ON | OFF | UNKNOWN */
  @IsEnum(AcPowerState)
  ac_state!: AcPowerState;

  /** ON | OFF — optional; not stored separately (dashboard uses ac_state) */
  @IsOptional()
  @IsString()
  relay_state?: string;

  /** Optional AC control fields if the board reports them */
  @IsOptional()
  @IsEnum(AcMode)
  mode?: AcMode;

  @IsOptional()
  @IsInt()
  @Min(16)
  @Max(30)
  setpoint_c?: number;

  @IsOptional()
  @IsString()
  fan_speed?: string;

  @IsOptional()
  @IsBoolean()
  swing_enabled?: boolean;

  @IsOptional()
  @IsNumber()
  coil_temp_c?: number;

  @IsOptional()
  @IsString()
  error_code?: string;
}

export class CommandAckDto {
  @IsBoolean()
  success!: boolean;

  @IsOptional()
  @IsString()
  result?: string;
}
