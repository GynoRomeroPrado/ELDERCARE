/**
 * Módulo de Alertas
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { AlertConfig } from './entities/alert-config.entity';
import { AlertHistory } from './entities/alert-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AlertConfig, AlertHistory])],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
