/**
 * DTOs para Sistema de Alertas Personalizables
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export enum AlertType {
  LOW_BATTERY = 'LOW_BATTERY',
  DEVICE_OFFLINE = 'DEVICE_OFFLINE',
  MEDICATION_MISSED = 'MEDICATION_MISSED',
  FALL_DETECTED = 'FALL_DETECTED',
  VITAL_SIGN_ABNORMAL = 'VITAL_SIGN_ABNORMAL',
  CUSTOM = 'CUSTOM',
}

export enum AlertPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AlertChannel {
  PUSH = 'PUSH',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  IN_APP = 'IN_APP',
}

export enum AlertStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TRIGGERED = 'TRIGGERED',
  RESOLVED = 'RESOLVED',
}

export class CreateAlertConfigDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: AlertType, example: AlertType.LOW_BATTERY })
  @IsEnum(AlertType)
  alertType: AlertType;

  @ApiProperty({ example: 'Batería baja en dispositivo' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Notificar cuando la batería esté por debajo del 20%' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: AlertPriority, example: AlertPriority.MEDIUM })
  @IsEnum(AlertPriority)
  priority: AlertPriority;

  @ApiProperty({
    type: [String],
    enum: AlertChannel,
    example: [AlertChannel.PUSH, AlertChannel.EMAIL],
  })
  @IsArray()
  @IsEnum(AlertChannel, { each: true })
  channels: AlertChannel[];

  @ApiPropertyOptional({
    example: {
      batteryThreshold: 20,
      deviceId: '550e8400-e29b-41d4-a716-446655440000',
    },
  })
  @IsOptional()
  @IsObject()
  conditions?: any;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;
}

export class UpdateAlertConfigDto {
  @ApiPropertyOptional({ example: 'Batería crítica' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Alerta cuando batería < 10%' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: AlertPriority })
  @IsOptional()
  @IsEnum(AlertPriority)
  priority?: AlertPriority;

  @ApiPropertyOptional({
    type: [String],
    enum: AlertChannel,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(AlertChannel, { each: true })
  channels?: AlertChannel[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  conditions?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class AlertQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ enum: AlertType })
  @IsOptional()
  @IsEnum(AlertType)
  alertType?: AlertType;

  @ApiPropertyOptional({ enum: AlertPriority })
  @IsOptional()
  @IsEnum(AlertPriority)
  priority?: AlertPriority;

  @ApiPropertyOptional({ enum: AlertStatus })
  @IsOptional()
  @IsEnum(AlertStatus)
  status?: AlertStatus;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class TriggerAlertDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  alertConfigId: string;

  @ApiProperty({ example: 'Batería del dispositivo en 15%' })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    example: {
      deviceId: '550e8400-e29b-41d4-a716-446655440000',
      batteryLevel: 15,
    },
  })
  @IsOptional()
  @IsObject()
  data?: any;
}

export class ResolveAlertDto {
  @ApiPropertyOptional({ example: 'Batería recargada' })
  @IsOptional()
  @IsString()
  resolvedReason?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  resolvedBy?: string;
}
