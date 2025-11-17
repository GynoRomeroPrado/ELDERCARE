/**
 * DTOs para Analytics y Reportes
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';

export enum ReportType {
  MEDICATION_ADHERENCE = 'MEDICATION_ADHERENCE',
  FALLS = 'FALLS',
  DEVICE_ACTIVITY = 'DEVICE_ACTIVITY',
  GENERAL_DASHBOARD = 'GENERAL_DASHBOARD',
}

export enum ReportPeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
  CUSTOM = 'CUSTOM',
}

export enum ExportFormat {
  PDF = 'PDF',
  CSV = 'CSV',
  JSON = 'JSON',
}

export class ReportQueryDto {
  @ApiPropertyOptional({ enum: ReportPeriod, example: ReportPeriod.MONTHLY })
  @IsOptional()
  @IsEnum(ReportPeriod)
  period?: ReportPeriod = ReportPeriod.MONTHLY;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  deviceId?: string;
}

export class ExportReportDto {
  @ApiProperty({ enum: ReportType, example: ReportType.MEDICATION_ADHERENCE })
  @IsEnum(ReportType)
  reportType: ReportType;

  @ApiProperty({ enum: ExportFormat, example: ExportFormat.PDF })
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @ApiPropertyOptional({ enum: ReportPeriod, example: ReportPeriod.MONTHLY })
  @IsOptional()
  @IsEnum(ReportPeriod)
  period?: ReportPeriod;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class TimeSeriesQueryDto {
  @ApiProperty({ example: 'battery_level' })
  @IsString()
  metric: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31T23:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: '1h' })
  @IsOptional()
  @IsString()
  interval?: string = '1h';
}
