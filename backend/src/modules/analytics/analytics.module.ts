/**
 * Módulo de Analytics
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Medication } from '../medications/entities/medication.entity';
import { MedicationSchedule } from '../medications/entities/medication-schedule.entity';
import { MedicationLog } from '../medications/entities/medication-log.entity';
import { Fall } from '../falls/entities/fall.entity';
import { Device } from '../devices/entities/device.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Medication,
      MedicationSchedule,
      MedicationLog,
      Fall,
      Device,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
