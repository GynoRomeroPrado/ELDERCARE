/**
 * Gateway de WebSocket para Eventos en Tiempo Real
 * Maneja notificaciones instantáneas de caídas, medicamentos, etc.
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*', // En producción, especificar dominios permitidos
    credentials: true,
  },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private userSockets = new Map<string, Set<string>>(); // userId -> Set de socketIds

  constructor(private jwtService: JwtService) {}

  /**
   * Manejar nueva conexión
   */
  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Autenticar usando token JWT del handshake
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn(`Cliente ${client.id} desconectado: sin token`);
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token);
      client.userId = payload.sub;
      client.userRole = payload.role;

      // Registrar socket del usuario
      if (!this.userSockets.has(client.userId)) {
        this.userSockets.set(client.userId, new Set());
      }
      this.userSockets.get(client.userId).add(client.id);

      // Unir a sala de usuario
      client.join(`user:${client.userId}`);

      // Si es familiar, unir a sala del adulto mayor
      if (client.userRole === 'FAMILY_MEMBER' || client.userRole === 'CAREGIVER') {
        // En producción, obtener elderId de la base de datos
        // client.join(`elder:${elderId}`);
      }

      this.logger.log(
        `✓ Cliente conectado: ${client.id} (Usuario: ${client.userId}, Role: ${client.userRole})`,
      );

      // Enviar confirmación de conexión
      client.emit('connected', {
        message: 'Conectado exitosamente al servidor de eventos',
        userId: client.userId,
      });
    } catch (error) {
      this.logger.error(`Error autenticando cliente ${client.id}: ${error.message}`);
      client.disconnect();
    }
  }

  /**
   * Manejar desconexión
   */
  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const userSocketsSet = this.userSockets.get(client.userId);
      if (userSocketsSet) {
        userSocketsSet.delete(client.id);
        if (userSocketsSet.size === 0) {
          this.userSockets.delete(client.userId);
        }
      }
    }

    this.logger.log(`Cliente desconectado: ${client.id}`);
  }

  /**
   * Suscribirse a eventos de un adulto mayor específico
   */
  @SubscribeMessage('subscribe:elder')
  handleSubscribeElder(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { elderId: string },
  ) {
    // Verificar permisos (en producción, verificar en base de datos)
    if (client.userRole === 'FAMILY_MEMBER' || client.userRole === 'CAREGIVER' || client.userRole === 'HEALTHCARE_PROVIDER') {
      client.join(`elder:${data.elderId}`);
      this.logger.log(`Usuario ${client.userId} suscrito a eventos del adulto mayor ${data.elderId}`);

      return {
        success: true,
        message: `Suscrito a eventos del adulto mayor ${data.elderId}`,
      };
    }

    return {
      success: false,
      message: 'No autorizado para suscribirse a este adulto mayor',
    };
  }

  /**
   * Desuscribirse de eventos
   */
  @SubscribeMessage('unsubscribe:elder')
  handleUnsubscribeElder(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { elderId: string },
  ) {
    client.leave(`elder:${data.elderId}`);
    this.logger.log(`Usuario ${client.userId} desuscrito de eventos del adulto mayor ${data.elderId}`);

    return {
      success: true,
      message: `Desuscrito de eventos del adulto mayor ${data.elderId}`,
    };
  }

  /**
   * Emitir alerta de caída a familiares y cuidadores
   */
  emitFallAlert(elderId: string, fallData: any) {
    this.server.to(`elder:${elderId}`).emit('fall:detected', {
      type: 'fall_alert',
      severity: fallData.severity,
      location: fallData.location,
      confidence: fallData.confidence,
      detectedAt: fallData.detectedAt,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`🚨 Alerta de caída emitida para adulto mayor ${elderId}`);
  }

  /**
   * Emitir recordatorio de medicación
   */
  emitMedicationReminder(userId: string, medicationData: any) {
    this.server.to(`user:${userId}`).emit('medication:reminder', {
      type: 'medication_reminder',
      medicationName: medicationData.medicationName,
      dosage: medicationData.dosage,
      scheduledTime: medicationData.scheduledTime,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`💊 Recordatorio de medicación emitido para usuario ${userId}`);
  }

  /**
   * Emitir actualización de estado de dispositivo
   */
  emitDeviceStatusUpdate(elderId: string, deviceData: any) {
    this.server.to(`elder:${elderId}`).emit('device:status', {
      type: 'device_status_update',
      deviceId: deviceData.deviceId,
      deviceType: deviceData.deviceType,
      status: deviceData.status,
      healthStatus: deviceData.healthStatus,
      batteryLevel: deviceData.batteryLevel,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`📱 Actualización de dispositivo emitida para adulto mayor ${elderId}`);
  }

  /**
   * Emitir confirmación de toma de medicación
   */
  emitMedicationTaken(elderId: string, medicationData: any) {
    this.server.to(`elder:${elderId}`).emit('medication:taken', {
      type: 'medication_taken',
      medicationName: medicationData.medicationName,
      takenAt: medicationData.takenAt,
      status: medicationData.status,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`✓ Confirmación de medicación emitida para adulto mayor ${elderId}`);
  }

  /**
   * Obtener usuarios conectados
   */
  getConnectedUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  /**
   * Verificar si un usuario está conectado
   */
  isUserConnected(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId).size > 0;
  }

  /**
   * Obtener estadísticas de conexiones
   */
  getConnectionStats() {
    return {
      totalConnections: this.server.sockets.sockets.size,
      uniqueUsers: this.userSockets.size,
      rooms: Array.from(this.server.sockets.adapter.rooms.keys()),
    };
  }
}
