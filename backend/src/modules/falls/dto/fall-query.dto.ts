/**
 * Fall Query DTO
 * Query parameters for filtering fall events
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum FallSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum FallStatus {
  PENDING = 'PENDING',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  FALSE_ALARM = 'FALSE_ALARM',
  EMERGENCY = 'EMERGENCY',
  RESOLVED = 'RESOLVED',
}

export class FallQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by severity level',
    enum: FallSeverity,
    example: FallSeverity.HIGH,
  })
  @IsOptional()
  @IsEnum(FallSeverity)
  severity?: FallSeverity;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: FallStatus,
    example: FallStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(FallStatus)
  status?: FallStatus;

  @ApiPropertyOptional({
    description: 'Filter events after this date',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter events before this date',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
