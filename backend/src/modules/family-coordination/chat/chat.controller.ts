/**
 * Controlador de Chat Familiar
 * API REST para gestión de salas y mensajes
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
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

@ApiTags('family-chat')
@ApiBearerAuth()
@Controller('family/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ==================== Salas ====================

  @Post('rooms')
  @ApiOperation({
    summary: 'Crear sala de chat',
    description: 'Crea una nueva sala de chat familiar o grupal',
  })
  @ApiResponse({ status: 201, description: 'Sala creada exitosamente' })
  async createRoom(@Body() createDto: CreateRoomDto) {
    return this.chatService.createRoom(createDto);
  }

  @Get('rooms')
  @ApiOperation({
    summary: 'Listar salas de chat',
    description: 'Obtiene todas las salas de chat con filtros',
  })
  @ApiResponse({ status: 200, description: 'Lista de salas' })
  async findAllRooms(@Query() query: RoomQueryDto) {
    return this.chatService.findAllRooms(query);
  }

  @Get('rooms/:id')
  @ApiOperation({
    summary: 'Obtener sala por ID',
    description: 'Obtiene los detalles de una sala de chat',
  })
  @ApiParam({ name: 'id', description: 'UUID de la sala' })
  @ApiResponse({ status: 200, description: 'Sala encontrada' })
  @ApiResponse({ status: 404, description: 'Sala no encontrada' })
  async findOneRoom(@Param('id') id: string) {
    return this.chatService.findOneRoom(id);
  }

  @Put('rooms/:id')
  @ApiOperation({
    summary: 'Actualizar sala',
    description: 'Actualiza nombre, descripción o avatar de la sala',
  })
  @ApiResponse({ status: 200, description: 'Sala actualizada' })
  async updateRoom(
    @Param('id') id: string,
    @Body() updateDto: UpdateRoomDto,
  ) {
    return this.chatService.updateRoom(id, updateDto);
  }

  @Post('rooms/:id/participants')
  @ApiOperation({
    summary: 'Agregar participantes',
    description: 'Agrega nuevos participantes a una sala de chat',
  })
  @ApiResponse({ status: 200, description: 'Participantes agregados' })
  @HttpCode(HttpStatus.OK)
  async addParticipants(
    @Param('id') id: string,
    @Body() addDto: AddParticipantsDto,
  ) {
    return this.chatService.addParticipants(id, addDto);
  }

  @Delete('rooms/:roomId/participants/:userId')
  @ApiOperation({
    summary: 'Eliminar participante',
    description: 'Elimina un participante de la sala de chat',
  })
  @ApiResponse({ status: 200, description: 'Participante eliminado' })
  async removeParticipant(
    @Param('roomId') roomId: string,
    @Param('userId') userId: string,
  ) {
    return this.chatService.removeParticipant(roomId, userId);
  }

  @Delete('rooms/:id')
  @ApiOperation({
    summary: 'Eliminar sala',
    description: 'Desactiva una sala de chat',
  })
  @ApiResponse({ status: 200, description: 'Sala eliminada' })
  async removeRoom(@Param('id') id: string) {
    await this.chatService.removeRoom(id);
    return { message: 'Sala eliminada exitosamente' };
  }

  // ==================== Mensajes ====================

  @Post('messages')
  @ApiOperation({
    summary: 'Enviar mensaje',
    description: 'Envía un nuevo mensaje en una sala de chat',
  })
  @ApiResponse({ status: 201, description: 'Mensaje enviado' })
  async sendMessage(@Body() sendDto: SendMessageDto) {
    return this.chatService.sendMessage(sendDto);
  }

  @Get('messages')
  @ApiOperation({
    summary: 'Obtener mensajes de una sala',
    description: 'Lista de mensajes de una sala con paginación',
  })
  @ApiResponse({ status: 200, description: 'Lista de mensajes' })
  async getMessages(@Query() query: MessageQueryDto) {
    return this.chatService.getMessages(query);
  }

  @Put('messages/:id')
  @ApiOperation({
    summary: 'Editar mensaje',
    description: 'Edita el contenido de un mensaje enviado',
  })
  @ApiResponse({ status: 200, description: 'Mensaje actualizado' })
  async updateMessage(
    @Param('id') id: string,
    @Body() updateDto: UpdateMessageDto,
  ) {
    return this.chatService.updateMessage(id, updateDto);
  }

  @Delete('messages/:id')
  @ApiOperation({
    summary: 'Eliminar mensaje',
    description: 'Elimina un mensaje (soft delete)',
  })
  @ApiResponse({ status: 200, description: 'Mensaje eliminado' })
  async deleteMessage(@Param('id') id: string) {
    await this.chatService.deleteMessage(id);
    return { message: 'Mensaje eliminado exitosamente' };
  }

  @Post('messages/:id/read')
  @ApiOperation({
    summary: 'Marcar mensaje como leído',
    description: 'Marca un mensaje específico como leído por un usuario',
  })
  @ApiResponse({ status: 200, description: 'Mensaje marcado como leído' })
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Param('id') id: string,
    @Body() markDto: MarkAsReadDto,
  ) {
    await this.chatService.markAsRead(id, markDto);
    return { message: 'Mensaje marcado como leído' };
  }

  @Post('rooms/:roomId/read-all')
  @ApiOperation({
    summary: 'Marcar todos los mensajes como leídos',
    description: 'Marca todos los mensajes de una sala como leídos',
  })
  @ApiResponse({ status: 200, description: 'Mensajes marcados como leídos' })
  @HttpCode(HttpStatus.OK)
  async markRoomAsRead(
    @Param('roomId') roomId: string,
    @Body() body: { userId: string },
  ) {
    await this.chatService.markRoomAsRead(roomId, body.userId);
    return { message: 'Todos los mensajes marcados como leídos' };
  }

  @Get('unread/:userId')
  @ApiOperation({
    summary: 'Obtener mensajes no leídos',
    description: 'Cuenta de mensajes no leídos por sala para un usuario',
  })
  @ApiResponse({ status: 200, description: 'Conteo de mensajes no leídos' })
  async getUnreadCount(@Param('userId') userId: string) {
    return this.chatService.getUnreadCount(userId);
  }
}
