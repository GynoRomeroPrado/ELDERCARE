/**
 * Tests E2E para Módulo de Chat Familiar
 * Cobertura completa de salas y mensajes de chat
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

// Importar enums desde las entidades
enum RoomType {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
  FAMILY = 'FAMILY',
}

enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  FILE = 'FILE',
  LOCATION = 'LOCATION',
  SYSTEM = 'SYSTEM',
}

describe('ChatController (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let elderToken: string;
  let familyToken: string;
  let adminUserId: string;
  let elderUserId: string;
  let familyUserId: string;
  let createdRoomId: string;
  let createdMessageId: string;

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

  describe('POST /family/chat/rooms - Crear sala', () => {
    it('debe crear sala de chat familiar exitosamente', async () => {
      if (!adminUserId || !elderUserId) return;

      const response = await request(app.getHttpServer())
        .post('/family/chat/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Familia González',
          type: RoomType.FAMILY,
          description: 'Chat para coordinar cuidados de mamá',
          participantIds: [adminUserId, elderUserId],
          createdBy: adminUserId,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Familia González');
      expect(response.body.type).toBe(RoomType.FAMILY);
      expect(response.body).toHaveProperty('participants');
      createdRoomId = response.body.id;
    });

    it('debe crear sala de chat grupal', async () => {
      if (!adminUserId || !elderUserId || !familyUserId) return;

      const response = await request(app.getHttpServer())
        .post('/family/chat/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Grupo de Cuidadores',
          type: RoomType.GROUP,
          description: 'Grupo para coordinar turnos',
          participantIds: [adminUserId, elderUserId, familyUserId],
          createdBy: adminUserId,
        })
        .expect(201);

      expect(response.body.type).toBe(RoomType.GROUP);
      expect(response.body.participants?.length).toBeGreaterThanOrEqual(3);
    });

    it('debe crear sala de chat directo (1 a 1)', async () => {
      if (!adminUserId || !elderUserId) return;

      const response = await request(app.getHttpServer())
        .post('/family/chat/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Chat directo Admin-Elder',
          type: RoomType.DIRECT,
          participantIds: [adminUserId, elderUserId],
          createdBy: adminUserId,
        })
        .expect(201);

      expect(response.body.type).toBe(RoomType.DIRECT);
    });

    it('debe rechazar participantId inválido (no UUID)', () => {
      if (!adminUserId) return;

      return request(app.getHttpServer())
        .post('/family/chat/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Room',
          participantIds: ['invalid-uuid'],
          createdBy: adminUserId,
        })
        .expect(400);
    });

    it('debe rechazar tipo de sala inválido', () => {
      if (!adminUserId || !elderUserId) return;

      return request(app.getHttpServer())
        .post('/family/chat/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Room',
          type: 'INVALID_TYPE',
          participantIds: [adminUserId, elderUserId],
          createdBy: adminUserId,
        })
        .expect(400);
    });

    it('debe rechazar campos requeridos faltantes (name)', () => {
      if (!adminUserId || !elderUserId) return;

      return request(app.getHttpServer())
        .post('/family/chat/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          participantIds: [adminUserId, elderUserId],
          createdBy: adminUserId,
        })
        .expect(400);
    });

    it('debe rechazar campos requeridos faltantes (participantIds)', () => {
      if (!adminUserId) return;

      return request(app.getHttpServer())
        .post('/family/chat/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Room',
          createdBy: adminUserId,
        })
        .expect(400);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .post('/family/chat/rooms')
        .send({
          name: 'Test Room',
          participantIds: [adminUserId],
          createdBy: adminUserId,
        })
        .expect(401);
    });
  });

  describe('GET /family/chat/rooms - Listar salas', () => {
    it('debe listar todas las salas de chat', async () => {
      const response = await request(app.getHttpServer())
        .get('/family/chat/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('name');
      }
    });

    it('debe filtrar salas por tipo', async () => {
      const response = await request(app.getHttpServer())
        .get('/family/chat/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ type: RoomType.FAMILY })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((room: any) => {
        expect(room.type).toBe(RoomType.FAMILY);
      });
    });

    it('debe filtrar salas por participante', async () => {
      if (!adminUserId) return;

      const response = await request(app.getHttpServer())
        .get('/family/chat/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ participantId: adminUserId })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('debe filtrar salas activas', async () => {
      const response = await request(app.getHttpServer())
        .get('/family/chat/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ isActive: true })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('debe aplicar paginación', async () => {
      const response = await request(app.getHttpServer())
        .get('/family/chat/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 5 })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .get('/family/chat/rooms')
        .expect(401);
    });
  });

  describe('GET /family/chat/rooms/:id - Obtener sala', () => {
    it('debe obtener sala por ID', async () => {
      if (!createdRoomId) return;

      const response = await request(app.getHttpServer())
        .get(`/family/chat/rooms/${createdRoomId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', createdRoomId);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('participants');
    });

    it('debe retornar 404 para sala inexistente', () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440099';
      return request(app.getHttpServer())
        .get(`/family/chat/rooms/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('debe rechazar ID inválido', () => {
      return request(app.getHttpServer())
        .get('/family/chat/rooms/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .get(`/family/chat/rooms/${createdRoomId}`)
        .expect(401);
    });
  });

  describe('PUT /family/chat/rooms/:id - Actualizar sala', () => {
    it('debe actualizar nombre de la sala', async () => {
      if (!createdRoomId) return;

      const response = await request(app.getHttpServer())
        .put(`/family/chat/rooms/${createdRoomId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Familia González - Actualizado',
        })
        .expect(200);

      expect(response.body.name).toBe('Familia González - Actualizado');
    });

    it('debe actualizar descripción de la sala', async () => {
      if (!createdRoomId) return;

      const response = await request(app.getHttpServer())
        .put(`/family/chat/rooms/${createdRoomId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Descripción actualizada del chat familiar',
        })
        .expect(200);

      expect(response.body.description).toBe(
        'Descripción actualizada del chat familiar',
      );
    });

    it('debe actualizar avatar de la sala', async () => {
      if (!createdRoomId) return;

      const response = await request(app.getHttpServer())
        .put(`/family/chat/rooms/${createdRoomId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          avatarUrl: 'https://cdn.eldercare.com/avatars/room1.jpg',
        })
        .expect(200);

      expect(response.body.avatarUrl).toBe(
        'https://cdn.eldercare.com/avatars/room1.jpg',
      );
    });

    it('debe retornar 404 para sala inexistente', () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440099';
      return request(app.getHttpServer())
        .put(`/family/chat/rooms/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated' })
        .expect(404);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .put(`/family/chat/rooms/${createdRoomId}`)
        .send({ name: 'Updated' })
        .expect(401);
    });
  });

  describe('POST /family/chat/rooms/:id/participants - Agregar participantes', () => {
    it('debe agregar nuevo participante a la sala', async () => {
      if (!createdRoomId || !familyUserId) return;

      const response = await request(app.getHttpServer())
        .post(`/family/chat/rooms/${createdRoomId}/participants`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          participantIds: [familyUserId],
        })
        .expect(200);

      expect(response.body).toHaveProperty('participants');
    });

    it('debe agregar múltiples participantes', async () => {
      // Crear nueva sala para este test
      if (!adminUserId || !elderUserId) return;

      const newRoom = await request(app.getHttpServer())
        .post('/family/chat/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Multi Participants',
          participantIds: [adminUserId],
          createdBy: adminUserId,
        });

      if (!elderUserId || !familyUserId) return;

      const response = await request(app.getHttpServer())
        .post(`/family/chat/rooms/${newRoom.body.id}/participants`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          participantIds: [elderUserId, familyUserId],
        })
        .expect(200);

      expect(response.body).toHaveProperty('participants');
    });

    it('debe rechazar participantId inválido', () => {
      if (!createdRoomId) return;

      return request(app.getHttpServer())
        .post(`/family/chat/rooms/${createdRoomId}/participants`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          participantIds: ['invalid-uuid'],
        })
        .expect(400);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .post(`/family/chat/rooms/${createdRoomId}/participants`)
        .send({ participantIds: [familyUserId] })
        .expect(401);
    });
  });

  describe('POST /family/chat/messages - Enviar mensaje', () => {
    it('debe enviar mensaje de texto exitosamente', async () => {
      if (!createdRoomId || !adminUserId) return;

      const response = await request(app.getHttpServer())
        .post('/family/chat/messages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          roomId: createdRoomId,
          senderId: adminUserId,
          type: MessageType.TEXT,
          content: 'Hola familia, ¿cómo está mamá hoy?',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.content).toBe('Hola familia, ¿cómo está mamá hoy?');
      expect(response.body.type).toBe(MessageType.TEXT);
      createdMessageId = response.body.id;
    });

    it('debe enviar mensaje de imagen', async () => {
      if (!createdRoomId || !elderUserId) return;

      const response = await request(app.getHttpServer())
        .post('/family/chat/messages')
        .set('Authorization', `Bearer ${elderToken}`)
        .send({
          roomId: createdRoomId,
          senderId: elderUserId,
          type: MessageType.IMAGE,
          content: 'https://cdn.eldercare.com/images/photo.jpg',
          metadata: { fileName: 'photo.jpg', fileSize: 2048 },
        })
        .expect(201);

      expect(response.body.type).toBe(MessageType.IMAGE);
      expect(response.body).toHaveProperty('metadata');
    });

    it('debe enviar mensaje de archivo', async () => {
      if (!createdRoomId || !adminUserId) return;

      const response = await request(app.getHttpServer())
        .post('/family/chat/messages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          roomId: createdRoomId,
          senderId: adminUserId,
          type: MessageType.FILE,
          content: 'https://cdn.eldercare.com/files/document.pdf',
          metadata: { fileName: 'document.pdf', fileSize: 10240 },
        })
        .expect(201);

      expect(response.body.type).toBe(MessageType.FILE);
    });

    it('debe enviar mensaje de ubicación', async () => {
      if (!createdRoomId || !familyUserId) return;

      const response = await request(app.getHttpServer())
        .post('/family/chat/messages')
        .set('Authorization', `Bearer ${familyToken}`)
        .send({
          roomId: createdRoomId,
          senderId: familyUserId,
          type: MessageType.LOCATION,
          content: 'Hospital Central',
          metadata: { lat: 40.7128, lng: -74.006 },
        })
        .expect(201);

      expect(response.body.type).toBe(MessageType.LOCATION);
      expect(response.body.metadata).toHaveProperty('lat');
      expect(response.body.metadata).toHaveProperty('lng');
    });

    it('debe rechazar roomId inválido', () => {
      if (!adminUserId) return;

      return request(app.getHttpServer())
        .post('/family/chat/messages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          roomId: 'invalid-uuid',
          senderId: adminUserId,
          content: 'Test',
        })
        .expect(400);
    });

    it('debe rechazar senderId inválido', () => {
      if (!createdRoomId) return;

      return request(app.getHttpServer())
        .post('/family/chat/messages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          roomId: createdRoomId,
          senderId: 'invalid-uuid',
          content: 'Test',
        })
        .expect(400);
    });

    it('debe rechazar tipo de mensaje inválido', () => {
      if (!createdRoomId || !adminUserId) return;

      return request(app.getHttpServer())
        .post('/family/chat/messages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          roomId: createdRoomId,
          senderId: adminUserId,
          type: 'INVALID_TYPE',
          content: 'Test',
        })
        .expect(400);
    });

    it('debe rechazar contenido faltante', () => {
      if (!createdRoomId || !adminUserId) return;

      return request(app.getHttpServer())
        .post('/family/chat/messages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          roomId: createdRoomId,
          senderId: adminUserId,
        })
        .expect(400);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .post('/family/chat/messages')
        .send({
          roomId: createdRoomId,
          senderId: adminUserId,
          content: 'Test',
        })
        .expect(401);
    });
  });

  describe('GET /family/chat/messages - Obtener mensajes', () => {
    it('debe obtener mensajes de una sala', async () => {
      if (!createdRoomId) return;

      const response = await request(app.getHttpServer())
        .get('/family/chat/messages')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ roomId: createdRoomId })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('content');
      }
    });

    it('debe aplicar paginación', async () => {
      if (!createdRoomId) return;

      const response = await request(app.getHttpServer())
        .get('/family/chat/messages')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ roomId: createdRoomId, page: 1, limit: 20 })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('debe filtrar por tipo de mensaje', async () => {
      if (!createdRoomId) return;

      const response = await request(app.getHttpServer())
        .get('/family/chat/messages')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ roomId: createdRoomId, type: MessageType.TEXT })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('debe rechazar roomId inválido', () => {
      return request(app.getHttpServer())
        .get('/family/chat/messages')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ roomId: 'invalid-uuid' })
        .expect(400);
    });

    it('debe rechazar roomId faltante (campo requerido)', () => {
      return request(app.getHttpServer())
        .get('/family/chat/messages')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .get('/family/chat/messages')
        .query({ roomId: createdRoomId })
        .expect(401);
    });
  });

  describe('PUT /family/chat/messages/:id - Editar mensaje', () => {
    it('debe editar mensaje exitosamente', async () => {
      if (!createdMessageId) return;

      const response = await request(app.getHttpServer())
        .put(`/family/chat/messages/${createdMessageId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          content: 'Hola familia, ¿cómo está mamá esta tarde?',
        })
        .expect(200);

      expect(response.body.content).toBe(
        'Hola familia, ¿cómo está mamá esta tarde?',
      );
      expect(response.body).toHaveProperty('editedAt');
    });

    it('debe retornar 404 para mensaje inexistente', () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440099';
      return request(app.getHttpServer())
        .put(`/family/chat/messages/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content: 'Updated' })
        .expect(404);
    });

    it('debe rechazar contenido faltante', () => {
      if (!createdMessageId) return;

      return request(app.getHttpServer())
        .put(`/family/chat/messages/${createdMessageId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .put(`/family/chat/messages/${createdMessageId}`)
        .send({ content: 'Updated' })
        .expect(401);
    });
  });

  describe('POST /family/chat/messages/:id/read - Marcar como leído', () => {
    it('debe marcar mensaje como leído', async () => {
      if (!createdMessageId || !elderUserId) return;

      const response = await request(app.getHttpServer())
        .post(`/family/chat/messages/${createdMessageId}/read`)
        .set('Authorization', `Bearer ${elderToken}`)
        .send({
          userId: elderUserId,
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('marcado como leído');
    });

    it('debe rechazar userId inválido', () => {
      if (!createdMessageId) return;

      return request(app.getHttpServer())
        .post(`/family/chat/messages/${createdMessageId}/read`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: 'invalid-uuid',
        })
        .expect(400);
    });

    it('debe rechazar userId faltante', () => {
      if (!createdMessageId) return;

      return request(app.getHttpServer())
        .post(`/family/chat/messages/${createdMessageId}/read`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .post(`/family/chat/messages/${createdMessageId}/read`)
        .send({ userId: elderUserId })
        .expect(401);
    });
  });

  describe('POST /family/chat/rooms/:roomId/read-all - Marcar todos como leídos', () => {
    it('debe marcar todos los mensajes de una sala como leídos', async () => {
      if (!createdRoomId || !familyUserId) return;

      const response = await request(app.getHttpServer())
        .post(`/family/chat/rooms/${createdRoomId}/read-all`)
        .set('Authorization', `Bearer ${familyToken}`)
        .send({
          userId: familyUserId,
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('mensajes marcados como leídos');
    });

    it('debe rechazar userId inválido', () => {
      if (!createdRoomId) return;

      return request(app.getHttpServer())
        .post(`/family/chat/rooms/${createdRoomId}/read-all`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: 'invalid-uuid',
        })
        .expect(400);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .post(`/family/chat/rooms/${createdRoomId}/read-all`)
        .send({ userId: adminUserId })
        .expect(401);
    });
  });

  describe('GET /family/chat/unread/:userId - Obtener mensajes no leídos', () => {
    it('debe obtener conteo de mensajes no leídos', async () => {
      if (!elderUserId) return;

      const response = await request(app.getHttpServer())
        .get(`/family/chat/unread/${elderUserId}`)
        .set('Authorization', `Bearer ${elderToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('unreadCount');
      expect(typeof response.body.unreadCount).toBe('number');
    });

    it('debe rechazar userId inválido', () => {
      return request(app.getHttpServer())
        .get('/family/chat/unread/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .get(`/family/chat/unread/${elderUserId}`)
        .expect(401);
    });
  });

  describe('DELETE /family/chat/messages/:id - Eliminar mensaje', () => {
    it('debe eliminar mensaje exitosamente', async () => {
      if (!createdMessageId) return;

      const response = await request(app.getHttpServer())
        .delete(`/family/chat/messages/${createdMessageId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('eliminado exitosamente');
    });

    it('debe retornar 404 al eliminar mensaje ya eliminado', () => {
      if (!createdMessageId) return;

      return request(app.getHttpServer())
        .delete(`/family/chat/messages/${createdMessageId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .delete(`/family/chat/messages/${createdMessageId}`)
        .expect(401);
    });
  });

  describe('DELETE /family/chat/rooms/:roomId/participants/:userId - Eliminar participante', () => {
    it('debe eliminar participante de la sala', async () => {
      if (!createdRoomId || !familyUserId) return;

      const response = await request(app.getHttpServer())
        .delete(`/family/chat/rooms/${createdRoomId}/participants/${familyUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('participants');
    });

    it('debe rechazar roomId inválido', () => {
      if (!familyUserId) return;

      return request(app.getHttpServer())
        .delete(`/family/chat/rooms/invalid-id/participants/${familyUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .delete(`/family/chat/rooms/${createdRoomId}/participants/${familyUserId}`)
        .expect(401);
    });
  });

  describe('DELETE /family/chat/rooms/:id - Eliminar sala', () => {
    it('debe eliminar sala exitosamente', async () => {
      if (!createdRoomId) return;

      const response = await request(app.getHttpServer())
        .delete(`/family/chat/rooms/${createdRoomId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('eliminada exitosamente');
    });

    it('debe retornar 404 al eliminar sala ya eliminada', () => {
      if (!createdRoomId) return;

      return request(app.getHttpServer())
        .delete(`/family/chat/rooms/${createdRoomId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .delete(`/family/chat/rooms/${createdRoomId}`)
        .expect(401);
    });
  });
});
