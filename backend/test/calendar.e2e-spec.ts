/**
 * Tests E2E para Módulo de Calendario Compartido
 * Cobertura completa de eventos y recordatorios
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

// Importar enums desde las entidades
enum EventType {
  MEDICAL_APPOINTMENT = 'MEDICAL_APPOINTMENT',
  MEDICATION_SCHEDULE = 'MEDICATION_SCHEDULE',
  FAMILY_VISIT = 'FAMILY_VISIT',
  ACTIVITY = 'ACTIVITY',
  REMINDER = 'REMINDER',
  CUSTOM = 'CUSTOM',
}

enum EventPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

enum RecurrenceType {
  NONE = 'NONE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
  CUSTOM = 'CUSTOM',
}

describe('CalendarController (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let elderToken: string;
  let familyToken: string;
  let adminUserId: string;
  let elderUserId: string;
  let familyUserId: string;
  let createdEventId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    // Login como admin
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@eldercare.com',
        password: 'Admin123!',
      });

    adminToken = adminLogin.body.accessToken;
    adminUserId = adminLogin.body.user?.id;

    // Login como elder
    const elderLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'elder@eldercare.com',
        password: 'Elder123!',
      });

    elderToken = elderLogin.body.accessToken;
    elderUserId = elderLogin.body.user?.id;

    // Login como family
    const familyLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'family@eldercare.com',
        password: 'Family123!',
      });

    familyToken = familyLogin.body.accessToken;
    familyUserId = familyLogin.body.user?.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /family/calendar/events - Crear evento', () => {
    it('debe crear cita médica exitosamente', async () => {
      if (!adminUserId || !elderUserId) return;

      const response = await request(app.getHttpServer())
        .post('/family/calendar/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Cita con cardiólogo',
          description: 'Control rutinario de presión arterial',
          eventType: EventType.MEDICAL_APPOINTMENT,
          priority: EventPriority.HIGH,
          startTime: '2024-11-20T10:00:00.000Z',
          endTime: '2024-11-20T11:00:00.000Z',
          location: 'Hospital Central, Piso 3, Consultorio 305',
          allDay: false,
          recurrence: RecurrenceType.NONE,
          createdBy: adminUserId,
          participantIds: [adminUserId, elderUserId],
          reminderMinutes: 30,
          metadata: { doctorName: 'Dr. Juan Pérez', phone: '+1234567890' },
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Cita con cardiólogo');
      expect(response.body.eventType).toBe(EventType.MEDICAL_APPOINTMENT);
      expect(response.body.priority).toBe(EventPriority.HIGH);
      createdEventId = response.body.id;
    });

    it('debe crear evento de medicación recurrente', async () => {
      if (!adminUserId || !elderUserId) return;

      const response = await request(app.getHttpServer())
        .post('/family/calendar/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Tomar medicamento para presión',
          eventType: EventType.MEDICATION_SCHEDULE,
          priority: EventPriority.HIGH,
          startTime: '2024-11-18T08:00:00.000Z',
          endTime: '2024-11-18T08:15:00.000Z',
          recurrence: RecurrenceType.DAILY,
          recurrenceRule: { interval: 1 },
          createdBy: adminUserId,
          participantIds: [elderUserId],
          reminderMinutes: 15,
        })
        .expect(201);

      expect(response.body.eventType).toBe(EventType.MEDICATION_SCHEDULE);
      expect(response.body.recurrence).toBe(RecurrenceType.DAILY);
    });

    it('debe crear visita familiar', async () => {
      if (!adminUserId || !elderUserId || !familyUserId) return;

      const response = await request(app.getHttpServer())
        .post('/family/calendar/events')
        .set('Authorization', `Bearer ${familyToken}`)
        .send({
          title: 'Visita de fin de semana',
          description: 'Almuerzo familiar',
          eventType: EventType.FAMILY_VISIT,
          priority: EventPriority.MEDIUM,
          startTime: '2024-11-23T12:00:00.000Z',
          endTime: '2024-11-23T16:00:00.000Z',
          location: 'Casa de mamá',
          createdBy: familyUserId,
          participantIds: [elderUserId, familyUserId],
        })
        .expect(201);

      expect(response.body.eventType).toBe(EventType.FAMILY_VISIT);
    });

    it('debe crear evento de todo el día', async () => {
      if (!adminUserId || !elderUserId) return;

      const response = await request(app.getHttpServer())
        .post('/family/calendar/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Cumpleaños de mamá',
          eventType: EventType.CUSTOM,
          priority: EventPriority.LOW,
          startTime: '2024-12-15T00:00:00.000Z',
          endTime: '2024-12-15T23:59:59.999Z',
          allDay: true,
          createdBy: adminUserId,
          participantIds: [adminUserId, elderUserId],
        })
        .expect(201);

      expect(response.body.allDay).toBe(true);
    });

    it('debe crear evento semanal recurrente', async () => {
      if (!adminUserId || !elderUserId) return;

      const response = await request(app.getHttpServer())
        .post('/family/calendar/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Terapia física',
          eventType: EventType.ACTIVITY,
          priority: EventPriority.MEDIUM,
          startTime: '2024-11-18T15:00:00.000Z',
          endTime: '2024-11-18T16:00:00.000Z',
          recurrence: RecurrenceType.WEEKLY,
          recurrenceRule: { interval: 1, daysOfWeek: [1, 3, 5] },
          createdBy: adminUserId,
          participantIds: [elderUserId],
        })
        .expect(201);

      expect(response.body.recurrence).toBe(RecurrenceType.WEEKLY);
    });

    it('debe rechazar eventType inválido', () => {
      if (!adminUserId || !elderUserId) return;

      return request(app.getHttpServer())
        .post('/family/calendar/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Event',
          eventType: 'INVALID_TYPE',
          startTime: '2024-11-20T10:00:00.000Z',
          endTime: '2024-11-20T11:00:00.000Z',
          createdBy: adminUserId,
          participantIds: [elderUserId],
        })
        .expect(400);
    });

    it('debe rechazar prioridad inválida', () => {
      if (!adminUserId || !elderUserId) return;

      return request(app.getHttpServer())
        .post('/family/calendar/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Event',
          eventType: EventType.CUSTOM,
          priority: 'INVALID_PRIORITY',
          startTime: '2024-11-20T10:00:00.000Z',
          endTime: '2024-11-20T11:00:00.000Z',
          createdBy: adminUserId,
          participantIds: [elderUserId],
        })
        .expect(400);
    });

    it('debe rechazar formato de fecha inválido', () => {
      if (!adminUserId || !elderUserId) return;

      return request(app.getHttpServer())
        .post('/family/calendar/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Event',
          eventType: EventType.CUSTOM,
          startTime: 'invalid-date',
          endTime: '2024-11-20T11:00:00.000Z',
          createdBy: adminUserId,
          participantIds: [elderUserId],
        })
        .expect(400);
    });

    it('debe rechazar participantIds inválidos', () => {
      if (!adminUserId) return;

      return request(app.getHttpServer())
        .post('/family/calendar/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Event',
          eventType: EventType.CUSTOM,
          startTime: '2024-11-20T10:00:00.000Z',
          endTime: '2024-11-20T11:00:00.000Z',
          createdBy: adminUserId,
          participantIds: ['invalid-uuid'],
        })
        .expect(400);
    });

    it('debe rechazar campos requeridos faltantes (title)', () => {
      if (!adminUserId || !elderUserId) return;

      return request(app.getHttpServer())
        .post('/family/calendar/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          eventType: EventType.CUSTOM,
          startTime: '2024-11-20T10:00:00.000Z',
          endTime: '2024-11-20T11:00:00.000Z',
          createdBy: adminUserId,
          participantIds: [elderUserId],
        })
        .expect(400);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .post('/family/calendar/events')
        .send({
          title: 'Test Event',
          eventType: EventType.CUSTOM,
          startTime: '2024-11-20T10:00:00.000Z',
          endTime: '2024-11-20T11:00:00.000Z',
          createdBy: adminUserId,
          participantIds: [elderUserId],
        })
        .expect(401);
    });
  });

  describe('GET /family/calendar/events - Listar eventos', () => {
    it('debe listar todos los eventos', async () => {
      const response = await request(app.getHttpServer())
        .get('/family/calendar/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('title');
      }
    });

    it('debe filtrar por tipo de evento', async () => {
      const response = await request(app.getHttpServer())
        .get('/family/calendar/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ eventType: EventType.MEDICAL_APPOINTMENT })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((event: any) => {
        expect(event.eventType).toBe(EventType.MEDICAL_APPOINTMENT);
      });
    });

    it('debe filtrar por prioridad', async () => {
      const response = await request(app.getHttpServer())
        .get('/family/calendar/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ priority: EventPriority.HIGH })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('debe filtrar por participante', async () => {
      if (!elderUserId) return;

      const response = await request(app.getHttpServer())
        .get('/family/calendar/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ participantId: elderUserId })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('debe filtrar por rango de fechas', async () => {
      const response = await request(app.getHttpServer())
        .get('/family/calendar/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          startDate: '2024-11-01T00:00:00.000Z',
          endDate: '2024-11-30T23:59:59.999Z',
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('debe filtrar eventos completados', async () => {
      const response = await request(app.getHttpServer())
        .get('/family/calendar/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ isCompleted: true })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('debe aplicar paginación', async () => {
      const response = await request(app.getHttpServer())
        .get('/family/calendar/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .get('/family/calendar/events')
        .expect(401);
    });
  });

  describe('GET /family/calendar/events/upcoming/:userId - Eventos próximos', () => {
    it('debe obtener eventos próximos de un usuario', async () => {
      if (!elderUserId) return;

      const response = await request(app.getHttpServer())
        .get(`/family/calendar/events/upcoming/${elderUserId}`)
        .set('Authorization', `Bearer ${elderToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('debe filtrar eventos próximos por días', async () => {
      if (!elderUserId) return;

      const response = await request(app.getHttpServer())
        .get(`/family/calendar/events/upcoming/${elderUserId}`)
        .set('Authorization', `Bearer ${elderToken}`)
        .query({ days: 3 })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('debe rechazar userId inválido', () => {
      return request(app.getHttpServer())
        .get('/family/calendar/events/upcoming/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .get(`/family/calendar/events/upcoming/${elderUserId}`)
        .expect(401);
    });
  });

  describe('GET /family/calendar/events/:id - Obtener evento', () => {
    it('debe obtener evento por ID', async () => {
      if (!createdEventId) return;

      const response = await request(app.getHttpServer())
        .get(`/family/calendar/events/${createdEventId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', createdEventId);
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('participants');
    });

    it('debe retornar 404 para evento inexistente', () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440099';
      return request(app.getHttpServer())
        .get(`/family/calendar/events/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('debe rechazar ID inválido', () => {
      return request(app.getHttpServer())
        .get('/family/calendar/events/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .get(`/family/calendar/events/${createdEventId}`)
        .expect(401);
    });
  });

  describe('PUT /family/calendar/events/:id - Actualizar evento', () => {
    it('debe actualizar título del evento', async () => {
      if (!createdEventId) return;

      const response = await request(app.getHttpServer())
        .put(`/family/calendar/events/${createdEventId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Cita con cardiólogo - Reprogramada',
        })
        .expect(200);

      expect(response.body.title).toBe('Cita con cardiólogo - Reprogramada');
    });

    it('debe actualizar fecha y hora del evento', async () => {
      if (!createdEventId) return;

      const response = await request(app.getHttpServer())
        .put(`/family/calendar/events/${createdEventId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          startTime: '2024-11-21T10:00:00.000Z',
          endTime: '2024-11-21T11:00:00.000Z',
        })
        .expect(200);

      expect(response.body).toHaveProperty('startTime');
      expect(response.body).toHaveProperty('endTime');
    });

    it('debe actualizar prioridad del evento', async () => {
      if (!createdEventId) return;

      const response = await request(app.getHttpServer())
        .put(`/family/calendar/events/${createdEventId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          priority: EventPriority.MEDIUM,
        })
        .expect(200);

      expect(response.body.priority).toBe(EventPriority.MEDIUM);
    });

    it('debe actualizar ubicación del evento', async () => {
      if (!createdEventId) return;

      const response = await request(app.getHttpServer())
        .put(`/family/calendar/events/${createdEventId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          location: 'Hospital Central, Piso 2',
        })
        .expect(200);

      expect(response.body.location).toBe('Hospital Central, Piso 2');
    });

    it('debe retornar 404 para evento inexistente', () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440099';
      return request(app.getHttpServer())
        .put(`/family/calendar/events/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Updated' })
        .expect(404);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .put(`/family/calendar/events/${createdEventId}`)
        .send({ title: 'Updated' })
        .expect(401);
    });
  });

  describe('PUT /family/calendar/events/:id/status - Actualizar estado', () => {
    it('debe marcar evento como completado', async () => {
      if (!createdEventId) return;

      const response = await request(app.getHttpServer())
        .put(`/family/calendar/events/${createdEventId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isCompleted: true,
        })
        .expect(200);

      expect(response.body.isCompleted).toBe(true);
    });

    it('debe marcar evento como cancelado', async () => {
      if (!createdEventId) return;

      const response = await request(app.getHttpServer())
        .put(`/family/calendar/events/${createdEventId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isCancelled: true,
          isCompleted: false,
        })
        .expect(200);

      expect(response.body.isCancelled).toBe(true);
    });

    it('debe desmarcar evento como completado', async () => {
      if (!createdEventId) return;

      const response = await request(app.getHttpServer())
        .put(`/family/calendar/events/${createdEventId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isCompleted: false,
          isCancelled: false,
        })
        .expect(200);

      expect(response.body.isCompleted).toBe(false);
      expect(response.body.isCancelled).toBe(false);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .put(`/family/calendar/events/${createdEventId}/status`)
        .send({ isCompleted: true })
        .expect(401);
    });
  });

  describe('POST /family/calendar/events/:id/participants - Agregar participantes', () => {
    it('debe agregar nuevo participante', async () => {
      if (!createdEventId || !familyUserId) return;

      const response = await request(app.getHttpServer())
        .post(`/family/calendar/events/${createdEventId}/participants`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          participantIds: [familyUserId],
        })
        .expect(200);

      expect(response.body).toHaveProperty('participants');
    });

    it('debe rechazar participantId inválido', () => {
      if (!createdEventId) return;

      return request(app.getHttpServer())
        .post(`/family/calendar/events/${createdEventId}/participants`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          participantIds: ['invalid-uuid'],
        })
        .expect(400);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .post(`/family/calendar/events/${createdEventId}/participants`)
        .send({ participantIds: [familyUserId] })
        .expect(401);
    });
  });

  describe('GET /family/calendar/statistics - Estadísticas', () => {
    it('debe retornar estadísticas generales', async () => {
      const response = await request(app.getHttpServer())
        .get('/family/calendar/statistics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('completed');
      expect(response.body).toHaveProperty('cancelled');
      expect(response.body).toHaveProperty('byType');
    });

    it('debe retornar estadísticas filtradas por usuario', async () => {
      if (!elderUserId) return;

      const response = await request(app.getHttpServer())
        .get('/family/calendar/statistics')
        .set('Authorization', `Bearer ${elderToken}`)
        .query({ userId: elderUserId })
        .expect(200);

      expect(response.body).toHaveProperty('total');
    });

    it('debe rechazar userId inválido', () => {
      return request(app.getHttpServer())
        .get('/family/calendar/statistics')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ userId: 'invalid-uuid' })
        .expect(400);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .get('/family/calendar/statistics')
        .expect(401);
    });
  });

  describe('GET /family/calendar/reminders/pending - Recordatorios pendientes', () => {
    it('debe obtener eventos que necesitan recordatorio', async () => {
      const response = await request(app.getHttpServer())
        .get('/family/calendar/reminders/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .get('/family/calendar/reminders/pending')
        .expect(401);
    });
  });

  describe('POST /family/calendar/reminders/:id/sent - Marcar recordatorio enviado', () => {
    it('debe marcar recordatorio como enviado', async () => {
      if (!createdEventId) return;

      const response = await request(app.getHttpServer())
        .post(`/family/calendar/reminders/${createdEventId}/sent`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('enviado');
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .post(`/family/calendar/reminders/${createdEventId}/sent`)
        .expect(401);
    });
  });

  describe('DELETE /family/calendar/events/:eventId/participants/:userId - Eliminar participante', () => {
    it('debe eliminar participante del evento', async () => {
      if (!createdEventId || !familyUserId) return;

      const response = await request(app.getHttpServer())
        .delete(
          `/family/calendar/events/${createdEventId}/participants/${familyUserId}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('participants');
    });

    it('debe rechazar eventId inválido', () => {
      if (!familyUserId) return;

      return request(app.getHttpServer())
        .delete(
          `/family/calendar/events/invalid-id/participants/${familyUserId}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .delete(
          `/family/calendar/events/${createdEventId}/participants/${familyUserId}`,
        )
        .expect(401);
    });
  });

  describe('DELETE /family/calendar/events/:id - Eliminar evento', () => {
    it('debe eliminar evento exitosamente', async () => {
      if (!createdEventId) return;

      const response = await request(app.getHttpServer())
        .delete(`/family/calendar/events/${createdEventId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('eliminado exitosamente');
    });

    it('debe retornar 404 al eliminar evento ya eliminado', () => {
      if (!createdEventId) return;

      return request(app.getHttpServer())
        .delete(`/family/calendar/events/${createdEventId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .delete(`/family/calendar/events/${createdEventId}`)
        .expect(401);
    });
  });
});
