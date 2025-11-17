/**
 * Acknowledge Fall Event DTO
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AcknowledgeFallDto {
  @ApiPropertyOptional({
    description: 'Notes about the fall acknowledgment',
    example: 'Patient is fine, no injuries observed. False alarm from pet.',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
