/**
 * Tests E2E para Módulo de Alertas
 * Cobertura completa de configuraciones y historial de alertas
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  AlertType,
  AlertPriority,
  AlertChannel,
  AlertStatus,
} from '../src/modules/alerts/dto/alerts.dto';

describe('AlertsController (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let elderToken: string;
  let testUserId: string;
  let createdConfigId: string;
  let triggeredAlertId: string;

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

    // Login como elder
    const elderLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'elder@eldercare.com',
        password: 'Elder123!',
      });

    elderToken = elderLogin.body.accessToken;

    // Obtener ID del elder
    const elderUser = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ email: 'elder@eldercare.com' });

    testUserId = elderUser.body[0]?.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /alerts/config - Crear configuración', () => {
    it('debe crear configuración de alerta exitosamente', async () => {
      if (!testUserId) return;

      const response = await request(app.getHttpServer())
        .post('/alerts/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: testUserId,
          alertType: AlertType.LOW_BATTERY,
          name: 'Batería Baja',
          description: 'Alerta cuando batería esté por debajo del 20%',
          priority: AlertPriority.MEDIUM,
          channels: [AlertChannel.PUSH, AlertChannel.EMAIL],
          conditions: { batteryThreshold: 20 },
          enabled: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Batería Baja');
      expect(response.body.alertType).toBe(AlertType.LOW_BATTERY);
      expect(response.body.priority).toBe(AlertPriority.MEDIUM);
      expect(response.body.enabled).toBe(true);
      createdConfigId = response.body.id;
    });

    it('debe crear alerta de caída detectada con prioridad crítica', async () => {
      if (!testUserId) return;

      const response = await request(app.getHttpServer())
        .post('/alerts/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: testUserId,
          alertType: AlertType.FALL_DETECTED,
          name: 'Caída Detectada',
          description: 'Alerta inmediata cuando se detecta una caída',
          priority: AlertPriority.CRITICAL,
          channels: [AlertChannel.PUSH, AlertChannel.SMS, AlertChannel.EMAIL],
        })
        .expect(201);

      expect(response.body.priority).toBe(AlertPriority.CRITICAL);
      expect(response.body.channels).toHaveLength(3);
    });

    it('debe crear alerta de dispositivo offline', async () => {
      if (!testUserId) return;

      const response = await request(app.getHttpServer())
        .post('/alerts/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: testUserId,
          alertType: AlertType.DEVICE_OFFLINE,
          name: 'Dispositivo Desconectado',
          priority: AlertPriority.HIGH,
          channels: [AlertChannel.PUSH],
          conditions: { offlineThreshold: 300 },
        })
        .expect(201);

      expect(response.body.alertType).toBe(AlertType.DEVICE_OFFLINE);
    });

    it('debe rechazar userId inválido (no UUID)', () => {
      return request(app.getHttpServer())
        .post('/alerts/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: 'invalid-uuid',
          alertType: AlertType.LOW_BATTERY,
          name: 'Test',
          priority: AlertPriority.MEDIUM,
          channels: [AlertChannel.PUSH],
        })
        .expect(400);
    });

    it('debe rechazar alertType inválido', () => {
      if (!testUserId) return;

      return request(app.getHttpServer())
        .post('/alerts/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: testUserId,
          alertType: 'INVALID_TYPE',
          name: 'Test',
          priority: AlertPriority.MEDIUM,
          channels: [AlertChannel.PUSH],
        })
        .expect(400);
    });

    it('debe rechazar prioridad inválida', () => {
      if (!testUserId) return;

      return request(app.getHttpServer())
        .post('/alerts/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: testUserId,
          alertType: AlertType.LOW_BATTERY,
          name: 'Test',
          priority: 'INVALID_PRIORITY',
          channels: [AlertChannel.PUSH],
        })
        .expect(400);
    });

    it('debe rechazar canales inválidos', () => {
      if (!testUserId) return;

      return request(app.getHttpServer())
        .post('/alerts/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: testUserId,
          alertType: AlertType.LOW_BATTERY,
          name: 'Test',
          priority: AlertPriority.MEDIUM,
          channels: ['INVALID_CHANNEL'],
        })
        .expect(400);
    });

    it('debe rechazar campos requeridos faltantes (userId)', () => {
      return request(app.getHttpServer())
        .post('/alerts/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          alertType: AlertType.LOW_BATTERY,
          name: 'Test',
          priority: AlertPriority.MEDIUM,
          channels: [AlertChannel.PUSH],
        })
        .expect(400);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .post('/alerts/config')
        .send({
          userId: testUserId,
          alertType: AlertType.LOW_BATTERY,
          name: 'Test',
          priority: AlertPriority.MEDIUM,
          channels: [AlertChannel.PUSH],
        })
        .expect(401);
    });
  });

  describe('GET /alerts/config - Listar configuraciones', () => {
    it('debe listar todas las configuraciones', async () => {
      const response = await request(app.getHttpServer())
        .get('/alerts/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('alertType');
      }
    });

    it('debe filtrar por tipo de alerta', async () => {
      const response = await request(app.getHttpServer())
        .get('/alerts/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ alertType: AlertType.LOW_BATTERY })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((config: any) => {
        expect(config.alertType).toBe(AlertType.LOW_BATTERY);
      });
    });

    it('debe filtrar por prioridad', async () => {
      const response = await request(app.getHttpServer())
        .get('/alerts/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ priority: AlertPriority.CRITICAL })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('debe filtrar por usuario', async () => {
      if (!testUserId) return;

      const response = await request(app.getHttpServer())
        .get('/alerts/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ userId: testUserId })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('debe aplicar paginación', async () => {
      const response = await request(app.getHttpServer())
        .get('/alerts/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 5 })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer()).get('/alerts/config').expect(401);
    });
  });

  describe('GET /alerts/config/:id - Obtener configuración', () => {
    it('debe obtener configuración por ID', async () => {
      if (!createdConfigId) return;

      const response = await request(app.getHttpServer())
        .get(`/alerts/config/${createdConfigId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', createdConfigId);
      expect(response.body).toHaveProperty('alertType');
      expect(response.body).toHaveProperty('priority');
    });

    it('debe retornar 404 para configuración inexistente', () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440099';
      return request(app.getHttpServer())
        .get(`/alerts/config/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('debe rechazar ID inválido (no UUID)', () => {
      return request(app.getHttpServer())
        .get('/alerts/config/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .get(`/alerts/config/${createdConfigId}`)
        .expect(401);
    });
  });

  describe('PUT /alerts/config/:id - Actualizar configuración', () => {
    it('debe actualizar configuración exitosamente', async () => {
      if (!createdConfigId) return;

      const response = await request(app.getHttpServer())
        .put(`/alerts/config/${createdConfigId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Batería Crítica',
          description: 'Alerta cuando batería < 10%',
          priority: AlertPriority.HIGH,
        })
        .expect(200);

      expect(response.body.name).toBe('Batería Crítica');
      expect(response.body.priority).toBe(AlertPriority.HIGH);
    });

    it('debe actualizar canales de notificación', async () => {
      if (!createdConfigId) return;

      const response = await request(app.getHttpServer())
        .put(`/alerts/config/${createdConfigId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          channels: [AlertChannel.PUSH, AlertChannel.SMS],
        })
        .expect(200);

      expect(response.body.channels).toHaveLength(2);
    });

    it('debe retornar 404 para configuración inexistente', () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440099';
      return request(app.getHttpServer())
        .put(`/alerts/config/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated' })
        .expect(404);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .put(`/alerts/config/${createdConfigId}`)
        .send({ name: 'Updated' })
        .expect(401);
    });
  });

  describe('PUT /alerts/config/:id/toggle - Habilitar/deshabilitar', () => {
    it('debe deshabilitar configuración', async () => {
      if (!createdConfigId) return;

      const response = await request(app.getHttpServer())
        .put(`/alerts/config/${createdConfigId}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enabled: false })
        .expect(200);

      expect(response.body.enabled).toBe(false);
    });

    it('debe habilitar configuración', async () => {
      if (!createdConfigId) return;

      const response = await request(app.getHttpServer())
        .put(`/alerts/config/${createdConfigId}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enabled: true })
        .expect(200);

      expect(response.body.enabled).toBe(true);
    });

    it('debe rechazar valor de enabled inválido', () => {
      if (!createdConfigId) return;

      return request(app.getHttpServer())
        .put(`/alerts/config/${createdConfigId}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enabled: 'not-boolean' })
        .expect(400);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .put(`/alerts/config/${createdConfigId}/toggle`)
        .send({ enabled: false })
        .expect(401);
    });
  });

  describe('POST /alerts/trigger - Disparar alerta', () => {
    it('debe disparar alerta manualmente', async () => {
      if (!createdConfigId) return;

      const response = await request(app.getHttpServer())
        .post('/alerts/trigger')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          alertConfigId: createdConfigId,
          message: 'Batería del dispositivo en 15%',
          data: { batteryLevel: 15 },
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.message).toBe('Batería del dispositivo en 15%');
      triggeredAlertId = response.body.id;
    });

    it('debe disparar alerta sin datos adicionales', async () => {
      if (!createdConfigId) return;

      const response = await request(app.getHttpServer())
        .post('/alerts/trigger')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          alertConfigId: createdConfigId,
          message: 'Alerta de prueba',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
    });

    it('debe rechazar alertConfigId inválido (no UUID)', () => {
      return request(app.getHttpServer())
        .post('/alerts/trigger')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          alertConfigId: 'invalid-uuid',
          message: 'Test',
        })
        .expect(400);
    });

    it('debe rechazar mensaje faltante (campo requerido)', () => {
      if (!createdConfigId) return;

      return request(app.getHttpServer())
        .post('/alerts/trigger')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          alertConfigId: createdConfigId,
        })
        .expect(400);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .post('/alerts/trigger')
        .send({
          alertConfigId: createdConfigId,
          message: 'Test',
        })
        .expect(401);
    });
  });

  describe('GET /alerts/history - Historial de alertas', () => {
    it('debe listar historial de alertas', async () => {
      const response = await request(app.getHttpServer())
        .get('/alerts/history')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('debe filtrar por tipo de alerta', async () => {
      const response = await request(app.getHttpServer())
        .get('/alerts/history')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ alertType: AlertType.LOW_BATTERY })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('debe filtrar por prioridad', async () => {
      const response = await request(app.getHttpServer())
        .get('/alerts/history')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ priority: AlertPriority.HIGH })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('debe filtrar por estado', async () => {
      const response = await request(app.getHttpServer())
        .get('/alerts/history')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ status: AlertStatus.TRIGGERED })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('debe aplicar paginación', async () => {
      const response = await request(app.getHttpServer())
        .get('/alerts/history')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer()).get('/alerts/history').expect(401);
    });
  });

  describe('PUT /alerts/history/:id/resolve - Resolver alerta', () => {
    it('debe resolver alerta con motivo', async () => {
      if (!triggeredAlertId) return;

      const response = await request(app.getHttpServer())
        .put(`/alerts/history/${triggeredAlertId}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          resolvedReason: 'Batería recargada',
        })
        .expect(200);

      expect(response.body.status).toBe(AlertStatus.RESOLVED);
      expect(response.body.resolvedReason).toBe('Batería recargada');
    });

    it('debe resolver alerta sin motivo', async () => {
      // Crear y disparar nueva alerta para resolver
      if (!createdConfigId) return;

      const triggered = await request(app.getHttpServer())
        .post('/alerts/trigger')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          alertConfigId: createdConfigId,
          message: 'Test para resolver',
        });

      const response = await request(app.getHttpServer())
        .put(`/alerts/history/${triggered.body.id}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(200);

      expect(response.body.status).toBe(AlertStatus.RESOLVED);
    });

    it('debe retornar 404 para alerta inexistente', () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440099';
      return request(app.getHttpServer())
        .put(`/alerts/history/${fakeId}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ resolvedReason: 'Test' })
        .expect(404);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .put(`/alerts/history/${triggeredAlertId}/resolve`)
        .send({ resolvedReason: 'Test' })
        .expect(401);
    });
  });

  describe('GET /alerts/statistics - Estadísticas', () => {
    it('debe retornar estadísticas generales de alertas', async () => {
      const response = await request(app.getHttpServer())
        .get('/alerts/statistics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('byType');
      expect(response.body).toHaveProperty('byPriority');
    });

    it('debe retornar estadísticas filtradas por usuario', async () => {
      if (!testUserId) return;

      const response = await request(app.getHttpServer())
        .get('/alerts/statistics')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ userId: testUserId })
        .expect(200);

      expect(response.body).toHaveProperty('total');
    });

    it('debe rechazar userId inválido (no UUID)', () => {
      return request(app.getHttpServer())
        .get('/alerts/statistics')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ userId: 'invalid-uuid' })
        .expect(400);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .get('/alerts/statistics')
        .expect(401);
    });
  });

  describe('POST /alerts/evaluate - Evaluar condiciones', () => {
    it('debe evaluar condiciones de alertas activas', async () => {
      const response = await request(app.getHttpServer())
        .post('/alerts/evaluate')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('evaluadas exitosamente');
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer()).post('/alerts/evaluate').expect(401);
    });
  });

  describe('DELETE /alerts/config/:id - Eliminar configuración', () => {
    it('debe eliminar configuración exitosamente', async () => {
      if (!createdConfigId) return;

      const response = await request(app.getHttpServer())
        .delete(`/alerts/config/${createdConfigId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('eliminada exitosamente');
    });

    it('debe retornar 404 al eliminar configuración ya eliminada', () => {
      if (!createdConfigId) return;

      return request(app.getHttpServer())
        .delete(`/alerts/config/${createdConfigId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('debe rechazar ID inválido', () => {
      return request(app.getHttpServer())
        .delete('/alerts/config/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .delete(`/alerts/config/${createdConfigId}`)
        .expect(401);
    });
  });
});
