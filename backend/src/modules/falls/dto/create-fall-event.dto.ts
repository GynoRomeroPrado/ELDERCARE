/**
 * Create Fall Event DTO
 * Data Transfer Object for creating fall detection events
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsDateString, IsEnum, IsNumber, IsObject, IsOptional, Min, Max, IsString } from 'class-validator';

export enum FallSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export class CreateFallEventDto {
  @ApiProperty({
    description: 'UUID of the fall sensor device',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  deviceId: string;

  @ApiProperty({
    description: 'Timestamp when fall was detected',
    example: '2024-11-17T10:30:00.000Z',
  })
  @IsDateString()
  detectedAt: string;

  @ApiProperty({
    description: 'Severity level of the fall',
    enum: FallSeverity,
    example: FallSeverity.HIGH,
  })
  @IsEnum(FallSeverity)
  severity: FallSeverity;

  @ApiProperty({
    description: 'ML model confidence score (0.0 to 1.0)',
    example: 0.95,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiPropertyOptional({
    description: 'Location within home where fall occurred',
    example: 'Living Room',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'Estimated time person remained on ground (seconds)',
    example: 45,
  })
  @IsOptional()
  @IsNumber()
  timeOnGround?: number;

  @ApiPropertyOptional({
    description: 'Estimated impact force in Newtons',
    example: 850.5,
  })
  @IsOptional()
  @IsNumber()
  impactForce?: number;

  @ApiPropertyOptional({
    description: 'Raw sensor data from radar, accelerometer, etc.',
    example: {
      radarPointCloud: {
        points: 150,
        avgVelocity: 2.5,
        impactForce: 8.2,
      },
      location: {
        x: 3.5,
        y: 2.1,
        z: 0.0,
      },
    },
  })
  @IsOptional()
  @IsObject()
  sensorData?: Record<string, any>;
}
