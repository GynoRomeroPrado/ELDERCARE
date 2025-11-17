/**
 * Módulo de Coordinación Familiar
 * Incluye Chat y Calendario Compartido
 */

import { Module } from '@nestjs/common';
import { ChatModule } from './chat/chat.module';
import { CalendarModule } from './calendar/calendar.module';

@Module({
  imports: [ChatModule, CalendarModule],
  exports: [ChatModule, CalendarModule],
})
export class FamilyCoordinationModule {}
