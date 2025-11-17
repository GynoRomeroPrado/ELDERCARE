/**
 * Tests E2E para Módulo de Dispositivos IoT
 * Cobertura completa de todos los endpoints con validación rigurosa
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('DevicesController (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let elderToken: string;
  let createdDeviceId: string;
  let elderUserId: string;

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
    elderUserId = elderLogin.body.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /devices - Crear Dispositivo', () => {
    it('debe crear un dispositivo como admin', () => {
      return request(app.getHttpServer())
        .post('/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ownerId: elderUserId,
          deviceType: 'PILL_DISPENSER',
          serialNumber: 'TEST-PILL-001',
          name: 'Test Pill Dispenser',
          firmwareVersion: '1.0.0',
        })
        .expect(201)
        .then((response) => {
          expect(response.body).toHaveProperty('id');
          expect(response.body.serialNumber).toBe('TEST-PILL-001');
          expect(response.body.status).toBe('PROVISIONING');
          createdDeviceId = response.body.id;
        });
    });

    it('debe rechazar número de serie duplicado', () => {
      return request(app.getHttpServer())
        .post('/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ownerId: elderUserId,
          deviceType: 'PILL_DISPENSER',
          serialNumber: 'TEST-PILL-001',
          name: 'Duplicate Device',
          firmwareVersion: '1.0.0',
        })
        .expect(409);
    });

    it('debe rechazar tipo de dispositivo inválido', () => {
      return request(app.getHttpServer())
        .post('/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ownerId: elderUserId,
          deviceType: 'INVALID_TYPE',
          serialNumber: 'TEST-INVALID-001',
          name: 'Invalid Device',
          firmwareVersion: '1.0.0',
        })
        .expect(400);
    });

    it('debe rechazar propietario inexistente', () => {
      return request(app.getHttpServer())
        .post('/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ownerId: '00000000-0000-0000-0000-000000000000',
          deviceType: 'PILL_DISPENSER',
          serialNumber: 'TEST-NOOWNER-001',
          name: 'No Owner Device',
          firmwareVersion: '1.0.0',
        })
        .expect(400);
    });

    it('debe rechazar creación por usuario no admin', () => {
      return request(app.getHttpServer())
        .post('/devices')
        .set('Authorization', `Bearer ${elderToken}`)
        .send({
          ownerId: elderUserId,
          deviceType: 'PILL_DISPENSER',
          serialNumber: 'TEST-UNAUTHORIZED-001',
          name: 'Unauthorized Device',
          firmwareVersion: '1.0.0',
        })
        .expect(403);
    });

    it('debe rechazar campos faltantes', () => {
      return request(app.getHttpServer())
        .post('/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          deviceType: 'PILL_DISPENSER',
          // Falta ownerId, serialNumber, etc.
        })
        .expect(400);
    });
  });

  describe('GET /devices - Listar Dispositivos', () => {
    it('debe listar todos los dispositivos', () => {
      return request(app.getHttpServer())
        .get('/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('data');
          expect(response.body).toHaveProperty('total');
          expect(Array.isArray(response.body.data)).toBe(true);
        });
    });

    it('debe filtrar por tipo de dispositivo', () => {
      return request(app.getHttpServer())
        .get('/devices?deviceType=PILL_DISPENSER')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .then((response) => {
          expect(
            response.body.data.every((d: any) => d.deviceType === 'PILL_DISPENSER'),
          ).toBe(true);
        });
    });

    it('debe filtrar por propietario', () => {
      return request(app.getHttpServer())
        .get(`/devices?ownerId=${elderUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .then((response) => {
          expect(
            response.body.data.every((d: any) => d.ownerId === elderUserId),
          ).toBe(true);
        });
    });

    it('debe filtrar por estado', () => {
      return request(app.getHttpServer())
        .get('/devices?status=PROVISIONING')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('debe paginar resultados correctamente', () => {
      return request(app.getHttpServer())
        .get('/devices?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.data.length).toBeLessThanOrEqual(5);
          expect(response.body.page).toBe(1);
        });
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .get('/devices')
        .expect(401);
    });
  });

  describe('GET /devices/:id - Obtener Dispositivo', () => {
    it('debe obtener dispositivo por ID', () => {
      return request(app.getHttpServer())
        .get(`/devices/${createdDeviceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.id).toBe(createdDeviceId);
        });
    });

    it('debe retornar 404 para dispositivo inexistente', () => {
      return request(app.getHttpServer())
        .get('/devices/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('debe rechazar formato UUID inválido', () => {
      return request(app.getHttpServer())
        .get('/devices/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('PUT /devices/:id - Actualizar Dispositivo', () => {
    it('debe actualizar dispositivo como admin', () => {
      return request(app.getHttpServer())
        .put(`/devices/${createdDeviceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Pill Dispenser',
          status: 'ACTIVE',
        })
        .expect(200)
        .then((response) => {
          expect(response.body.name).toBe('Updated Pill Dispenser');
          expect(response.body.status).toBe('ACTIVE');
        });
    });

    it('debe rechazar estado inválido', () => {
      return request(app.getHttpServer())
        .put(`/devices/${createdDeviceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'INVALID_STATUS',
        })
        .expect(400);
    });

    it('debe rechazar actualización por no admin', () => {
      return request(app.getHttpServer())
        .put(`/devices/${createdDeviceId}`)
        .set('Authorization', `Bearer ${elderToken}`)
        .send({
          name: 'Unauthorized Update',
        })
        .expect(403);
    });
  });

  describe('POST /devices/:id/heartbeat - Heartbeat', () => {
    it('debe registrar heartbeat', () => {
      return request(app.getHttpServer())
        .post(`/devices/${createdDeviceId}/heartbeat`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201)
        .then((response) => {
          expect(response.body).toHaveProperty('message');
        });
    });

    it('debe actualizar timestamp de lastHeartbeat', async () => {
      await request(app.getHttpServer())
        .post(`/devices/${createdDeviceId}/heartbeat`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      const device = await request(app.getHttpServer())
        .get(`/devices/${createdDeviceId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(device.body.lastHeartbeat).toBeTruthy();
      const lastHeartbeat = new Date(device.body.lastHeartbeat);
      const now = new Date();
      const diffSeconds = (now.getTime() - lastHeartbeat.getTime()) / 1000;
      expect(diffSeconds).toBeLessThan(5);
    });
  });

  describe('POST /devices/:id/telemetry - Telemetría', () => {
    it('debe registrar datos de telemetría completos', () => {
      return request(app.getHttpServer())
        .post(`/devices/${createdDeviceId}/telemetry`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          timestamp: new Date().toISOString(),
          batteryLevel: 85,
          signalStrength: -45,
          temperature: 22.5,
          humidity: 45,
        })
        .expect(201);
    });

    it('debe actualizar healthStatus basado en batería crítica', async () => {
      await request(app.getHttpServer())
        .post(`/devices/${createdDeviceId}/telemetry`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          timestamp: new Date().toISOString(),
          batteryLevel: 15,
        });

      const device = await request(app.getHttpServer())
        .get(`/devices/${createdDeviceId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(device.body.healthStatus).toBe('CRITICAL');
      expect(device.body.batteryLevel).toBe(15);
    });

    it('debe actualizar healthStatus basado en batería baja', async () => {
      await request(app.getHttpServer())
        .post(`/devices/${createdDeviceId}/telemetry`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          timestamp: new Date().toISOString(),
          batteryLevel: 35,
        });

      const device = await request(app.getHttpServer())
        .get(`/devices/${createdDeviceId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(device.body.healthStatus).toBe('WARNING');
    });

    it('debe rechazar nivel de batería inválido (>100)', () => {
      return request(app.getHttpServer())
        .post(`/devices/${createdDeviceId}/telemetry`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          timestamp: new Date().toISOString(),
          batteryLevel: 150,
        })
        .expect(400);
    });

    it('debe rechazar valores negativos', () => {
      return request(app.getHttpServer())
        .post(`/devices/${createdDeviceId}/telemetry`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          timestamp: new Date().toISOString(),
          batteryLevel: -10,
        })
        .expect(400);
    });

    it('debe rechazar timestamp inválido', () => {
      return request(app.getHttpServer())
        .post(`/devices/${createdDeviceId}/telemetry`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          timestamp: 'invalid-date',
          batteryLevel: 85,
        })
        .expect(400);
    });
  });

  describe('POST /devices/:id/firmware-update - Actualización Firmware', () => {
    it('debe iniciar actualización de firmware como admin', () => {
      return request(app.getHttpServer())
        .post(`/devices/${createdDeviceId}/firmware-update`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          version: '1.1.0',
          url: 'https://firmware.eldercare.com/pill-dispenser/1.1.0.bin',
        })
        .expect(200);
    });

    it('debe rechazar intento de downgrade', () => {
      return request(app.getHttpServer())
        .post(`/devices/${createdDeviceId}/firmware-update`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          version: '0.9.0',
          url: 'https://firmware.eldercare.com/pill-dispenser/0.9.0.bin',
        })
        .expect(400);
    });

    it('debe rechazar URL inválida', () => {
      return request(app.getHttpServer())
        .post(`/devices/${createdDeviceId}/firmware-update`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          version: '1.2.0',
          url: 'not-a-valid-url',
        })
        .expect(400);
    });

    it('debe rechazar actualización por no admin', () => {
      return request(app.getHttpServer())
        .post(`/devices/${createdDeviceId}/firmware-update`)
        .set('Authorization', `Bearer ${elderToken}`)
        .send({
          version: '1.1.0',
          url: 'https://firmware.eldercare.com/pill-dispenser/1.1.0.bin',
        })
        .expect(403);
    });
  });

  describe('POST /devices/:id/firmware-confirm - Confirmar Firmware', () => {
    it('debe confirmar actualización exitosa', () => {
      return request(app.getHttpServer())
        .post(`/devices/${createdDeviceId}/firmware-confirm`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          success: true,
        })
        .expect(200);
    });

    it('debe registrar actualización fallida', () => {
      return request(app.getHttpServer())
        .post(`/devices/${createdDeviceId}/firmware-confirm`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          success: false,
          error: 'Checksum mismatch',
        })
        .expect(200);
    });
  });

  describe('GET /devices/:id/health - Estado de Salud', () => {
    it('debe obtener estado de salud del dispositivo', () => {
      return request(app.getHttpServer())
        .get(`/devices/${createdDeviceId}/health`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('healthStatus');
          expect(response.body).toHaveProperty('batteryLevel');
          expect(response.body).toHaveProperty('lastHeartbeat');
        });
    });
  });

  describe('GET /devices/statistics - Estadísticas', () => {
    it('debe obtener estadísticas completas', () => {
      return request(app.getHttpServer())
        .get('/devices/statistics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('total');
          expect(response.body).toHaveProperty('byType');
          expect(response.body).toHaveProperty('byStatus');
          expect(response.body).toHaveProperty('byHealth');
        });
    });

    it('debe incluir conteos correctos', async () => {
      const stats = await request(app.getHttpServer())
        .get('/devices/statistics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(typeof stats.body.total).toBe('number');
      expect(stats.body.total).toBeGreaterThan(0);
      expect(typeof stats.body.byType).toBe('object');
    });
  });

  describe('GET /devices/offline - Dispositivos Offline', () => {
    it('debe obtener dispositivos offline', () => {
      return request(app.getHttpServer())
        .get('/devices/offline')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
        });
    });
  });

  describe('DELETE /devices/:id - Eliminar Dispositivo', () => {
    it('debe eliminar dispositivo como admin', () => {
      return request(app.getHttpServer())
        .delete(`/devices/${createdDeviceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('no debe encontrar dispositivo eliminado', () => {
      return request(app.getHttpServer())
        .get(`/devices/${createdDeviceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('debe rechazar eliminación por no admin', async () => {
      // Crear dispositivo temporal
      const tempDevice = await request(app.getHttpServer())
        .post('/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ownerId: elderUserId,
          deviceType: 'FALL_SENSOR',
          serialNumber: 'TEMP-DELETE-TEST',
          firmwareVersion: '1.0.0',
        });

      return request(app.getHttpServer())
        .delete(`/devices/${tempDevice.body.id}`)
        .set('Authorization', `Bearer ${elderToken}`)
        .expect(403);
    });
  });
});
