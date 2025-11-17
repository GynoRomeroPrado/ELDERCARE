/**
 * Gateway WebSocket para Chat en Tiempo Real
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto, MarkAsReadDto } from './dto/chat.dto';

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('ChatGateway');

  constructor(private chatService: ChatService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
  }

  /**
   * Unirse a una sala de chat
   */
  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.roomId);
    this.logger.log(
      `Usuario ${data.userId} se unió a la sala ${data.roomId}`,
    );

    // Notificar a los demás participantes
    client.to(data.roomId).emit('user_joined', {
      userId: data.userId,
      roomId: data.roomId,
    });

    return { success: true };
  }

  /**
   * Salir de una sala de chat
   */
  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(data.roomId);
    this.logger.log(`Usuario ${data.userId} salió de la sala ${data.roomId}`);

    // Notificar a los demás participantes
    client.to(data.roomId).emit('user_left', {
      userId: data.userId,
      roomId: data.roomId,
    });

    return { success: true };
  }

  /**
   * Enviar mensaje
   */
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() data: SendMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const message = await this.chatService.sendMessage(data);

      // Emitir mensaje a todos los participantes de la sala
      this.server.to(data.roomId).emit('new_message', message);

      return { success: true, message };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Usuario está escribiendo
   */
  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { roomId: string; userId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    // Emitir a todos menos al remitente
    client.to(data.roomId).emit('user_typing', {
      userId: data.userId,
      isTyping: data.isTyping,
    });
  }

  /**
   * Marcar mensaje como leído
   */
  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @MessageBody()
    data: { messageId: string; userId: string; roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      await this.chatService.markAsRead(data.messageId, {
        userId: data.userId,
      });

      // Notificar al remitente que el mensaje fue leído
      this.server.to(data.roomId).emit('message_read', {
        messageId: data.messageId,
        userId: data.userId,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Marcar sala como leída
   */
  @SubscribeMessage('mark_room_read')
  async handleMarkRoomRead(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      await this.chatService.markRoomAsRead(data.roomId, data.userId);

      // Notificar a los demás participantes
      this.server.to(data.roomId).emit('room_read', {
        roomId: data.roomId,
        userId: data.userId,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
