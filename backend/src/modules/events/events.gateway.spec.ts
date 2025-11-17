/**
 * Tests Unitarios para EventsGateway (WebSocket)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventsGateway } from './events.gateway';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

describe('EventsGateway', () => {
  let gateway: EventsGateway;
  let jwtService: JwtService;

  const mockJwtService = {
    verify: jest.fn(),
  };

  const mockSocket = {
    id: 'test-socket-id',
    handshake: {
      auth: {
        token: 'valid-token',
      },
    },
    emit: jest.fn(),
    disconnect: jest.fn(),
  } as unknown as Socket;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsGateway,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    gateway = module.get<EventsGateway>(EventsGateway);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should accept connection with valid JWT', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-id-123',
        email: 'test@test.com',
      });

      await gateway.handleConnection(mockSocket);

      expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
      expect(mockSocket.disconnect).not.toHaveBeenCalled();
    });

    it('should reject connection with invalid JWT', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should reject connection without token', async () => {
      const socketWithoutToken = {
        ...mockSocket,
        handshake: {
          auth: {},
        },
      } as unknown as Socket;

      await gateway.handleConnection(socketWithoutToken);

      expect(socketWithoutToken.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should log disconnection', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      gateway.handleDisconnect(mockSocket);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('desconectado')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('emitFallAlert', () => {
    it('should emit fall alert to all clients', () => {
      const fallData = {
        id: 'fall-123',
        userId: 'user-123',
        severity: 'HIGH',
        timestamp: new Date(),
        location: { latitude: 40.7128, longitude: -74.006 },
      };

      const mockServer = {
        emit: jest.fn(),
      };
      gateway.server = mockServer as any;

      gateway.emitFallAlert(fallData);

      expect(mockServer.emit).toHaveBeenCalledWith('fallDetected', fallData);
    });
  });

  describe('emitMedicationReminder', () => {
    it('should emit medication reminder to specific user', () => {
      const reminderData = {
        userId: 'user-123',
        medicationId: 'med-456',
        name: 'Aspirina',
        dosage: '100mg',
        scheduledTime: new Date(),
      };

      const mockServer = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      };
      gateway.server = mockServer as any;

      gateway.emitMedicationReminder(reminderData);

      expect(mockServer.to).toHaveBeenCalledWith('user-user-123');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'medicationReminder',
        reminderData
      );
    });
  });

  describe('emitDeviceUpdate', () => {
    it('should emit device update to all clients', () => {
      const deviceData = {
        id: 'device-123',
        deviceType: 'PILL_DISPENSER',
        status: 'ACTIVE',
        batteryLevel: 85,
        lastHeartbeat: new Date(),
      };

      const mockServer = {
        emit: jest.fn(),
      };
      gateway.server = mockServer as any;

      gateway.emitDeviceUpdate(deviceData);

      expect(mockServer.emit).toHaveBeenCalledWith('deviceUpdate', deviceData);
    });
  });

  describe('subscribe and unsubscribe', () => {
    it('should allow client to subscribe to user events', () => {
      const joinSpy = jest.fn();
      const socketWithJoin = {
        ...mockSocket,
        join: joinSpy,
      } as unknown as Socket;

      gateway.handleSubscribe({ userId: 'user-123' }, socketWithJoin);

      expect(joinSpy).toHaveBeenCalledWith('user-user-123');
    });

    it('should allow client to unsubscribe from user events', () => {
      const leaveSpy = jest.fn();
      const socketWithLeave = {
        ...mockSocket,
        leave: leaveSpy,
      } as unknown as Socket;

      gateway.handleUnsubscribe({ userId: 'user-123' }, socketWithLeave);

      expect(leaveSpy).toHaveBeenCalledWith('user-user-123');
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
