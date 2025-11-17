/**
 * Tests E2E para Módulo de Analytics
 * Cobertura completa de todos los endpoints de reportes y análisis
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  ReportType,
  ReportPeriod,
  ExportFormat,
} from '../src/modules/analytics/dto/analytics.dto';

describe('AnalyticsController (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let elderToken: string;
  let testUserId: string;
  let testDeviceId: string;

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

    // Login como admin para obtener token
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@eldercare.com',
        password: 'Admin123!',
      });

    adminToken = adminLogin.body.accessToken;

    // Login como elder para tests de permisos
    const elderLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'elder@eldercare.com',
        password: 'Elder123!',
      });

    elderToken = elderLogin.body.accessToken;

    // Obtener ID del elder para tests
    const elderUser = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ email: 'elder@eldercare.com' });

    testUserId = elderUser.body[0]?.id;

    // Obtener un dispositivo de prueba si existe
    const devices = await request(app.getHttpServer())
      .get('/devices')
      .set('Authorization', `Bearer ${adminToken}`);

    testDeviceId = devices.body[0]?.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /analytics/medication-adherence', () => {
    it('debe retornar reporte de adherencia a medicamentos con período mensual', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/medication-adherence')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ period: ReportPeriod.MONTHLY })
        .expect(200);

      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('adherenceRate');
      expect(response.body).toHaveProperty('period');
    });

    it('debe retornar reporte filtrado por usuario específico', async () => {
      if (!testUserId) {
        return; // Skip si no hay usuario de prueba
      }

      const response = await request(app.getHttpServer())
        .get('/analytics/medication-adherence')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          userId: testUserId,
          period: ReportPeriod.WEEKLY,
        })
        .expect(200);

      expect(response.body).toHaveProperty('summary');
    });

    it('debe retornar reporte con rango de fechas personalizado', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/medication-adherence')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          period: ReportPeriod.CUSTOM,
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        })
        .expect(200);

      expect(response.body).toHaveProperty('summary');
      expect(response.body.period).toBe(ReportPeriod.CUSTOM);
    });

    it('debe rechazar userId inválido (no UUID)', () => {
      return request(app.getHttpServer())
        .get('/analytics/medication-adherence')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ userId: 'invalid-uuid' })
        .expect(400);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .get('/analytics/medication-adherence')
        .expect(401);
    });
  });

  describe('GET /analytics/falls', () => {
    it('debe retornar reporte de caídas con estadísticas completas', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/falls')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ period: ReportPeriod.MONTHLY })
        .expect(200);

      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('totalFalls');
      expect(response.body).toHaveProperty('byServerity');
    });

    it('debe retornar reporte filtrado por usuario específico', async () => {
      if (!testUserId) {
        return; // Skip si no hay usuario de prueba
      }

      const response = await request(app.getHttpServer())
        .get('/analytics/falls')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          userId: testUserId,
          period: ReportPeriod.DAILY,
        })
        .expect(200);

      expect(response.body).toHaveProperty('summary');
    });

    it('debe retornar datos con período trimestral', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/falls')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ period: ReportPeriod.QUARTERLY })
        .expect(200);

      expect(response.body).toHaveProperty('summary');
      expect(response.body.period).toBe(ReportPeriod.QUARTERLY);
    });

    it('debe rechazar formato de fecha inválido', () => {
      return request(app.getHttpServer())
        .get('/analytics/falls')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ startDate: 'not-a-date' })
        .expect(400);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer()).get('/analytics/falls').expect(401);
    });
  });

  describe('GET /analytics/devices', () => {
    it('debe retornar reporte de actividad de dispositivos', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ period: ReportPeriod.MONTHLY })
        .expect(200);

      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('deviceStats');
    });

    it('debe retornar estadísticas filtradas por dispositivo específico', async () => {
      if (!testDeviceId) {
        return; // Skip si no hay dispositivo de prueba
      }

      const response = await request(app.getHttpServer())
        .get('/analytics/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          deviceId: testDeviceId,
          period: ReportPeriod.WEEKLY,
        })
        .expect(200);

      expect(response.body).toHaveProperty('summary');
    });

    it('debe retornar reporte con período anual', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ period: ReportPeriod.YEARLY })
        .expect(200);

      expect(response.body).toHaveProperty('summary');
      expect(response.body.period).toBe(ReportPeriod.YEARLY);
    });

    it('debe rechazar deviceId inválido (no UUID)', () => {
      return request(app.getHttpServer())
        .get('/analytics/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ deviceId: 'not-a-uuid' })
        .expect(400);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .get('/analytics/devices')
        .expect(401);
    });
  });

  describe('GET /analytics/dashboard', () => {
    it('debe retornar dashboard general con todas las métricas', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('medicationAdherence');
      expect(response.body).toHaveProperty('fallsStats');
      expect(response.body).toHaveProperty('devicesStats');
    });

    it('debe retornar dashboard filtrado por usuario específico', async () => {
      if (!testUserId) {
        return; // Skip si no hay usuario de prueba
      }

      const response = await request(app.getHttpServer())
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ userId: testUserId })
        .expect(200);

      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('userId');
    });

    it('debe rechazar userId inválido (no UUID)', () => {
      return request(app.getHttpServer())
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ userId: 'invalid-uuid' })
        .expect(400);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .get('/analytics/dashboard')
        .expect(401);
    });

    it('debe permitir acceso a elder para ver su propio dashboard', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${elderToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('summary');
    });
  });

  describe('POST /analytics/export', () => {
    it('debe exportar reporte en formato PDF', async () => {
      const response = await request(app.getHttpServer())
        .post('/analytics/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reportType: ReportType.MEDICATION_ADHERENCE,
          format: ExportFormat.PDF,
          period: ReportPeriod.MONTHLY,
        })
        .expect(200);

      expect(response.body).toHaveProperty('url');
      expect(response.body.format).toBe(ExportFormat.PDF);
    });

    it('debe exportar reporte en formato CSV', async () => {
      const response = await request(app.getHttpServer())
        .post('/analytics/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reportType: ReportType.FALLS,
          format: ExportFormat.CSV,
          period: ReportPeriod.WEEKLY,
        })
        .expect(200);

      expect(response.body).toHaveProperty('url');
      expect(response.body.format).toBe(ExportFormat.CSV);
    });

    it('debe exportar reporte en formato JSON', async () => {
      const response = await request(app.getHttpServer())
        .post('/analytics/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reportType: ReportType.DEVICE_ACTIVITY,
          format: ExportFormat.JSON,
          period: ReportPeriod.DAILY,
        })
        .expect(200);

      expect(response.body).toHaveProperty('url');
      expect(response.body.format).toBe(ExportFormat.JSON);
    });

    it('debe exportar reporte con rango de fechas personalizado', async () => {
      const response = await request(app.getHttpServer())
        .post('/analytics/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reportType: ReportType.GENERAL_DASHBOARD,
          format: ExportFormat.PDF,
          period: ReportPeriod.CUSTOM,
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        })
        .expect(200);

      expect(response.body).toHaveProperty('url');
    });

    it('debe exportar reporte filtrado por usuario', async () => {
      if (!testUserId) {
        return; // Skip si no hay usuario de prueba
      }

      const response = await request(app.getHttpServer())
        .post('/analytics/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reportType: ReportType.MEDICATION_ADHERENCE,
          format: ExportFormat.PDF,
          period: ReportPeriod.MONTHLY,
          userId: testUserId,
        })
        .expect(200);

      expect(response.body).toHaveProperty('url');
    });

    it('debe rechazar reportType inválido', () => {
      return request(app.getHttpServer())
        .post('/analytics/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reportType: 'INVALID_TYPE',
          format: ExportFormat.PDF,
        })
        .expect(400);
    });

    it('debe rechazar formato de exportación inválido', () => {
      return request(app.getHttpServer())
        .post('/analytics/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reportType: ReportType.MEDICATION_ADHERENCE,
          format: 'INVALID_FORMAT',
        })
        .expect(400);
    });

    it('debe rechazar campos faltantes (reportType requerido)', () => {
      return request(app.getHttpServer())
        .post('/analytics/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          format: ExportFormat.PDF,
        })
        .expect(400);
    });

    it('debe rechazar campos faltantes (format requerido)', () => {
      return request(app.getHttpServer())
        .post('/analytics/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reportType: ReportType.MEDICATION_ADHERENCE,
        })
        .expect(400);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .post('/analytics/export')
        .send({
          reportType: ReportType.MEDICATION_ADHERENCE,
          format: ExportFormat.PDF,
        })
        .expect(401);
    });
  });

  describe('GET /analytics/timeseries', () => {
    it('debe retornar datos de series temporales para batería', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/timeseries')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          metric: 'battery_level',
          interval: '1h',
        })
        .expect(200);

      expect(response.body).toHaveProperty('metric');
      expect(response.body).toHaveProperty('data');
      expect(response.body.metric).toBe('battery_level');
    });

    it('debe retornar datos filtrados por dispositivo específico', async () => {
      if (!testDeviceId) {
        return; // Skip si no hay dispositivo de prueba
      }

      const response = await request(app.getHttpServer())
        .get('/analytics/timeseries')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          metric: 'signal_strength',
          deviceId: testDeviceId,
          interval: '30m',
        })
        .expect(200);

      expect(response.body).toHaveProperty('metric');
      expect(response.body).toHaveProperty('data');
    });

    it('debe retornar datos con rango de fechas personalizado', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/timeseries')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          metric: 'temperature',
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2024-01-31T23:59:59.999Z',
          interval: '1d',
        })
        .expect(200);

      expect(response.body).toHaveProperty('metric');
      expect(response.body).toHaveProperty('data');
      expect(response.body.metric).toBe('temperature');
    });

    it('debe retornar datos con intervalo de 15 minutos', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/timeseries')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          metric: 'heart_rate',
          interval: '15m',
        })
        .expect(200);

      expect(response.body).toHaveProperty('metric');
      expect(response.body).toHaveProperty('data');
    });

    it('debe rechazar métrica faltante (campo requerido)', () => {
      return request(app.getHttpServer())
        .get('/analytics/timeseries')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ interval: '1h' })
        .expect(400);
    });

    it('debe rechazar deviceId inválido (no UUID)', () => {
      return request(app.getHttpServer())
        .get('/analytics/timeseries')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          metric: 'battery_level',
          deviceId: 'invalid-uuid',
        })
        .expect(400);
    });

    it('debe rechazar formato de fecha inválido', () => {
      return request(app.getHttpServer())
        .get('/analytics/timeseries')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          metric: 'battery_level',
          startDate: 'invalid-date',
        })
        .expect(400);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .get('/analytics/timeseries')
        .query({ metric: 'battery_level' })
        .expect(401);
    });
  });
});
