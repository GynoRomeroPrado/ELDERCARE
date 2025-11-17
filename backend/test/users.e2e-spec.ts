/**
 * Tests E2E para Módulo de Usuarios
 * Cobertura completa de todos los endpoints
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { UserRole } from '../src/modules/users/dto/users.dto';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let elderToken: string;
  let createdUserId: string;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /users', () => {
    it('should create a new user as admin', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'test@eldercare.com',
          password: 'Test123!',
          firstName: 'Test',
          lastName: 'User',
          role: UserRole.ELDER,
          phone: '+1234567890',
        })
        .expect(201)
        .then((response) => {
          expect(response.body).toHaveProperty('id');
          expect(response.body.email).toBe('test@eldercare.com');
          expect(response.body).not.toHaveProperty('password');
          createdUserId = response.body.id;
        });
    });

    it('should reject duplicate email', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'test@eldercare.com',
          password: 'Test123!',
          firstName: 'Duplicate',
          lastName: 'User',
          role: UserRole.ELDER,
        })
        .expect(409);
    });

    it('should reject weak password', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'weak@eldercare.com',
          password: 'weak',
          firstName: 'Weak',
          lastName: 'Password',
          role: UserRole.ELDER,
        })
        .expect(400);
    });

    it('should reject invalid email format', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'invalid-email',
          password: 'Valid123!',
          firstName: 'Invalid',
          lastName: 'Email',
          role: UserRole.ELDER,
        })
        .expect(400);
    });

    it('should reject creation without admin token', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${elderToken}`)
        .send({
          email: 'unauthorized@eldercare.com',
          password: 'Test123!',
          firstName: 'Unauthorized',
          lastName: 'User',
          role: UserRole.ELDER,
        })
        .expect(403);
    });

    it('should reject missing required fields', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'incomplete@eldercare.com',
          // Missing password, firstName, lastName, role
        })
        .expect(400);
    });

    it('should reject invalid role', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'invalidrole@eldercare.com',
          password: 'Test123!',
          firstName: 'Invalid',
          lastName: 'Role',
          role: 'INVALID_ROLE',
        })
        .expect(400);
    });
  });

  describe('GET /users', () => {
    it('should list all users as admin', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('data');
          expect(response.body).toHaveProperty('total');
          expect(Array.isArray(response.body.data)).toBe(true);
        });
    });

    it('should filter users by role', () => {
      return request(app.getHttpServer())
        .get('/users?role=ELDER')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.data.every((u: any) => u.role === UserRole.ELDER)).toBe(true);
        });
    });

    it('should paginate results', () => {
      return request(app.getHttpServer())
        .get('/users?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.data.length).toBeLessThanOrEqual(5);
          expect(response.body.page).toBe(1);
          expect(response.body.limit).toBe(5);
        });
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .get('/users')
        .expect(401);
    });
  });

  describe('GET /users/:id', () => {
    it('should get user by id', () => {
      return request(app.getHttpServer())
        .get(`/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.id).toBe(createdUserId);
          expect(response.body.email).toBe('test@eldercare.com');
        });
    });

    it('should return 404 for non-existent user', () => {
      return request(app.getHttpServer())
        .get('/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should reject invalid UUID format', () => {
      return request(app.getHttpServer())
        .get('/users/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('PUT /users/:id', () => {
    it('should update user as admin', () => {
      return request(app.getHttpServer())
        .put(`/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'Name',
          phone: '+9876543210',
        })
        .expect(200)
        .then((response) => {
          expect(response.body.firstName).toBe('Updated');
          expect(response.body.lastName).toBe('Name');
        });
    });

    it('should not allow updating email', () => {
      return request(app.getHttpServer())
        .put(`/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'newemail@eldercare.com',
        })
        .expect(400);
    });

    it('should elder update only their own profile', () => {
      return request(app.getHttpServer())
        .put(`/users/${createdUserId}`)
        .set('Authorization', `Bearer ${elderToken}`)
        .send({
          firstName: 'Unauthorized',
        })
        .expect(403);
    });
  });

  describe('PUT /users/:id/change-password', () => {
    it('should change password with valid credentials', () => {
      return request(app.getHttpServer())
        .put(`/users/${createdUserId}/change-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currentPassword: 'Test123!',
          newPassword: 'NewTest123!',
        })
        .expect(200);
    });

    it('should reject incorrect current password', () => {
      return request(app.getHttpServer())
        .put(`/users/${createdUserId}/change-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewTest123!',
        })
        .expect(400);
    });

    it('should reject weak new password', () => {
      return request(app.getHttpServer())
        .put(`/users/${createdUserId}/change-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currentPassword: 'NewTest123!',
          newPassword: 'weak',
        })
        .expect(400);
    });
  });

  describe('PUT /users/:id/verify-email', () => {
    it('should verify email as admin', () => {
      return request(app.getHttpServer())
        .put(`/users/${createdUserId}/verify-email`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('PUT /users/:id/deactivate', () => {
    it('should deactivate user as admin', () => {
      return request(app.getHttpServer())
        .put(`/users/${createdUserId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('PUT /users/:id/activate', () => {
    it('should activate user as admin', () => {
      return request(app.getHttpServer())
        .put(`/users/${createdUserId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('GET /users/:id/family-members', () => {
    it('should get family members', () => {
      return request(app.getHttpServer())
        .get(`/users/${createdUserId}/family-members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
        });
    });
  });

  describe('GET /users/statistics', () => {
    it('should get user statistics', () => {
      return request(app.getHttpServer())
        .get('/users/statistics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('total');
          expect(response.body).toHaveProperty('byRole');
          expect(response.body).toHaveProperty('active');
          expect(response.body).toHaveProperty('inactive');
        });
    });
  });

  describe('DELETE /users/:id', () => {
    it('should soft delete user as admin', () => {
      return request(app.getHttpServer())
        .delete(`/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should not find deleted user', () => {
      return request(app.getHttpServer())
        .get(`/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should reject deletion by non-admin', () => {
      return request(app.getHttpServer())
        .delete(`/users/${createdUserId}`)
        .set('Authorization', `Bearer ${elderToken}`)
        .expect(403);
    });
  });
});
