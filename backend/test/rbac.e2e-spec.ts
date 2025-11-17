/**
 * Tests de Integración para Sistema RBAC
 * Verifica control de acceso basado en roles y permisos
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { UserRole } from '../src/modules/users/dto/users.dto';

describe('RBAC Integration Tests (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let healthcareToken: string;
  let caregiverToken: string;
  let familyToken: string;
  let elderToken: string;
  let adminUserId: string;
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

    // Login como diferentes roles
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@eldercare.com',
        password: 'Admin123!',
      });

    adminToken = adminLogin.body.accessToken;
    adminUserId = adminLogin.body.user?.id;

    const healthcareLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'healthcare@eldercare.com',
        password: 'Healthcare123!',
      });

    healthcareToken = healthcareLogin.body.accessToken;

    const caregiverLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'caregiver@eldercare.com',
        password: 'Caregiver123!',
      });

    caregiverToken = caregiverLogin.body.accessToken;

    const familyLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'family@eldercare.com',
        password: 'Family123!',
      });

    familyToken = familyLogin.body.accessToken;

    const elderLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'elder@eldercare.com',
        password: 'Elder123!',
      });

    elderToken = elderLogin.body.accessToken;
    elderUserId = elderLogin.body.user?.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Endpoints Públicos - @Public()', () => {
    it('debe permitir acceso sin autenticación a /examples/public', () => {
      return request(app.getHttpServer())
        .get('/examples/public')
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('message');
          expect(response.body.message).toContain('público');
        });
    });

    it('debe permitir registro de usuario sin autenticación', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `test-${Date.now()}@eldercare.com`,
          password: 'Test123!',
          firstName: 'Test',
          lastName: 'User',
          role: UserRole.FAMILY_MEMBER,
        })
        .expect(201);
    });
  });

  describe('Endpoints Protegidos - Requieren Autenticación', () => {
    it('debe permitir acceso con token válido a /examples/protected', () => {
      return request(app.getHttpServer())
        .get('/examples/protected')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('user');
          expect(response.body.user).toHaveProperty('email');
        });
    });

    it('debe rechazar acceso sin token a /examples/protected', () => {
      return request(app.getHttpServer())
        .get('/examples/protected')
        .expect(401);
    });

    it('debe rechazar token inválido', () => {
      return request(app.getHttpServer())
        .get('/examples/protected')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Control de Acceso por Rol - @Roles()', () => {
    it('debe permitir acceso a ADMIN en endpoint admin-only', () => {
      return request(app.getHttpServer())
        .post('/examples/admin-only')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201)
        .then((response) => {
          expect(response.body).toHaveProperty('message');
          expect(response.body.message).toContain('administradores');
        });
    });

    it('debe rechazar acceso a ELDER en endpoint admin-only', () => {
      return request(app.getHttpServer())
        .post('/examples/admin-only')
        .set('Authorization', `Bearer ${elderToken}`)
        .expect(403);
    });

    it('debe rechazar acceso a FAMILY_MEMBER en endpoint admin-only', () => {
      return request(app.getHttpServer())
        .post('/examples/admin-only')
        .set('Authorization', `Bearer ${familyToken}`)
        .expect(403);
    });

    it('debe rechazar acceso a CAREGIVER en endpoint admin-only', () => {
      return request(app.getHttpServer())
        .post('/examples/admin-only')
        .set('Authorization', `Bearer ${caregiverToken}`)
        .expect(403);
    });
  });

  describe('Control de Acceso Múltiples Roles', () => {
    it('debe permitir acceso a ADMIN en medical-staff', () => {
      return request(app.getHttpServer())
        .get('/examples/medical-staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('debe permitir acceso a HEALTHCARE_PROVIDER en medical-staff', () => {
      return request(app.getHttpServer())
        .get('/examples/medical-staff')
        .set('Authorization', `Bearer ${healthcareToken}`)
        .expect(200);
    });

    it('debe permitir acceso a CAREGIVER en medical-staff', () => {
      return request(app.getHttpServer())
        .get('/examples/medical-staff')
        .set('Authorization', `Bearer ${caregiverToken}`)
        .expect(200);
    });

    it('debe rechazar acceso a ELDER en medical-staff', () => {
      return request(app.getHttpServer())
        .get('/examples/medical-staff')
        .set('Authorization', `Bearer ${elderToken}`)
        .expect(403);
    });

    it('debe rechazar acceso a FAMILY_MEMBER en medical-staff', () => {
      return request(app.getHttpServer())
        .get('/examples/medical-staff')
        .set('Authorization', `Bearer ${familyToken}`)
        .expect(403);
    });
  });

  describe('Control de Acceso por Permisos - @RequirePermissions()', () => {
    it('debe permitir acceso a ADMIN con permiso analytics:view', () => {
      return request(app.getHttpServer())
        .get('/examples/analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.hasPermission).toBe(true);
        });
    });

    it('debe permitir exportar reportes con permisos necesarios', () => {
      return request(app.getHttpServer())
        .post('/examples/analytics/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('exportedBy');
        });
    });
  });

  describe('Verificación de Propietario', () => {
    it('debe permitir a ADMIN actualizar cualquier perfil', async () => {
      if (!elderUserId) return;

      return request(app.getHttpServer())
        .put(`/examples/profile/${elderUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated' })
        .expect(200)
        .then((response) => {
          expect(response.body.message).toContain('administrador');
        });
    });

    it('debe permitir a usuario actualizar su propio perfil', async () => {
      if (!elderUserId) return;

      return request(app.getHttpServer())
        .put(`/examples/profile/${elderUserId}`)
        .set('Authorization', `Bearer ${elderToken}`)
        .send({ name: 'Updated' })
        .expect(200);
    });

    it('debe rechazar actualización de perfil ajeno sin ser admin', async () => {
      if (!elderUserId) return;

      return request(app.getHttpServer())
        .put(`/examples/profile/${elderUserId}`)
        .set('Authorization', `Bearer ${familyToken}`)
        .send({ name: 'Updated' })
        .expect(403);
    });
  });

  describe('Lógica Condicional por Rol', () => {
    it('debe retornar todos los usuarios para ADMIN', () => {
      return request(app.getHttpServer())
        .get('/examples/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.message).toContain('todos los usuarios');
          expect(response.body.count).toBeGreaterThan(50);
        });
    });

    it('debe retornar pacientes asignados para HEALTHCARE_PROVIDER', () => {
      return request(app.getHttpServer())
        .get('/examples/users')
        .set('Authorization', `Bearer ${healthcareToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.message).toContain('pacientes asignados');
        });
    });

    it('debe retornar familia para FAMILY_MEMBER', () => {
      return request(app.getHttpServer())
        .get('/examples/users')
        .set('Authorization', `Bearer ${familyToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.message).toContain('familia');
        });
    });

    it('debe retornar familia para CAREGIVER', () => {
      return request(app.getHttpServer())
        .get('/examples/users')
        .set('Authorization', `Bearer ${caregiverToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.message).toContain('familia');
        });
    });
  });

  describe('Dashboard Personalizado por Rol', () => {
    it('debe retornar dashboard de admin para ADMIN', () => {
      return request(app.getHttpServer())
        .get('/examples/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.dashboard.type).toBe('admin');
          expect(response.body.dashboard.widgets).toContain('system-health');
        });
    });

    it('debe retornar dashboard de healthcare para HEALTHCARE_PROVIDER', () => {
      return request(app.getHttpServer())
        .get('/examples/dashboard')
        .set('Authorization', `Bearer ${healthcareToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.dashboard.type).toBe('healthcare');
          expect(response.body.dashboard.widgets).toContain('patients-list');
        });
    });

    it('debe retornar dashboard de caregiver para CAREGIVER', () => {
      return request(app.getHttpServer())
        .get('/examples/dashboard')
        .set('Authorization', `Bearer ${caregiverToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.dashboard.type).toBe('caregiver');
          expect(response.body.dashboard.widgets).toContain('elder-status');
        });
    });

    it('debe retornar dashboard de family para FAMILY_MEMBER', () => {
      return request(app.getHttpServer())
        .get('/examples/dashboard')
        .set('Authorization', `Bearer ${familyToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.dashboard.type).toBe('family');
          expect(response.body.dashboard.widgets).toContain('chat');
        });
    });

    it('debe retornar dashboard de elder para ELDER', () => {
      return request(app.getHttpServer())
        .get('/examples/dashboard')
        .set('Authorization', `Bearer ${elderToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.dashboard.type).toBe('elder');
          expect(response.body.dashboard.widgets).toContain('my-medications');
        });
    });
  });

  describe('Combinación de Roles y Permisos', () => {
    it('debe permitir a ADMIN crear medicamento con rol y permiso adecuados', () => {
      return request(app.getHttpServer())
        .post('/examples/medications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Medication',
          dosage: '10mg',
        })
        .expect(201)
        .then((response) => {
          expect(response.body.message).toContain('creado exitosamente');
          expect(response.body.role).toBe(UserRole.ADMIN);
        });
    });

    it('debe permitir a HEALTHCARE_PROVIDER crear medicamento', () => {
      return request(app.getHttpServer())
        .post('/examples/medications')
        .set('Authorization', `Bearer ${healthcareToken}`)
        .send({
          name: 'Test Medication',
          dosage: '10mg',
        })
        .expect(201);
    });

    it('debe rechazar a CAREGIVER crear medicamento (rol correcto pero sin permiso)', () => {
      return request(app.getHttpServer())
        .post('/examples/medications')
        .set('Authorization', `Bearer ${caregiverToken}`)
        .send({
          name: 'Test Medication',
          dosage: '10mg',
        })
        .expect(403);
    });

    it('debe rechazar a ELDER crear medicamento', () => {
      return request(app.getHttpServer())
        .post('/examples/medications')
        .set('Authorization', `Bearer ${elderToken}`)
        .send({
          name: 'Test Medication',
          dosage: '10mg',
        })
        .expect(403);
    });
  });

  describe('Operaciones Críticas con Validaciones Múltiples', () => {
    it('debe permitir a ADMIN responder a caída', () => {
      const fallId = '550e8400-e29b-41d4-a716-446655440000';
      return request(app.getHttpServer())
        .post(`/examples/falls/${fallId}/respond`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'DISPATCHED_EMERGENCY',
          notes: 'Ambulancia enviada',
        })
        .expect(200)
        .then((response) => {
          expect(response.body.message).toContain('registrada');
          expect(response.body.fallId).toBe(fallId);
        });
    });

    it('debe permitir a HEALTHCARE_PROVIDER responder a caída', () => {
      const fallId = '550e8400-e29b-41d4-a716-446655440000';
      return request(app.getHttpServer())
        .post(`/examples/falls/${fallId}/respond`)
        .set('Authorization', `Bearer ${healthcareToken}`)
        .send({
          action: 'CALLED_PATIENT',
          notes: 'Paciente responde bien',
        })
        .expect(200);
    });

    it('debe rechazar a CAREGIVER responder a caída (sin permiso fall:respond)', () => {
      const fallId = '550e8400-e29b-41d4-a716-446655440000';
      return request(app.getHttpServer())
        .post(`/examples/falls/${fallId}/respond`)
        .set('Authorization', `Bearer ${caregiverToken}`)
        .send({
          action: 'CHECKED_ON_PATIENT',
        })
        .expect(403);
    });

    it('debe rechazar a FAMILY_MEMBER responder a caída', () => {
      const fallId = '550e8400-e29b-41d4-a716-446655440000';
      return request(app.getHttpServer())
        .post(`/examples/falls/${fallId}/respond`)
        .set('Authorization', `Bearer ${familyToken}`)
        .send({
          action: 'CHECKED_ON_PATIENT',
        })
        .expect(403);
    });
  });

  describe('Extracción de Datos de Usuario - @CurrentUser()', () => {
    it('debe extraer email del usuario autenticado', () => {
      return request(app.getHttpServer())
        .get('/examples/my-email')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('email');
          expect(response.body.email).toContain('@eldercare.com');
        });
    });
  });

  describe('RBAC en Módulos Reales', () => {
    describe('Usuarios - Solo ADMIN puede crear usuarios', () => {
      it('debe permitir a ADMIN crear usuarios', async () => {
        return request(app.getHttpServer())
          .post('/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            email: `test-rbac-${Date.now()}@eldercare.com`,
            password: 'Test123!',
            firstName: 'RBAC',
            lastName: 'Test',
            role: UserRole.FAMILY_MEMBER,
            phone: '+1234567890',
          })
          .expect(201);
      });

      it('debe rechazar a ELDER crear usuarios', () => {
        return request(app.getHttpServer())
          .post('/users')
          .set('Authorization', `Bearer ${elderToken}`)
          .send({
            email: `test-rbac-${Date.now()}@eldercare.com`,
            password: 'Test123!',
            firstName: 'RBAC',
            lastName: 'Test',
            role: UserRole.FAMILY_MEMBER,
          })
          .expect(403);
      });

      it('debe rechazar a FAMILY_MEMBER crear usuarios', () => {
        return request(app.getHttpServer())
          .post('/users')
          .set('Authorization', `Bearer ${familyToken}`)
          .send({
            email: `test-rbac-${Date.now()}@eldercare.com`,
            password: 'Test123!',
            firstName: 'RBAC',
            lastName: 'Test',
            role: UserRole.FAMILY_MEMBER,
          })
          .expect(403);
      });
    });

    describe('Dispositivos - Control de acceso adecuado', () => {
      it('debe permitir a ADMIN listar todos los dispositivos', () => {
        return request(app.getHttpServer())
          .get('/devices')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      });

      it('debe permitir a HEALTHCARE_PROVIDER ver dispositivos', () => {
        return request(app.getHttpServer())
          .get('/devices')
          .set('Authorization', `Bearer ${healthcareToken}`)
          .expect(200);
      });

      it('debe permitir a CAREGIVER ver dispositivos', () => {
        return request(app.getHttpServer())
          .get('/devices')
          .set('Authorization', `Bearer ${caregiverToken}`)
          .expect(200);
      });

      it('debe permitir a FAMILY_MEMBER ver dispositivos de su familia', () => {
        return request(app.getHttpServer())
          .get('/devices')
          .set('Authorization', `Bearer ${familyToken}`)
          .expect(200);
      });
    });

    describe('Analytics - Solo roles autorizados', () => {
      it('debe permitir a ADMIN ver analytics', () => {
        return request(app.getHttpServer())
          .get('/analytics/dashboard')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      });

      it('debe permitir a HEALTHCARE_PROVIDER ver analytics', () => {
        return request(app.getHttpServer())
          .get('/analytics/dashboard')
          .set('Authorization', `Bearer ${healthcareToken}`)
          .expect(200);
      });

      it('debe permitir a ELDER ver su propio dashboard', () => {
        return request(app.getHttpServer())
          .get('/analytics/dashboard')
          .set('Authorization', `Bearer ${elderToken}`)
          .expect(200);
      });
    });
  });
});
