/**
 * DTOs para Chat Familiar
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsArray,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { RoomType, MessageType } from '../entities/chat-room.entity';

export class CreateRoomDto {
  @ApiProperty({ example: 'Familia González' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ enum: RoomType, example: RoomType.FAMILY })
  @IsOptional()
  @IsEnum(RoomType)
  type?: RoomType = RoomType.FAMILY;

  @ApiPropertyOptional({ example: 'Chat para coordinar cuidados de mamá' })
  @IsOptional()
  @IsString()
  description?: string;

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

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  createdBy: string;
}

export class UpdateRoomDto {
  @ApiPropertyOptional({ example: 'Familia González - Actualizado' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Chat familiar actualizado' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://cdn.eldercare.com/avatars/room1.jpg' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class AddParticipantsDto {
  @ApiProperty({
    type: [String],
    example: ['770e8400-e29b-41d4-a716-446655440002'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  participantIds: string[];
}

export class SendMessageDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  roomId: string;

  @ApiProperty({ example: '660e8400-e29b-41d4-a716-446655440001' })
  @IsUUID()
  senderId: string;

  @ApiPropertyOptional({ enum: MessageType, example: MessageType.TEXT })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType = MessageType.TEXT;

  @ApiProperty({ example: 'Hola familia, ¿cómo está mamá hoy?' })
  @IsString()
  content: string;

  @ApiPropertyOptional({
    example: { fileName: 'foto.jpg', fileSize: 1024 },
  })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UpdateMessageDto {
  @ApiProperty({ example: 'Hola familia, ¿cómo está mamá esta tarde?' })
  @IsString()
  content: string;
}

export class RoomQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ enum: RoomType })
  @IsOptional()
  @IsEnum(RoomType)
  type?: RoomType;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  participantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class MessageQueryDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  roomId: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  limit?: number = 50;

  @ApiPropertyOptional({ enum: MessageType })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;
}

export class MarkAsReadDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  userId: string;
}
