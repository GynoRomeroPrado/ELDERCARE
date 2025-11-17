/**
 * Servicio de Chat Familiar
 * Gestión de salas de chat y mensajes
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ChatRoom } from './entities/chat-room.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { User } from '../../users/entities/user.entity';
import {
  CreateRoomDto,
  UpdateRoomDto,
  AddParticipantsDto,
  SendMessageDto,
  UpdateMessageDto,
  RoomQueryDto,
  MessageQueryDto,
  MarkAsReadDto,
} from './dto/chat.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatRoom)
    private roomRepository: Repository<ChatRoom>,
    @InjectRepository(ChatMessage)
    private messageRepository: Repository<ChatMessage>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // ==================== Gestión de Salas ====================

  /**
   * Crear sala de chat
   */
  async createRoom(createDto: CreateRoomDto): Promise<ChatRoom> {
    // Verificar que los participantes existen
    const participants = await this.userRepository.find({
      where: { id: In(createDto.participantIds) },
    });

    if (participants.length !== createDto.participantIds.length) {
      throw new BadRequestException('Uno o más participantes no existen');
    }

    const room = this.roomRepository.create({
      name: createDto.name,
      type: createDto.type,
      description: createDto.description,
      createdBy: createDto.createdBy,
      participants,
    });

    return this.roomRepository.save(room);
  }

  /**
   * Obtener todas las salas
   */
  async findAllRooms(query: RoomQueryDto): Promise<{
    data: ChatRoom[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 10, type, participantId, isActive } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.roomRepository
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.participants', 'participants')
      .skip(skip)
      .take(limit);

    if (type) {
      queryBuilder.andWhere('room.type = :type', { type });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('room.isActive = :isActive', { isActive });
    }

    if (participantId) {
      queryBuilder.andWhere('participants.id = :participantId', {
        participantId,
      });
    }

    queryBuilder.orderBy('room.updatedAt', 'DESC');

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Obtener sala por ID
   */
  async findOneRoom(id: string): Promise<ChatRoom> {
    const room = await this.roomRepository.findOne({
      where: { id },
      relations: ['participants'],
    });

    if (!room) {
      throw new NotFoundException('Sala de chat no encontrada');
    }

    return room;
  }

  /**
   * Actualizar sala
   */
  async updateRoom(id: string, updateDto: UpdateRoomDto): Promise<ChatRoom> {
    const room = await this.findOneRoom(id);
    Object.assign(room, updateDto);
    return this.roomRepository.save(room);
  }

  /**
   * Agregar participantes a la sala
   */
  async addParticipants(
    id: string,
    addDto: AddParticipantsDto,
  ): Promise<ChatRoom> {
    const room = await this.findOneRoom(id);

    const newParticipants = await this.userRepository.find({
      where: { id: In(addDto.participantIds) },
    });

    if (newParticipants.length !== addDto.participantIds.length) {
      throw new BadRequestException('Uno o más participantes no existen');
    }

    room.participants = [...room.participants, ...newParticipants];
    return this.roomRepository.save(room);
  }

  /**
   * Eliminar participante de la sala
   */
  async removeParticipant(roomId: string, userId: string): Promise<ChatRoom> {
    const room = await this.findOneRoom(roomId);
    room.participants = room.participants.filter((p) => p.id !== userId);
    return this.roomRepository.save(room);
  }

  /**
   * Eliminar sala
   */
  async removeRoom(id: string): Promise<void> {
    const room = await this.findOneRoom(id);
    room.isActive = false;
    await this.roomRepository.save(room);
  }

  // ==================== Gestión de Mensajes ====================

  /**
   * Enviar mensaje
   */
  async sendMessage(sendDto: SendMessageDto): Promise<ChatMessage> {
    // Verificar que la sala existe
    await this.findOneRoom(sendDto.roomId);

    const message = this.messageRepository.create({
      roomId: sendDto.roomId,
      senderId: sendDto.senderId,
      type: sendDto.type,
      content: sendDto.content,
      metadata: sendDto.metadata,
      readBy: [sendDto.senderId], // El remitente ya lo ha "leído"
    });

    return this.messageRepository.save(message);
  }

  /**
   * Obtener mensajes de una sala
   */
  async getMessages(query: MessageQueryDto): Promise<{
    data: ChatMessage[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { roomId, page = 1, limit = 50, type } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('message.roomId = :roomId', { roomId })
      .andWhere('message.isDeleted = :isDeleted', { isDeleted: false })
      .skip(skip)
      .take(limit);

    if (type) {
      queryBuilder.andWhere('message.type = :type', { type });
    }

    queryBuilder.orderBy('message.createdAt', 'DESC');

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Actualizar mensaje
   */
  async updateMessage(
    id: string,
    updateDto: UpdateMessageDto,
  ): Promise<ChatMessage> {
    const message = await this.messageRepository.findOne({
      where: { id },
    });

    if (!message) {
      throw new NotFoundException('Mensaje no encontrado');
    }

    if (message.isDeleted) {
      throw new BadRequestException('No se puede editar un mensaje eliminado');
    }

    message.content = updateDto.content;
    message.isEdited = true;

    return this.messageRepository.save(message);
  }

  /**
   * Eliminar mensaje (soft delete)
   */
  async deleteMessage(id: string): Promise<void> {
    const message = await this.messageRepository.findOne({
      where: { id },
    });

    if (!message) {
      throw new NotFoundException('Mensaje no encontrado');
    }

    message.isDeleted = true;
    message.content = '[Mensaje eliminado]';
    await this.messageRepository.save(message);
  }

  /**
   * Marcar mensaje como leído
   */
  async markAsRead(messageId: string, markDto: MarkAsReadDto): Promise<void> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Mensaje no encontrado');
    }

    if (!message.readBy) {
      message.readBy = [];
    }

    if (!message.readBy.includes(markDto.userId)) {
      message.readBy.push(markDto.userId);
      await this.messageRepository.save(message);
    }
  }

  /**
   * Marcar todos los mensajes de una sala como leídos
   */
  async markRoomAsRead(roomId: string, userId: string): Promise<void> {
    const messages = await this.messageRepository
      .createQueryBuilder('message')
      .where('message.roomId = :roomId', { roomId })
      .andWhere('message.senderId != :userId', { userId })
      .andWhere('message.isDeleted = :isDeleted', { isDeleted: false })
      .getMany();

    for (const message of messages) {
      if (!message.readBy) {
        message.readBy = [];
      }
      if (!message.readBy.includes(userId)) {
        message.readBy.push(userId);
      }
    }

    await this.messageRepository.save(messages);
  }

  /**
   * Obtener mensajes no leídos de un usuario
   */
  async getUnreadCount(userId: string): Promise<{
    total: number;
    byRoom: Record<string, number>;
  }> {
    const rooms = await this.roomRepository
      .createQueryBuilder('room')
      .leftJoin('room.participants', 'participants')
      .where('participants.id = :userId', { userId })
      .getMany();

    const byRoom: Record<string, number> = {};
    let total = 0;

    for (const room of rooms) {
      const count = await this.messageRepository
        .createQueryBuilder('message')
        .where('message.roomId = :roomId', { roomId: room.id })
        .andWhere('message.senderId != :userId', { userId })
        .andWhere('message.isDeleted = :isDeleted', { isDeleted: false })
        .andWhere(
          "NOT EXISTS (SELECT 1 FROM unnest(message.readBy) AS reader WHERE reader = :userId)",
          { userId },
        )
        .getCount();

      byRoom[room.id] = count;
      total += count;
    }

    return {
      total,
      byRoom,
    };
  }
}
