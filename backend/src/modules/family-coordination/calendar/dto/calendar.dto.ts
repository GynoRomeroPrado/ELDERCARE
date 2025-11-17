/**
 * DTOs para Calendario Compartido
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNumber,
  IsDateString,
  IsObject,
  Min,
} from 'class-validator';
import {
  EventType,
  EventPriority,
  RecurrenceType,
} from '../entities/calendar-event.entity';

export class CreateEventDto {
  @ApiProperty({ example: 'Cita con cardiólogo' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Control rutinario de presión arterial' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: EventType, example: EventType.MEDICAL_APPOINTMENT })
  @IsEnum(EventType)
  eventType: EventType;

  @ApiPropertyOptional({ enum: EventPriority, example: EventPriority.HIGH })
  @IsOptional()
  @IsEnum(EventPriority)
  priority?: EventPriority = EventPriority.MEDIUM;

  @ApiProperty({ example: '2024-11-20T10:00:00.000Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2024-11-20T11:00:00.000Z' })
  @IsDateString()
  endTime: string;

  @ApiPropertyOptional({ example: 'Hospital Central, Piso 3, Consultorio 305' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  allDay?: boolean = false;

  @ApiPropertyOptional({ enum: RecurrenceType, example: RecurrenceType.NONE })
  @IsOptional()
  @IsEnum(RecurrenceType)
  recurrence?: RecurrenceType = RecurrenceType.NONE;

  @ApiPropertyOptional({
    example: { interval: 1, daysOfWeek: [1, 3, 5] },
  })
  @IsOptional()
  @IsObject()
  recurrenceRule?: any;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  createdBy: string;

  @ApiProperty({
    type: [String],
    example: [
      '550e8400-e29b-41d4-a716-446655440000',
      '660e8400-e29b-41d4-a716-446655440001',
    ],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  participantIds: string[];

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reminderMinutes?: number;

  @ApiPropertyOptional({
    example: { doctorName: 'Dr. Juan Pérez', phone: '+1234567890' },
  })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UpdateEventDto {
  @ApiPropertyOptional({ example: 'Cita con cardiólogo - Reprogramada' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Control rutinario actualizado' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: EventType })
  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @ApiPropertyOptional({ enum: EventPriority })
  @IsOptional()
  @IsEnum(EventPriority)
  priority?: EventPriority;

  @ApiPropertyOptional({ example: '2024-11-21T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({ example: '2024-11-21T11:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ example: 'Hospital Central, Piso 2' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @ApiPropertyOptional({ enum: RecurrenceType })
  @IsOptional()
  @IsEnum(RecurrenceType)
  recurrence?: RecurrenceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  recurrenceRule?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  reminderMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class EventQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  limit?: number = 50;

  @ApiPropertyOptional({ enum: EventType })
  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @ApiPropertyOptional({ enum: EventPriority })
  @IsOptional()
  @IsEnum(EventPriority)
  priority?: EventPriority;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  participantId?: string;

  @ApiPropertyOptional({ example: '2024-11-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-11-30T23:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCancelled?: boolean;
}

export class UpdateEventStatusDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCancelled?: boolean;
}
