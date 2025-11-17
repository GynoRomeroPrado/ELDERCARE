/**
 * Servicio de Calendario Compartido
 * Gestión de eventos y recordatorios familiares
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between } from 'typeorm';
import { CalendarEvent } from './entities/calendar-event.entity';
import { User } from '../../users/entities/user.entity';
import {
  CreateEventDto,
  UpdateEventDto,
  EventQueryDto,
  UpdateEventStatusDto,
} from './dto/calendar.dto';

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(CalendarEvent)
    private eventRepository: Repository<CalendarEvent>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Crear evento
   */
  async createEvent(createDto: CreateEventDto): Promise<CalendarEvent> {
    // Validar fechas
    const startTime = new Date(createDto.startTime);
    const endTime = new Date(createDto.endTime);

    if (endTime <= startTime) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    }

    // Verificar que los participantes existen
    const participants = await this.userRepository.find({
      where: { id: In(createDto.participantIds) },
    });

    if (participants.length !== createDto.participantIds.length) {
      throw new BadRequestException('Uno o más participantes no existen');
    }

    const event = this.eventRepository.create({
      ...createDto,
      startTime,
      endTime,
      participants,
    });

    return this.eventRepository.save(event);
  }

  /**
   * Obtener todos los eventos
   */
  async findAllEvents(query: EventQueryDto): Promise<{
    data: CalendarEvent[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 50,
      eventType,
      priority,
      participantId,
      startDate,
      endDate,
      isCompleted,
      isCancelled,
    } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.eventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.creator', 'creator')
      .leftJoinAndSelect('event.participants', 'participants')
      .skip(skip)
      .take(limit);

    if (eventType) {
      queryBuilder.andWhere('event.eventType = :eventType', { eventType });
    }

    if (priority) {
      queryBuilder.andWhere('event.priority = :priority', { priority });
    }

    if (participantId) {
      queryBuilder.andWhere('participants.id = :participantId', {
        participantId,
      });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere(
        'event.startTime BETWEEN :startDate AND :endDate',
        {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        },
      );
    } else if (startDate) {
      queryBuilder.andWhere('event.startTime >= :startDate', {
        startDate: new Date(startDate),
      });
    } else if (endDate) {
      queryBuilder.andWhere('event.startTime <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    if (isCompleted !== undefined) {
      queryBuilder.andWhere('event.isCompleted = :isCompleted', {
        isCompleted,
      });
    }

    if (isCancelled !== undefined) {
      queryBuilder.andWhere('event.isCancelled = :isCancelled', {
        isCancelled,
      });
    }

    queryBuilder.orderBy('event.startTime', 'ASC');

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Obtener evento por ID
   */
  async findOneEvent(id: string): Promise<CalendarEvent> {
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: ['creator', 'participants'],
    });

    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }

    return event;
  }

  /**
   * Actualizar evento
   */
  async updateEvent(
    id: string,
    updateDto: UpdateEventDto,
  ): Promise<CalendarEvent> {
    const event = await this.findOneEvent(id);

    // Validar fechas si se proporcionan
    if (updateDto.startTime || updateDto.endTime) {
      const startTime = updateDto.startTime
        ? new Date(updateDto.startTime)
        : event.startTime;
      const endTime = updateDto.endTime
        ? new Date(updateDto.endTime)
        : event.endTime;

      if (endTime <= startTime) {
        throw new BadRequestException(
          'La fecha de fin debe ser posterior a la fecha de inicio',
        );
      }

      updateDto.startTime = startTime.toISOString();
      updateDto.endTime = endTime.toISOString();
    }

    Object.assign(event, updateDto);

    return this.eventRepository.save(event);
  }

  /**
   * Actualizar estado del evento
   */
  async updateStatus(
    id: string,
    statusDto: UpdateEventStatusDto,
  ): Promise<CalendarEvent> {
    const event = await this.findOneEvent(id);
    Object.assign(event, statusDto);
    return this.eventRepository.save(event);
  }

  /**
   * Agregar participantes
   */
  async addParticipants(
    id: string,
    participantIds: string[],
  ): Promise<CalendarEvent> {
    const event = await this.findOneEvent(id);

    const newParticipants = await this.userRepository.find({
      where: { id: In(participantIds) },
    });

    if (newParticipants.length !== participantIds.length) {
      throw new BadRequestException('Uno o más participantes no existen');
    }

    event.participants = [...event.participants, ...newParticipants];
    return this.eventRepository.save(event);
  }

  /**
   * Eliminar participante
   */
  async removeParticipant(
    eventId: string,
    userId: string,
  ): Promise<CalendarEvent> {
    const event = await this.findOneEvent(eventId);
    event.participants = event.participants.filter((p) => p.id !== userId);
    return this.eventRepository.save(event);
  }

  /**
   * Eliminar evento
   */
  async removeEvent(id: string): Promise<void> {
    const event = await this.findOneEvent(id);
    await this.eventRepository.delete(id);
  }

  /**
   * Obtener eventos próximos
   */
  async getUpcomingEvents(userId: string, days: number = 7): Promise<CalendarEvent[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return this.eventRepository
      .createQueryBuilder('event')
      .leftJoin('event.participants', 'participants')
      .leftJoinAndSelect('event.creator', 'creator')
      .leftJoinAndSelect('event.participants', 'allParticipants')
      .where('participants.id = :userId', { userId })
      .andWhere('event.startTime BETWEEN :now AND :futureDate', {
        now,
        futureDate,
      })
      .andWhere('event.isCancelled = :isCancelled', { isCancelled: false })
      .andWhere('event.isCompleted = :isCompleted', { isCompleted: false })
      .orderBy('event.startTime', 'ASC')
      .getMany();
  }

  /**
   * Obtener eventos que necesitan recordatorio
   */
  async getEventsNeedingReminder(): Promise<CalendarEvent[]> {
    const now = new Date();

    return this.eventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.participants', 'participants')
      .where('event.reminderMinutes IS NOT NULL')
      .andWhere('event.reminderSent = :reminderSent', { reminderSent: false })
      .andWhere('event.isCancelled = :isCancelled', { isCancelled: false })
      .andWhere('event.isCompleted = :isCompleted', { isCompleted: false })
      .andWhere(
        "event.startTime <= :reminderTime",
        {
          reminderTime: new Date(now.getTime() + 60 * 60 * 1000), // Próximas horas
        },
      )
      .getMany();
  }

  /**
   * Marcar recordatorio como enviado
   */
  async markReminderSent(id: string): Promise<void> {
    await this.eventRepository.update(id, { reminderSent: true });
  }

  /**
   * Obtener estadísticas de eventos
   */
  async getStatistics(userId?: string): Promise<any> {
    const queryBuilder = this.eventRepository
      .createQueryBuilder('event')
      .leftJoin('event.participants', 'participants');

    if (userId) {
      queryBuilder.where('participants.id = :userId', { userId });
    }

    const total = await queryBuilder.getCount();

    const byType = await queryBuilder
      .select('event.eventType', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('event.eventType')
      .getRawMany();

    const byPriority = await queryBuilder
      .select('event.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .groupBy('event.priority')
      .getRawMany();

    const completed = await queryBuilder
      .where('event.isCompleted = :isCompleted', { isCompleted: true })
      .getCount();

    const cancelled = await queryBuilder
      .where('event.isCancelled = :isCancelled', { isCancelled: true })
      .getCount();

    const upcoming = await queryBuilder
      .where('event.startTime > :now', { now: new Date() })
      .andWhere('event.isCancelled = :isCancelled', { isCancelled: false })
      .andWhere('event.isCompleted = :isCompleted', { isCompleted: false })
      .getCount();

    return {
      total,
      completed,
      cancelled,
      upcoming,
      byType: byType.reduce((acc, curr) => {
        acc[curr.type] = parseInt(curr.count);
        return acc;
      }, {}),
      byPriority: byPriority.reduce((acc, curr) => {
        acc[curr.priority] = parseInt(curr.count);
        return acc;
      }, {}),
    };
  }
}
