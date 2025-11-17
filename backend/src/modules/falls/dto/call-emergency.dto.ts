/**
 * Call Emergency DTO
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CallEmergencyDto {
  @ApiProperty({
    description: 'Whether to contact emergency services (911)',
    example: true,
  })
  @IsBoolean()
  contactEmergencyServices: boolean;

  @ApiPropertyOptional({
    description: 'Additional notes for emergency responders',
    example: 'Patient is unresponsive, possible head injury',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
