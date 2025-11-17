/**
 * Fall Event Entity with Swagger Documentation
 * Complete API response schema
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FallEventResponse {
  @ApiProperty({
    description: 'Unique identifier for the fall event',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Device that detected the fall',
    type: 'object',
    example: {
      id: '660e8400-e29b-41d4-a716-446655440001',
      deviceType: 'FALL_SENSOR',
      location: 'Living Room',
    },
  })
  device: object;

  @ApiProperty({
    description: 'Timestamp when fall was detected',
    example: '2024-11-17T10:30:00.000Z',
  })
  detectedAt: Date;

  @ApiProperty({
    description: 'Severity level',
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    example: 'HIGH',
  })
  severity: string;

  @ApiProperty({
    description: 'ML model confidence score',
    example: 0.95,
    minimum: 0,
    maximum: 1,
  })
  confidence: number;

  @ApiProperty({
    description: 'Current status of the fall event',
    enum: ['PENDING', 'ACKNOWLEDGED', 'FALSE_ALARM', 'EMERGENCY', 'RESOLVED'],
    example: 'PENDING',
  })
  status: string;

  @ApiProperty({
    description: 'Whether this was marked as a false alarm',
    example: false,
  })
  falseAlarm: boolean;

  @ApiPropertyOptional({
    description: 'Reason for false alarm',
    example: 'Pet triggered sensor',
  })
  falseAlarmReason?: string;

  @ApiPropertyOptional({
    description: 'Location within home',
    example: 'Living Room',
  })
  location?: string;

  @ApiPropertyOptional({
    description: 'Time person remained on ground (seconds)',
    example: 45,
  })
  timeOnGround?: number;

  @ApiPropertyOptional({
    description: 'Estimated impact force in Newtons',
    example: 850.5,
  })
  impactForce?: number;

  @ApiPropertyOptional({
    description: 'Raw sensor data',
  })
  sensorData?: object;

  @ApiPropertyOptional({
    description: 'Who acknowledged the fall',
    type: 'object',
  })
  acknowledgedBy?: object;

  @ApiPropertyOptional({
    description: 'When the fall was acknowledged',
    example: '2024-11-17T10:35:00.000Z',
  })
  acknowledgedAt?: Date;

  @ApiPropertyOptional({
    description: 'Acknowledgment notes',
    example: 'Patient is fine, no injuries',
  })
  acknowledgmentNotes?: string;

  @ApiProperty({
    description: 'Whether emergency services were called',
    example: false,
  })
  emergencyServicesCalled: boolean;

  @ApiPropertyOptional({
    description: 'When emergency services were called',
    example: '2024-11-17T10:32:00.000Z',
  })
  emergencyCalledAt?: Date;

  @ApiPropertyOptional({
    description: 'Emergency call reference ID',
    example: '911-CALL-123456',
  })
  emergencyCallId?: string;

  @ApiProperty({
    description: 'Timestamp when event was created',
    example: '2024-11-17T10:30:05.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when event was last updated',
    example: '2024-11-17T10:35:10.000Z',
  })
  updatedAt: Date;
}

export class FallEventListResponse {
  @ApiProperty({
    description: 'Array of fall events',
    type: [FallEventResponse],
  })
  data: FallEventResponse[];

  @ApiProperty({
    description: 'Total number of fall events',
    example: 42,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Items per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 5,
  })
  totalPages: number;
}

export class FallStatsResponse {
  @ApiProperty({
    description: 'Total number of falls in period',
    example: 12,
  })
  totalFalls: number;

  @ApiProperty({
    description: 'Breakdown by severity',
    example: {
      LOW: 3,
      MEDIUM: 5,
      HIGH: 4,
    },
  })
  severityBreakdown: object;

  @ApiProperty({
    description: 'False alarm rate (percentage)',
    example: 16.7,
  })
  falseAlarmRate: number;

  @ApiProperty({
    description: 'Average response time in seconds',
    example: 127.5,
  })
  averageResponseTime: number;

  @ApiProperty({
    description: 'Number of emergency calls made',
    example: 2,
  })
  emergencyCalls: number;

  @ApiProperty({
    description: 'Falls by time of day',
    example: {
      morning: 3,
      afternoon: 5,
      evening: 2,
      night: 2,
    },
  })
  fallsByTimeOfDay: object;
}
