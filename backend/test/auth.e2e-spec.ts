/**
 * Authentication E2E Tests
 * Tests user registration, login, MFA, and token refresh
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getConnection } from 'typeorm';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;

  const testUser = {
    email: 'test@eldercare.com',
    password: 'Test123!@#',
    firstName: 'John',
    lastName: 'Doe',
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

    // Clean up test data
    const connection = getConnection();
    await connection.query('DELETE FROM users WHERE email = $1', [testUser.email]);
  });

  afterAll(async () => {
    // Cleanup
    const connection = getConnection();
    await connection.query('DELETE FROM users WHERE email = $1', [testUser.email]);
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('user');
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body.user.email).toBe(testUser.email);
          expect(res.body.user).not.toHaveProperty('password');

          accessToken = res.body.accessToken;
          refreshToken = res.body.refreshToken;
        });
    });

    it('should fail with duplicate email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toContain('already exists');
        });
    });

    it('should fail with invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...testUser, email: 'invalid-email' })
        .expect(400);
    });

    it('should fail with weak password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...testUser, email: 'test2@eldercare.com', password: '123' })
        .expect(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with correct credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('user');

          accessToken = res.body.accessToken;
          refreshToken = res.body.refreshToken;
        });
    });

    it('should fail with incorrect password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should fail with non-existent user', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@eldercare.com',
          password: 'Password123!',
        })
        .expect(401);
    });
  });

  describe('GET /api/v1/auth/profile', () => {
    it('should get user profile with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.email).toBe(testUser.email);
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('should fail without token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .expect(401);
    });

    it('should fail with invalid token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh access token with valid refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });

    it('should fail with invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid_refresh_token' })
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('MFA Flow', () => {
    it('should enable MFA', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/mfa/enable')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('qrCode');
          expect(res.body).toHaveProperty('secret');
        });
    });

    it('should verify MFA code', () => {
      const testCode = '123456'; // Mock code
      return request(app.getHttpServer())
        .post('/api/v1/auth/mfa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code: testCode })
        .expect(200);
    });
  });

  describe('Password Reset Flow', () => {
    it('should request password reset', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/password/reset-request')
        .send({ email: testUser.email })
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toContain('sent');
        });
    });

    it('should fail reset with invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/password/reset-request')
        .send({ email: 'nonexistent@eldercare.com' })
        .expect(404);
    });
  });
});
