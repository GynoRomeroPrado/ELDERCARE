/**
 * DTOs para Dispositivos IoT
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsEnum, IsOptional, IsNumber, IsObject, IsBoolean, Min, Max } from 'class-validator';

export enum DeviceType {
  PILL_DISPENSER = 'PILL_DISPENSER',
  FALL_SENSOR = 'FALL_SENSOR',
  ENVIRONMENTAL_SENSOR = 'ENVIRONMENTAL_SENSOR',
  EMERGENCY_BUTTON = 'EMERGENCY_BUTTON',
}

export enum DeviceStatus {
  PROVISIONING = 'PROVISIONING',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  DECOMMISSIONED = 'DECOMMISSIONED',
}

export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  OFFLINE = 'OFFLINE',
}

export class CreateDeviceDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  ownerId: string;

  @ApiProperty({ enum: DeviceType, example: DeviceType.PILL_DISPENSER })
  @IsEnum(DeviceType)
  deviceType: DeviceType;

  @ApiProperty({ example: 'PILL-2024-001' })
  @IsString()
  serialNumber: string;

  @ApiPropertyOptional({ example: 'Dispensador de Cocina' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '1.2.3' })
  @IsOptional()
  @IsString()
  firmwareVersion?: string;

  @ApiPropertyOptional({ example: 'v1.0' })
  @IsOptional()
  @IsString()
  hardwareVersion?: string;

  @ApiPropertyOptional({ example: 'Encimera de cocina' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    example: { latitude: 37.7749, longitude: -122.4194 },
  })
  @IsOptional()
  @IsObject()
  coordinates?: any;

  @ApiPropertyOptional({
    example: { compartments: 28, model: 'ELDERCARE-PD-v1' },
  })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UpdateDeviceDto {
  @ApiPropertyOptional({ example: 'Dispensador Principal' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: DeviceStatus })
  @IsOptional()
  @IsEnum(DeviceStatus)
  status?: DeviceStatus;

  @ApiPropertyOptional({ example: 'Sala de estar' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  coordinates?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class DeviceTelemetryDto {
  @ApiProperty({ example: '2024-11-17T10:30:00.000Z' })
  @IsString()
  timestamp: string;

  @ApiPropertyOptional({ example: 85 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  batteryLevel?: number;

  @ApiPropertyOptional({ example: -45 })
  @IsOptional()
  @IsNumber()
  signalStrength?: number;

  @ApiPropertyOptional({ example: 22.5 })
  @IsOptional()
  @IsNumber()
  temperature?: number;

  @ApiPropertyOptional({ example: 45 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  humidity?: number;

  @ApiPropertyOptional({
    example: { uptime: 86400, freeMemory: 45000 },
  })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class DeviceQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ enum: DeviceType })
  @IsOptional()
  @IsEnum(DeviceType)
  deviceType?: DeviceType;

  @ApiPropertyOptional({ enum: DeviceStatus })
  @IsOptional()
  @IsEnum(DeviceStatus)
  status?: DeviceStatus;

  @ApiPropertyOptional({ enum: HealthStatus })
  @IsOptional()
  @IsEnum(HealthStatus)
  healthStatus?: HealthStatus;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;
}

export class FirmwareUpdateDto {
  @ApiProperty({ example: '1.3.0' })
  @IsString()
  version: string;

  @ApiProperty({ example: 'https://cdn.eldercare.com/firmware/pill-dispenser-v1.3.0.bin' })
  @IsString()
  downloadUrl: string;

  @ApiPropertyOptional({ example: 'Bug fixes and performance improvements' })
  @IsOptional()
  @IsString()
  releaseNotes?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  forceUpdate?: boolean;
}
