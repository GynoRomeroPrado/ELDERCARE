/**
 * Fall Detection E2E Tests
 * Tests fall event creation, retrieval, acknowledgment, and emergency response
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getConnection } from 'typeorm';

describe('Fall Detection (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let deviceId: string;
  let fallEventId: string;

  const testUser = {
    email: 'falls-test@eldercare.com',
    password: 'Test123!@#',
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'ELDER',
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

    // Register test user and create device
    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser);

    accessToken = registerRes.body.accessToken;

    // Create a fall sensor device
    const deviceRes = await request(app.getHttpServer())
      .post('/api/v1/devices')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        deviceType: 'FALL_SENSOR',
        serialNumber: `FALL-TEST-${Date.now()}`,
        location: 'Living Room',
      });

    deviceId = deviceRes.body.id;
  });

  afterAll(async () => {
    // Cleanup
    const connection = getConnection();
    await connection.query('DELETE FROM users WHERE email = $1', [testUser.email]);
    await app.close();
  });

  describe('POST /api/v1/falls', () => {
    it('should create a fall event successfully', () => {
      return request(app.getHttpServer())
        .post('/api/v1/falls')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          deviceId,
          detectedAt: new Date().toISOString(),
          severity: 'HIGH',
          confidence: 0.95,
          sensorData: {
            radarPointCloud: {
              points: 150,
              avgVelocity: 2.5,
              impactForce: 8.2,
            },
            location: {
              x: 3.5,
              y: 2.1,
              z: 0.0,
            },
          },
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.severity).toBe('HIGH');
          expect(res.body.confidence).toBe(0.95);
          expect(res.body.status).toBe('PENDING');

          fallEventId = res.body.id;
        });
    });

    it('should fail without required fields', () => {
      return request(app.getHttpServer())
        .post('/api/v1/falls')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          deviceId,
          // Missing detectedAt, severity, confidence
        })
        .expect(400);
    });

    it('should fail with invalid severity', () => {
      return request(app.getHttpServer())
        .post('/api/v1/falls')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          deviceId,
          detectedAt: new Date().toISOString(),
          severity: 'INVALID_SEVERITY',
          confidence: 0.95,
        })
        .expect(400);
    });

    it('should fail with confidence out of range', () => {
      return request(app.getHttpServer())
        .post('/api/v1/falls')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          deviceId,
          detectedAt: new Date().toISOString(),
          severity: 'MEDIUM',
          confidence: 1.5, // > 1.0
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/falls', () => {
    it('should get all fall events', () => {
      return request(app.getHttpServer())
        .get('/api/v1/falls')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page');
        });
    });

    it('should filter by severity', () => {
      return request(app.getHttpServer())
        .get('/api/v1/falls?severity=HIGH')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
          res.body.data.forEach((fall) => {
            expect(fall.severity).toBe('HIGH');
          });
        });
    });

    it('should filter by date range', () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      return request(app.getHttpServer())
        .get(`/api/v1/falls?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should support pagination', () => {
      return request(app.getHttpServer())
        .get('/api/v1/falls?page=1&limit=10')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.page).toBe(1);
          expect(res.body.limit).toBe(10);
        });
    });
  });

  describe('GET /api/v1/falls/:id', () => {
    it('should get a specific fall event', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/falls/${fallEventId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(fallEventId);
          expect(res.body.severity).toBe('HIGH');
        });
    });

    it('should fail with invalid ID', () => {
      return request(app.getHttpServer())
        .get('/api/v1/falls/invalid-uuid')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should fail with non-existent ID', () => {
      return request(app.getHttpServer())
        .get('/api/v1/falls/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/v1/falls/:id/acknowledge', () => {
    it('should acknowledge a fall event', () => {
      return request(app.getHttpServer())
        .put(`/api/v1/falls/${fallEventId}/acknowledge`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          notes: 'Patient is fine, false alarm',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ACKNOWLEDGED');
          expect(res.body.acknowledgedAt).toBeDefined();
        });
    });

    it('should fail to acknowledge already acknowledged event', () => {
      return request(app.getHttpServer())
        .put(`/api/v1/falls/${fallEventId}/acknowledge`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          notes: 'Trying to acknowledge again',
        })
        .expect(400);
    });
  });

  describe('PUT /api/v1/falls/:id/false-alarm', () => {
    let newFallEventId: string;

    beforeAll(async () => {
      // Create another fall event for false alarm test
      const res = await request(app.getHttpServer())
        .post('/api/v1/falls')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          deviceId,
          detectedAt: new Date().toISOString(),
          severity: 'LOW',
          confidence: 0.70,
        });

      newFallEventId = res.body.id;
    });

    it('should mark fall event as false alarm', () => {
      return request(app.getHttpServer())
        .put(`/api/v1/falls/${newFallEventId}/false-alarm`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          reason: 'Pet triggered sensor',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('FALSE_ALARM');
          expect(res.body.falseAlarm).toBe(true);
        });
    });
  });

  describe('POST /api/v1/falls/:id/emergency', () => {
    let emergencyFallEventId: string;

    beforeAll(async () => {
      // Create a HIGH severity fall for emergency test
      const res = await request(app.getHttpServer())
        .post('/api/v1/falls')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          deviceId,
          detectedAt: new Date().toISOString(),
          severity: 'HIGH',
          confidence: 0.98,
        });

      emergencyFallEventId = res.body.id;
    });

    it('should call emergency services', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/falls/${emergencyFallEventId}/emergency`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          contactEmergencyServices: true,
          notes: 'Patient unresponsive',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.emergencyServicesCalled).toBe(true);
          expect(res.body.status).toBe('EMERGENCY');
        });
    });
  });

  describe('GET /api/v1/falls/stats/summary', () => {
    it('should get fall statistics', () => {
      return request(app.getHttpServer())
        .get('/api/v1/falls/stats/summary?days=30')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalFalls');
          expect(res.body).toHaveProperty('severityBreakdown');
          expect(res.body).toHaveProperty('falseAlarmRate');
          expect(res.body).toHaveProperty('averageResponseTime');
        });
    });

    it('should get statistics for custom date range', () => {
      return request(app.getHttpServer())
        .get('/api/v1/falls/stats/summary?days=7')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });
});
