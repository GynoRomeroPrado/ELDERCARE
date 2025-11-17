/**
 * Devices E2E Tests
 * Tests device registration, management, and telemetry
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Devices (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let deviceId: string;

  const testUser = {
    email: 'devices-test@eldercare.com',
    password: 'Test123!@#',
    firstName: 'Bob',
    lastName: 'Johnson',
    role: 'FAMILY_MEMBER',
  };

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

    app.setGlobalPrefix('api/v1');

    await app.init();

    // Register test user
    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser);

    accessToken = registerRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/devices', () => {
    it('should register a new pill dispenser device', () => {
      return request(app.getHttpServer())
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          deviceType: 'PILL_DISPENSER',
          serialNumber: `PILL-TEST-${Date.now()}`,
          firmwareVersion: '1.0.0',
          location: 'Kitchen Counter',
          metadata: {
            compartments: 28,
            model: 'ELDERCARE-PD-v1',
          },
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.deviceType).toBe('PILL_DISPENSER');
          expect(res.body.status).toBe('PROVISIONING');

          deviceId = res.body.id;
        });
    });

    it('should register a fall sensor device', () => {
      return request(app.getHttpServer())
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          deviceType: 'FALL_SENSOR',
          serialNumber: `FALL-TEST-${Date.now()}`,
          firmwareVersion: '2.1.0',
          location: 'Living Room',
          metadata: {
            radarFrequency: '60GHz',
            coverage: '500sqft',
          },
        })
        .expect(201);
    });

    it('should fail with duplicate serial number', async () => {
      const serialNumber = `DUPLICATE-${Date.now()}`;

      // Register first device
      await request(app.getHttpServer())
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          deviceType: 'PILL_DISPENSER',
          serialNumber,
          firmwareVersion: '1.0.0',
        });

      // Try to register duplicate
      return request(app.getHttpServer())
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          deviceType: 'PILL_DISPENSER',
          serialNumber,
          firmwareVersion: '1.0.0',
        })
        .expect(409);
    });

    it('should fail with invalid device type', () => {
      return request(app.getHttpServer())
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          deviceType: 'INVALID_TYPE',
          serialNumber: `TEST-${Date.now()}`,
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/devices', () => {
    it('should get all user devices', () => {
      return request(app.getHttpServer())
        .get('/api/v1/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
        });
    });

    it('should filter by device type', () => {
      return request(app.getHttpServer())
        .get('/api/v1/devices?type=PILL_DISPENSER')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          res.body.data.forEach((device) => {
            expect(device.deviceType).toBe('PILL_DISPENSER');
          });
        });
    });

    it('should filter by status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/devices?status=ACTIVE')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('GET /api/v1/devices/:id', () => {
    it('should get a specific device', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/devices/${deviceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(deviceId);
          expect(res.body).toHaveProperty('deviceType');
          expect(res.body).toHaveProperty('serialNumber');
        });
    });

    it('should fail with non-existent device', () => {
      return request(app.getHttpServer())
        .get('/api/v1/devices/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/v1/devices/:id', () => {
    it('should update device location', () => {
      return request(app.getHttpServer())
        .put(`/api/v1/devices/${deviceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          location: 'Bedroom Nightstand',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.location).toBe('Bedroom Nightstand');
        });
    });

    it('should update device status', () => {
      return request(app.getHttpServer())
        .put(`/api/v1/devices/${deviceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: 'ACTIVE',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ACTIVE');
        });
    });
  });

  describe('POST /api/v1/devices/:id/telemetry', () => {
    it('should submit telemetry data', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/devices/${deviceId}/telemetry`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          timestamp: new Date().toISOString(),
          batteryLevel: 85,
          signalStrength: -45,
          temperature: 22.5,
          humidity: 45,
          metadata: {
            uptime: 86400,
            freeMemory: 45000,
          },
        })
        .expect(201);
    });

    it('should validate telemetry data types', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/devices/${deviceId}/telemetry`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          timestamp: new Date().toISOString(),
          batteryLevel: 'invalid', // Should be number
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/devices/:id/health', () => {
    it('should get device health status', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/devices/${deviceId}/health`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('lastHeartbeat');
          expect(res.body).toHaveProperty('batteryLevel');
          expect(res.body).toHaveProperty('signalStrength');
        });
    });
  });

  describe('DELETE /api/v1/devices/:id', () => {
    it('should deactivate a device', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/devices/${deviceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should fail to deactivate non-existent device', () => {
      return request(app.getHttpServer())
        .delete('/api/v1/devices/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
