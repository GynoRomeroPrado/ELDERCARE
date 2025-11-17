/**
 * False Alarm DTO
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class FalseAlarmDto {
  @ApiProperty({
    description: 'Reason why this was a false alarm',
    example: 'Pet triggered the sensor',
  })
  @IsString()
  reason: string;
}
