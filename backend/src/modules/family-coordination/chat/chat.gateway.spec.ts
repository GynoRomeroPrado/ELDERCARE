/**
 * Tests Unitarios para ChatGateway (WebSocket)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { Socket } from 'socket.io';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let chatService: ChatService;

  const mockChatService = {
    sendMessage: jest.fn(),
    markAsRead: jest.fn(),
    markRoomAsRead: jest.fn(),
  };

  const mockSocket = {
    id: 'test-socket-id',
    join: jest.fn(),
    leave: jest.fn(),
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  } as unknown as Socket;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        {
          provide: ChatService,
          useValue: mockChatService,
        },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    chatService = module.get<ChatService>(ChatService);

    // Mock del servidor Socket.IO
    gateway.server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as any;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should log client connection', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      gateway.handleConnection(mockSocket);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('conectado')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('handleDisconnect', () => {
    it('should log client disconnection', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      gateway.handleDisconnect(mockSocket);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('desconectado')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('handleJoinRoom', () => {
    it('should allow user to join room', async () => {
      const data = {
        roomId: 'room-123',
        userId: 'user-456',
      };

      const result = await gateway.handleJoinRoom(data, mockSocket);

      expect(mockSocket.join).toHaveBeenCalledWith('room-123');
      expect(result).toEqual({ success: true });
    });

    it('should notify other participants when user joins', async () => {
      const data = {
        roomId: 'room-123',
        userId: 'user-456',
      };

      await gateway.handleJoinRoom(data, mockSocket);

      expect(mockSocket.to).toHaveBeenCalledWith('room-123');
      expect(mockSocket.emit).toHaveBeenCalledWith('user_joined', {
        userId: 'user-456',
        roomId: 'room-123',
      });
    });
  });

  describe('handleLeaveRoom', () => {
    it('should allow user to leave room', async () => {
      const data = {
        roomId: 'room-123',
        userId: 'user-456',
      };

      const result = await gateway.handleLeaveRoom(data, mockSocket);

      expect(mockSocket.leave).toHaveBeenCalledWith('room-123');
      expect(result).toEqual({ success: true });
    });

    it('should notify other participants when user leaves', async () => {
      const data = {
        roomId: 'room-123',
        userId: 'user-456',
      };

      await gateway.handleLeaveRoom(data, mockSocket);

      expect(mockSocket.to).toHaveBeenCalledWith('room-123');
      expect(mockSocket.emit).toHaveBeenCalledWith('user_left', {
        userId: 'user-456',
        roomId: 'room-123',
      });
    });
  });

  describe('handleSendMessage', () => {
    it('should send message successfully', async () => {
      const messageData = {
        roomId: 'room-123',
        senderId: 'user-456',
        content: 'Hola familia!',
        type: 'TEXT',
      };

      const savedMessage = {
        id: 'msg-789',
        ...messageData,
        createdAt: new Date(),
      };

      mockChatService.sendMessage.mockResolvedValue(savedMessage);

      const result = await gateway.handleSendMessage(messageData, mockSocket);

      expect(chatService.sendMessage).toHaveBeenCalledWith(messageData);
      expect(gateway.server.to).toHaveBeenCalledWith('room-123');
      expect(gateway.server.emit).toHaveBeenCalledWith(
        'new_message',
        savedMessage
      );
      expect(result).toEqual({ success: true, message: savedMessage });
    });

    it('should handle message sending error', async () => {
      const messageData = {
        roomId: 'room-123',
        senderId: 'user-456',
        content: 'Test message',
        type: 'TEXT',
      };

      mockChatService.sendMessage.mockRejectedValue(
        new Error('Database error')
      );

      const result = await gateway.handleSendMessage(messageData, mockSocket);

      expect(result).toEqual({ success: false, error: 'Database error' });
    });
  });

  describe('handleTyping', () => {
    it('should broadcast typing indicator to room participants', () => {
      const data = {
        roomId: 'room-123',
        userId: 'user-456',
        isTyping: true,
      };

      gateway.handleTyping(data, mockSocket);

      expect(mockSocket.to).toHaveBeenCalledWith('room-123');
      expect(mockSocket.emit).toHaveBeenCalledWith('user_typing', {
        userId: 'user-456',
        isTyping: true,
      });
    });

    it('should not send typing indicator to sender', () => {
      const data = {
        roomId: 'room-123',
        userId: 'user-456',
        isTyping: false,
      };

      gateway.handleTyping(data, mockSocket);

      // to() asegura que no se envíe al socket que emitió
      expect(mockSocket.to).toHaveBeenCalled();
    });
  });

  describe('handleMarkRead', () => {
    it('should mark message as read', async () => {
      const data = {
        messageId: 'msg-123',
        userId: 'user-456',
        roomId: 'room-789',
      };

      mockChatService.markAsRead.mockResolvedValue(undefined);

      const result = await gateway.handleMarkRead(data, mockSocket);

      expect(chatService.markAsRead).toHaveBeenCalledWith('msg-123', {
        userId: 'user-456',
      });
      expect(gateway.server.to).toHaveBeenCalledWith('room-789');
      expect(gateway.server.emit).toHaveBeenCalledWith('message_read', {
        messageId: 'msg-123',
        userId: 'user-456',
      });
      expect(result).toEqual({ success: true });
    });

    it('should handle mark read error', async () => {
      const data = {
        messageId: 'msg-123',
        userId: 'user-456',
        roomId: 'room-789',
      };

      mockChatService.markAsRead.mockRejectedValue(new Error('Not found'));

      const result = await gateway.handleMarkRead(data, mockSocket);

      expect(result).toEqual({ success: false, error: 'Not found' });
    });
  });

  describe('handleMarkRoomRead', () => {
    it('should mark all room messages as read', async () => {
      const data = {
        roomId: 'room-123',
        userId: 'user-456',
      };

      mockChatService.markRoomAsRead.mockResolvedValue(undefined);

      const result = await gateway.handleMarkRoomRead(data, mockSocket);

      expect(chatService.markRoomAsRead).toHaveBeenCalledWith(
        'room-123',
        'user-456'
      );
      expect(gateway.server.to).toHaveBeenCalledWith('room-123');
      expect(gateway.server.emit).toHaveBeenCalledWith('room_read', {
        roomId: 'room-123',
        userId: 'user-456',
      });
      expect(result).toEqual({ success: true });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
