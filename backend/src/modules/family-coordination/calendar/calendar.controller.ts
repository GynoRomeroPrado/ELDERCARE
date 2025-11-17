/**
 * Controlador de Calendario Compartido
 * API REST para gestión de eventos y recordatorios
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import {
  CreateEventDto,
  UpdateEventDto,
  EventQueryDto,
  UpdateEventStatusDto,
} from './dto/calendar.dto';

@ApiTags('family-calendar')
@ApiBearerAuth()
@Controller('family/calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Post('events')
  @ApiOperation({
    summary: 'Crear evento',
    description: 'Crea un nuevo evento en el calendario compartido',
  })
  @ApiResponse({ status: 201, description: 'Evento creado exitosamente' })
  async createEvent(@Body() createDto: CreateEventDto) {
    return this.calendarService.createEvent(createDto);
  }

  @Get('events')
  @ApiOperation({
    summary: 'Listar eventos',
    description: 'Obtiene todos los eventos con filtros',
  })
  @ApiResponse({ status: 200, description: 'Lista de eventos' })
  async findAllEvents(@Query() query: EventQueryDto) {
    return this.calendarService.findAllEvents(query);
  }

  @Get('events/upcoming/:userId')
  @ApiOperation({
    summary: 'Eventos próximos',
    description: 'Obtiene los eventos próximos de un usuario (7 días por defecto)',
  })
  @ApiParam({ name: 'userId', description: 'UUID del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de eventos próximos' })
  async getUpcomingEvents(
    @Param('userId') userId: string,
    @Query('days') days?: number,
  ) {
    return this.calendarService.getUpcomingEvents(userId, days);
  }

  @Get('events/:id')
  @ApiOperation({
    summary: 'Obtener evento por ID',
    description: 'Obtiene los detalles de un evento específico',
  })
  @ApiParam({ name: 'id', description: 'UUID del evento' })
  @ApiResponse({ status: 200, description: 'Evento encontrado' })
  @ApiResponse({ status: 404, description: 'Evento no encontrado' })
  async findOneEvent(@Param('id') id: string) {
    return this.calendarService.findOneEvent(id);
  }

  @Put('events/:id')
  @ApiOperation({
    summary: 'Actualizar evento',
    description: 'Actualiza los detalles de un evento',
  })
  @ApiResponse({ status: 200, description: 'Evento actualizado' })
  async updateEvent(
    @Param('id') id: string,
    @Body() updateDto: UpdateEventDto,
  ) {
    return this.calendarService.updateEvent(id, updateDto);
  }

  @Put('events/:id/status')
  @ApiOperation({
    summary: 'Actualizar estado del evento',
    description: 'Marca el evento como completado o cancelado',
  })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('id') id: string,
    @Body() statusDto: UpdateEventStatusDto,
  ) {
    return this.calendarService.updateStatus(id, statusDto);
  }

  @Post('events/:id/participants')
  @ApiOperation({
    summary: 'Agregar participantes',
    description: 'Agrega nuevos participantes a un evento',
  })
  @ApiResponse({ status: 200, description: 'Participantes agregados' })
  @HttpCode(HttpStatus.OK)
  async addParticipants(
    @Param('id') id: string,
    @Body() body: { participantIds: string[] },
  ) {
    return this.calendarService.addParticipants(id, body.participantIds);
  }

  @Delete('events/:eventId/participants/:userId')
  @ApiOperation({
    summary: 'Eliminar participante',
    description: 'Elimina un participante de un evento',
  })
  @ApiResponse({ status: 200, description: 'Participante eliminado' })
  async removeParticipant(
    @Param('eventId') eventId: string,
    @Param('userId') userId: string,
  ) {
    return this.calendarService.removeParticipant(eventId, userId);
  }

  @Delete('events/:id')
  @ApiOperation({
    summary: 'Eliminar evento',
    description: 'Elimina un evento permanentemente',
  })
  @ApiResponse({ status: 200, description: 'Evento eliminado' })
  async removeEvent(@Param('id') id: string) {
    await this.calendarService.removeEvent(id);
    return { message: 'Evento eliminado exitosamente' };
  }

  @Get('statistics')
  @ApiOperation({
    summary: 'Estadísticas de calendario',
    description: 'Estadísticas: total, completados, cancelados, próximos, por tipo',
  })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas' })
  async getStatistics(@Query('userId') userId?: string) {
    return this.calendarService.getStatistics(userId);
  }

  @Get('reminders/pending')
  @ApiOperation({
    summary: 'Eventos que necesitan recordatorio',
    description: 'Lista de eventos próximos que aún no han enviado recordatorio',
  })
  @ApiResponse({ status: 200, description: 'Lista de eventos' })
  async getEventsNeedingReminder() {
    return this.calendarService.getEventsNeedingReminder();
  }

  @Post('reminders/:id/sent')
  @ApiOperation({
    summary: 'Marcar recordatorio como enviado',
    description: 'Marca que el recordatorio de un evento ya fue enviado',
  })
  @ApiResponse({ status: 200, description: 'Recordatorio marcado' })
  @HttpCode(HttpStatus.OK)
  async markReminderSent(@Param('id') id: string) {
    await this.calendarService.markReminderSent(id);
    return { message: 'Recordatorio marcado como enviado' };
  }
}
